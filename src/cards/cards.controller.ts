import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  UnauthorizedException, 
  BadRequestException ,
  UseGuards
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { Get, Patch, Query, Param } from '@nestjs/common'; // อย่าลืม import เพิ่มด้านบนสุดของไฟล์ด้วยนะครับ
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // <--- 2. นำเข้าไฟล์ยามของเรา
@Controller('cards')
//@UseGuards(JwtAuthGuard) // <--- 3. แปะป้ายล็อคประตู! (API ทุกเส้นในไฟล์นี้จะโดนล็อคทันที)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // ==========================================
  // 1. API ผูกบัตร (POST /api/v3/cards/link)
  // ==========================================
  @Post('link')
  async linkCard(
    @Headers('x-tenant-id') tenantId: string,
    @Body('memberCode') memberCode: string,
    @Body('cardUid') cardUid: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    
    if (!memberCode || !cardUid) {
      throw new BadRequestException('จำเป็นต้องระบุ memberCode และ cardUid');
    }

    return this.cardsService.linkCard(Number(tenantId), memberCode, cardUid);
  }

  @Post()
  async createCard(
    @Headers('x-tenant-id') tenantId: string,
    @Body('cardUid') cardUid: string
  ) {
    if (!cardUid) throw new BadRequestException('กรุณาระบุเลข UID บัตร');
    return this.cardsService.createCard(Number(tenantId), cardUid);
  }

  // ==========================================
  // 2. API ตัดเงิน (POST /api/v3/cards/payment)
  // ==========================================
  @Post('payment')
  async processPayment(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string, // [v4.9] รับ Idempotency-Key จาก Header
    @Body('cardUid') cardUid: string,
    @Body('amount') amount: number,
    @Body('orderId') orderId: number, // รับเป็น number หรือ string จาก JSON แล้วเดี๋ยวแปลงเป็น BigInt
  ) {
    // 1. ตรวจสอบความปลอดภัยเบื้องต้น (Tenant Isolation)
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    // 2. ตรวจสอบ Idempotency Key (บังคับตาม Spec ระบบการเงิน)
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required ป้องกันการตัดเงินซ้ำ');
    }

    // 3. ตรวจสอบข้อมูลใน Body ว่าส่งมาครบไหม
    if (!cardUid || amount === undefined || !orderId) {
      throw new BadRequestException('จำเป็นต้องระบุ cardUid, amount และ orderId ให้ครบถ้วน');
    }

    // 4. ตรวจสอบความถูกต้องของจำนวนเงิน
    if (amount <= 0) {
      throw new BadRequestException('จำนวนเงินที่ต้องการตัดต้องมากกว่า 0');
    }

    // 5. แปลงค่า orderId เป็น BigInt ก่อนส่งให้ Service (เพราะใน Database เป็น BigInt)
    const orderIdBigInt = BigInt(orderId);

    // ส่งงานต่อให้ Service ประมวลผลและเรียกใช้ Stored Procedure
    return this.cardsService.processPayment(
      Number(tenantId),
      cardUid,
      Number(amount),
      orderIdBigInt,
      idempotencyKey
    );
  }
  // ==========================================
  // 3. API ดึงข้อมูลบัตรทั้งหมด (GET /api/v3/cards)
  // ==========================================
  @Get()
  async getCards(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    return this.cardsService.findAllCards(Number(tenantId), page, limit, search);
  }

  // ==========================================
  // 4. API อายัด/อัปเดตสถานะบัตร (PATCH /api/v3/cards/:cardUid/status)
  // ==========================================
  @Patch(':cardUid/status')
  async updateCardStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Param('cardUid') cardUid: string,
    @Body('status') status: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    
    if (!status) {
      throw new BadRequestException('จำเป็นต้องระบุ status (เช่น ACTIVE, FROZEN, LOST)');
    }

    return this.cardsService.updateCardStatus(Number(tenantId), cardUid, status);
  }
  // ==========================================
  // API: ดึงข้อมูลบัตร 1 ใบ (GET /api/v3/cards/:cardUid)
  // ==========================================
  @Get(':cardUid')
  async getCardByUid(
    @Headers('x-tenant-id') tenantId: string,
    @Param('cardUid') cardUid: string
  ) {
    return this.cardsService.findOneCard(Number(tenantId), cardUid);
  }

  // ==========================================
  // API: แก้ไขข้อมูลบัตร (PATCH /api/v3/cards/:cardUid)
  // ==========================================
  @Patch(':cardUid')
  async updateCard(
    @Headers('x-tenant-id') tenantId: string,
    @Param('cardUid') cardUid: string,
    @Body() body: any
  ) {
    return this.cardsService.updateCard(Number(tenantId), cardUid, body);
  }
}