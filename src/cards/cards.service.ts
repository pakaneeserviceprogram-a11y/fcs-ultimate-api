import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException, 
  ForbiddenException, 
  InternalServerErrorException, 
  UnprocessableEntityException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. ฟังก์ชันผูกบัตรให้สมาชิก (Link Card)
  // ==========================================
  async linkCard(tenantId: number, memberCode: string, cardUid: string) {
    // 1. ค้นหาข้อมูลสมาชิกในระบบ
    const member = await this.prisma.members.findFirst({
      where: { TenantID: tenantId, MemberCode: memberCode },
    });
    
    if (!member) {
      throw new NotFoundException(`ไม่พบรหัสสมาชิก ${memberCode} ในระบบ`);
    }

    // 2. ค้นหาข้อมูลบัตรในระบบ
    const card = await this.prisma.cards.findUnique({
      where: {
        TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid },
      },
    });

    if (!card) {
      throw new NotFoundException(`ไม่พบเลขบัตร ${cardUid} ในคลัง`);
    }

    // 3. ตรวจสอบว่าบัตรใบนี้ "ว่าง" ให้ผูกหรือไม่ (ป้องกันการเอาบัตรคนอื่นมาผูกซ้ำ)
    if (card.MemberID !== null || card.Status !== 'AVAILABLE') {
      throw new BadRequestException(`บัตรเลขที่ ${cardUid} ถูกใช้งานไปแล้ว หรือสถานะไม่พร้อมใช้งาน`);
    }

    // 4. ทำการอัปเดตข้อมูลเพื่อผูกบัตรเข้ากับสมาชิก และเปิดใช้งานบัตร
    await this.prisma.cards.update({
      where: {
        TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid },
      },
      data: {
        MemberID: member.MemberID,
        Status: 'ACTIVE', // เปลี่ยนสถานะเป็นเปิดใช้งานพร้อมรูดซื้ออาหาร
      },
    });

    return { 
      success: true, 
      message: 'Card linked successfully' 
    };
  }

  // ==========================================
  // 2. ฟังก์ชันตัดเงิน (Process Payment)
  // ==========================================
  async processPayment(
    tenantId: number, 
    cardUid: string, 
    amount: number, 
    orderId: bigint,
    idempotencyKey: string // [v4.9] เพิ่มเพื่อป้องกันรายการซ้ำ
  ) {
    // 1. Traceability & Security
    const correlationId = crypto.randomUUID(); 

    try {
      // 2. Execute Hardened Stored Procedure
      // บังคับส่ง IdempotencyKey เข้าไปเพื่อเช็คในตาราง Txn / Idempotency Registry
      const result = await this.prisma.$queryRaw<any[]>`
        EXEC sp_Cards_ProcessPayment 
          @TenantID = ${tenantId}, 
          @CardUID = ${cardUid}, 
          @Amount = ${amount}, 
          @SourceRefID = ${orderId}, 
          @IdempotencyKey = ${idempotencyKey},
          @CorrelationID = ${correlationId}
      `;
      
      const response = result[0];

      // [v4.9] หาก SP คืนค่า Error ผ่าน Result Set (กรณีบางระบบไม่ใช้ THROW)
      if (response && response.ErrorNumber) {
        this.handleSqlError(response.ErrorNumber.toString(), response.ErrorMessage);
      }

      return {
        status: 'SUCCESS',
        data: response,
        correlationId: correlationId // ส่งกลับเพื่อให้ Frontend เก็บไว้ใน Log
      };

    } catch (error: any) {
      // 3. Mapping SQL Error Codes -> HTTP Standard (FCS v4.9 Spec)
      this.handleSqlError(error.message);
      throw error;
    }
  }

  // ==========================================
  // 4. ดึงข้อมูลทะเบียนบัตรทั้งหมด (GET /api/v3/cards)
  // ==========================================
  async findAllCards(tenantId: number, page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { TenantID: tenantId };

    if (search) {
      whereClause.CardUID = { contains: search };
    }

    const [cards, totalItems] = await Promise.all([
      this.prisma.cards.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        include: {
          Members: true, // ดึงข้อมูลสมาชิกที่ผูกกับบัตรใบนี้มาด้วย
        },
      }),
      this.prisma.cards.count({ where: whereClause }),
    ]);

    // แปลงข้อมูลให้ตรงกับ MOCK_CARDS ใน Frontend ของคุณ
    const data = cards.map(c => ({
      uid: c.CardUID,
      type: 'Mifare / RFID', // สามารถปรับตามประเภทบัตรจริงได้
      linkedTo: c.Members ? `${c.Members.MemberCode} (${c.Members.FullName})` : null,
      cash: Number(c.CashBalance),
      sub: Number(c.SubsidyBalance),
      status: c.Status
    }));

    return {
      data,
      meta: {
        totalItems,
        currentPage: Number(page),
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // ==========================================
  // 5. อายัด/เปลี่ยนสถานะบัตร (PATCH /api/v3/cards/:cardUid/status)
  // ==========================================
  async updateCardStatus(tenantId: number, cardUid: string, newStatus: string) {
    // กำหนดสถานะที่อนุญาตให้เปลี่ยนได้
    const validStatuses = ['ACTIVE', 'FROZEN', 'AVAILABLE', 'LOST'];
    if (!validStatuses.includes(newStatus.toUpperCase())) {
      throw new BadRequestException(`Status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`);
    }

    const card = await this.prisma.cards.findUnique({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } },
    });

    if (!card) {
      throw new NotFoundException(`ไม่พบเลขบัตร ${cardUid} ในระบบ`);
    }

    // ทำการอัปเดตสถานะ
    await this.prisma.cards.update({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } },
      data: { Status: newStatus.toUpperCase() },
    });

    return { 
      success: true, 
      message: `เปลี่ยนสถานะบัตร ${cardUid} เป็น ${newStatus.toUpperCase()} สำเร็จ` 
    };
  }

  // ==========================================
  // 6. ดึงข้อมูลบัตร 1 ใบ (GET by UID)
  // ==========================================
  async findOneCard(tenantId: number, cardUid: string) {
    const card = await this.prisma.cards.findUnique({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } },
      include: {
        Members: true, // ดึงข้อมูลสมาชิกที่ผูกกับบัตรใบนี้มาด้วย (ถ้ามี)
      },
    });

    if (!card) {
      throw new NotFoundException(`ไม่พบเลขบัตร ${cardUid} ในระบบ`);
    }

    // แปลงข้อมูลให้พร้อมส่งกลับไปแสดงผล
    return {
      uid: card.CardUID,
      type: 'Mifare / RFID', 
      linkedTo: card.Members ? `${card.Members.MemberCode} (${card.Members.FullName})` : null,
      cash: Number(card.CashBalance),
      sub: Number(card.SubsidyBalance),
      status: card.Status
    };
  }

  // ==========================================
  // 7. อัปเดตข้อมูลทั่วไป หรือ แก้ไขการผูกบัตร (PATCH)
  // ==========================================
  async updateCard(tenantId: number, cardUid: string, data: any) {
    // 1. เช็คก่อนว่ามีบัตรใบนี้อยู่จริงไหม
    const card = await this.prisma.cards.findUnique({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } }
    });

    if (!card) {
      throw new NotFoundException(`ไม่พบเลขบัตร ${cardUid} ในระบบ`);
    }

    // 2. เตรียมตัวแปรสำหรับอัปเดต (ยึดค่าเดิมไว้ก่อนถ้าไม่ได้ส่งค่าใหม่มา)
    let updateData: any = {
      Status: data.status || card.Status
    };

    // 3. เช็คว่ามีการส่งค่า memberId มาเพื่อแก้คนผูกบัตรหรือไม่?
    if (data.memberId !== undefined) {
      updateData.MemberID = data.memberId; // ถ้าส่งมาเป็นตัวเลข คือเปลี่ยนคนผูก

      // ลอจิกอัตโนมัติ: ถ้าสั่งยกเลิกผูกบัตร (ส่ง memberId เป็น null) 
      // ให้ปรับสถานะบัตรกลับเป็น 'AVAILABLE' พร้อมให้คนอื่นใช้งานต่อ
      if (data.memberId === null) {
        updateData.Status = 'AVAILABLE';
      } else {
        updateData.Status = 'ACTIVE'; // ถ้าผูกคนใหม่ปุ๊บ บัตรต้องพร้อมใช้งาน
      }
    }

    // 4. ทำการบันทึกลง Database
    const updatedCard = await this.prisma.cards.update({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } },
      data: updateData
    });

    return {
      success: true,
      message: data.memberId === null 
        ? `ยกเลิกการผูกบัตร ${cardUid} สำเร็จ บัตรพร้อมใช้งานใหม่` 
        : `อัปเดตข้อมูลบัตร ${cardUid} สำเร็จ`,
      data: {
        uid: updatedCard.CardUID,
        status: updatedCard.Status,
        memberId: updatedCard.MemberID
      }
    };
  }
  // เพิ่มฟังก์ชันลงทะเบียนบัตรใหม่ (ทีละ 1 ใบ)
  async createCard(tenantId: number, cardUid: string) {
    // 1. เช็คว่าบัตรซ้ำไหม
    const existing = await this.prisma.cards.findUnique({
      where: { TenantID_CardUID: { TenantID: tenantId, CardUID: cardUid } }
    });

    if (existing) {
      throw new BadRequestException(`บัตรหมายเลข ${cardUid} มีอยู่ในระบบแล้ว`);
    }

    // 2. บันทึกบัตรใหม่สถานะ AVAILABLE (บัตรว่าง) โดยใช้ Raw Query หลบ RowVersion
    await this.prisma.$executeRaw`
      INSERT INTO [dbo].[Cards] ([TenantID], [CardUID], [Status], [CashBalance], [SubsidyBalance])
      VALUES (${tenantId}, ${cardUid}, 'AVAILABLE', 0, 0)
    `;

    return { success: true, message: 'เพิ่มบัตรใหม่เข้าคลังสำเร็จ' };
  }

  // ==========================================
  // 3. ฟังก์ชันจัดการ Error จาก Database (Helper Method)
  // ==========================================
  private handleSqlError(errorMsg: string, customMsg?: string) {
    if (!errorMsg) return; // Guard clause เพื่อป้องกันกรณี errorMsg เป็น undefined

    if (errorMsg.includes('50001')) throw new ForbiddenException('Tenant Suspended (50001)');
    if (errorMsg.includes('50002')) throw new ConflictException('Duplicate Transaction (50002)');
    if (errorMsg.includes('50005')) throw new ForbiddenException('Card is Frozen (50005)');
    // อัปเดตเป็น UnprocessableEntityException (HTTP 422) ตามมาตรฐาน FCS API Spec v2 
    if (errorMsg.includes('50006')) throw new UnprocessableEntityException('Insufficient Balance (50006)'); 
    if (errorMsg.includes('50003') || errorMsg.includes('50004')) throw new BadRequestException('Card Not Found');
    
    // หากไม่ใช่ Financial Error ที่เรารู้จัก
    if (errorMsg.includes('500')) throw new InternalServerErrorException(customMsg || 'Financial Process Error');

    
  }
}