import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. ดึงข้อมูลสมาชิกทั้งหมด (GET)
  // ==========================================
  async findAll(tenantId: number, page: number = 1, limit: number = 20, search?: string, type?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { TenantID: tenantId };
    if (search) {
      whereClause.OR = [{ MemberCode: { contains: search } }, { FullName: { contains: search } }];
    }
    if (type) {
      whereClause.MemberType = type;
    }

    const [members, totalItems] = await Promise.all([
      this.prisma.members.findMany({
        where: whereClause, skip, take: Number(limit), orderBy: { MemberID: 'desc' },
        include: { Cards: true },
      }),
      this.prisma.members.count({ where: whereClause }),
    ]);

    const data = members.map(m => {
      const activeCards = m.Cards?.filter(c => c.Status === 'ACTIVE') || [];
      return {
        id: m.MemberID.toString(),
        code: m.MemberCode,
        name: m.FullName,
        type: m.MemberType,
        department: m.Department,
        groupId: m.GroupID,
        rfids: activeCards.map(c => c.CardUID), 
        cashBalance: activeCards.length > 0 ? Number(activeCards[0].CashBalance) : 0,
        subsidyBalance: activeCards.length > 0 ? Number(activeCards[0].SubsidyBalance) : 0,
        status: m.Status,
      };
    });

    return { data, meta: { totalItems, currentPage: Number(page), itemsPerPage: Number(limit), totalPages: Math.ceil(totalItems / limit) } };
  }

  // ==========================================
  // 2. ดึงข้อมูลสมาชิก 1 คน (GET by ID)
  // ==========================================
  async findOneMember(tenantId: number, memberId: number) {
    const member = await this.prisma.members.findUnique({ where: { TenantID_MemberID: { TenantID: tenantId, MemberID: memberId } }, include: { Cards: true } });
    if (!member) throw new NotFoundException(`ไม่พบสมาชิกรหัส ${memberId} ในระบบ`);
    
    const activeCards = member.Cards?.filter(c => c.Status === 'ACTIVE') || [];
    return { 
      id: member.MemberID.toString(), code: member.MemberCode, name: member.FullName, 
      type: member.MemberType, department: member.Department, groupId: member.GroupID, status: member.Status, 
      rfids: activeCards.map(c => c.CardUID) 
    };
  }

  // ==========================================
  // 3. สร้างสมาชิกใหม่ (POST)
  // ==========================================
  async createMember(tenantId: number, data: any) {
    const existing = await this.prisma.members.findFirst({ where: { TenantID: tenantId, MemberCode: data.code } });
    if (existing) throw new BadRequestException(`รหัสสมาชิก ${data.code} มีในระบบแล้ว`);
    
    return this.prisma.members.create({ 
      data: { 
        TenantID: tenantId, 
        MemberCode: data.code, 
        FullName: data.name, 
        MemberType: data.type || 'STUDENT', 
        Department: data.department || '', 
        GroupID: data.groupId ? Number(data.groupId) : null,
        Status: data.status || 'ACTIVE', 
        CreatedDate: new Date() 
      } 
    });
  }

  // ==========================================
  // 4. อัปเดตข้อมูลสมาชิก (PATCH)
  // ==========================================
  async updateMember(tenantId: number, memberId: number, data: any) {
    const existing = await this.prisma.members.findUnique({ where: { TenantID_MemberID: { TenantID: tenantId, MemberID: memberId } } });
    if (!existing) throw new NotFoundException(`ไม่พบสมาชิกรหัส ${memberId} ในระบบ`);
    
    const updatedMember = await this.prisma.members.update({
      where: { TenantID_MemberID: { TenantID: tenantId, MemberID: memberId } },
      data: { 
        MemberCode: data.code || existing.MemberCode, 
        FullName: data.name || existing.FullName, 
        MemberType: data.type || existing.MemberType, 
        Department: data.department !== undefined ? data.department : existing.Department, 
        GroupID: data.groupId ? Number(data.groupId) : null,
        Status: data.status || existing.Status 
      }
    });
    
    return { success: true, message: `อัปเดตข้อมูลสมาชิก ${updatedMember.FullName} สำเร็จ`, data: { id: updatedMember.MemberID.toString() } };
  }

  // ==========================================
  // 5. ผูกบัตร RFID
  // ==========================================
  async bindCard(tenantId: number, memberId: number, rfid: string) {
    const member = await this.prisma.members.findUnique({ where: { TenantID_MemberID: { TenantID: tenantId, MemberID: memberId } } });
    if (!member) throw new NotFoundException(`ไม่พบสมาชิกรหัส ${memberId}`);

    const existingCard = await this.prisma.cards.findFirst({ where: { TenantID: tenantId, CardUID: rfid } });

    if (existingCard) {
      if ((existingCard as any).MemberID !== null && (existingCard as any).MemberID !== memberId) {
        throw new BadRequestException('บัตรใบนี้ถูกผูกกับสมาชิกท่านอื่นอยู่แล้ว!');
      }
      await this.prisma.$executeRaw`
        UPDATE [dbo].[Cards]
        SET [MemberID] = ${memberId}, [Status] = 'ACTIVE'
        WHERE [TenantID] = ${tenantId} AND [CardUID] = ${rfid}
      `;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO [dbo].[Cards] ([TenantID], [MemberID], [CardUID], [Status], [CashBalance], [SubsidyBalance])
        VALUES (${tenantId}, ${memberId}, ${rfid}, 'ACTIVE', 0, 0)
      `;
    }
    return { success: true, message: 'ผูกบัตรสำเร็จเรียบร้อย' };
  }

  // ==========================================
  // 6. จัดการแผนก/ชั้นเรียน (Departments)
  // ==========================================
  async getDepartments(tenantId: number) {
    const deps = await this.prisma.departments.findMany({
      where: { TenantID: tenantId, IsActive: true },
      orderBy: { DepartmentName: 'asc' }
    });
    // 💡 ส่ง GroupID กลับไปให้หน้าจอด้วย
    return deps.map(d => ({ id: d.DepartmentID, name: d.DepartmentName, groupId: d.GroupID }));
  }

  async createDepartment(tenantId: number, data: any) {
    const existing = await this.prisma.departments.findFirst({ where: { TenantID: tenantId, DepartmentName: data.name, IsActive: true } });
    if (existing) throw new BadRequestException(`ชื่อแผนก "${data.name}" มีในระบบแล้ว`);
    const dep = await this.prisma.departments.create({ 
      data: { TenantID: tenantId, DepartmentName: data.name, GroupID: data.groupId ? Number(data.groupId) : null, IsActive: true } 
    });
    return { id: dep.DepartmentID, name: dep.DepartmentName, groupId: dep.GroupID };
  }

  async updateDepartment(tenantId: number, id: number, data: any) {
    const updated = await this.prisma.departments.update({ 
      where: { DepartmentID: id }, 
      data: { DepartmentName: data.name, GroupID: data.groupId ? Number(data.groupId) : null } 
    });
    return { id: updated.DepartmentID, name: updated.DepartmentName, groupId: updated.GroupID };
  }

  async deleteDepartment(tenantId: number, id: number) {
    await this.prisma.departments.update({ where: { DepartmentID: id }, data: { IsActive: false } });
    return { success: true };
  }

  // ==========================================
  // 7. จัดการกลุ่มบัตร (Card Groups)
  // ==========================================
  async findCardGroups(tenantId: number) {
    const groups = await this.prisma.cardGroups.findMany({
      where: { TenantID: tenantId, IsDeleted: false },
      orderBy: { GroupName: 'asc' }
    });
    return groups.map(g => ({ id: g.GroupID, name: g.GroupName }));
  }

  async createCardGroup(tenantId: number, groupName: string) {
    const existing = await this.prisma.cardGroups.findFirst({ where: { TenantID: tenantId, GroupName: groupName, IsDeleted: false } });
    if (existing) throw new BadRequestException(`ชื่อกลุ่ม "${groupName}" มีอยู่ในระบบแล้ว`);
    const group = await this.prisma.cardGroups.create({ data: { TenantID: tenantId, GroupName: groupName, IsDeleted: false } });
    return { id: group.GroupID, name: group.GroupName };
  }

  async updateCardGroup(tenantId: number, groupId: number, groupName: string) {
    const group = await this.prisma.cardGroups.findUnique({ where: { TenantID_GroupID: { TenantID: tenantId, GroupID: groupId } } });
    if (!group || group.IsDeleted) throw new NotFoundException('ไม่พบกลุ่มบัตรนี้');
    const updated = await this.prisma.cardGroups.update({ where: { TenantID_GroupID: { TenantID: tenantId, GroupID: groupId } }, data: { GroupName: groupName } });
    return { id: updated.GroupID, name: updated.GroupName };
  }

  async deleteCardGroup(tenantId: number, groupId: number) {
    await this.prisma.cardGroups.update({ where: { TenantID_GroupID: { TenantID: tenantId, GroupID: groupId } }, data: { IsDeleted: true } });
    return { success: true };
  }

  // ==========================================
  // 8. จัดการประเภทสมาชิก (Member Types)
  // ==========================================
  async getMemberTypes(tenantId: number) {
    const types = await this.prisma.sysMemberTypes.findMany({
      where: { TenantID: tenantId, IsActive: true },
      orderBy: { TypeName: 'asc' }
    });
    // 💡 ส่ง GroupID กลับไปให้หน้าจอด้วย
    return types.map(t => ({ id: t.MemberTypeID, name: t.TypeName, groupId: t.GroupID }));
  }

  async createMemberType(tenantId: number, data: any) {
    const existing = await this.prisma.sysMemberTypes.findFirst({ where: { TenantID: tenantId, TypeName: data.name, IsActive: true } });
    if (existing) throw new BadRequestException(`ประเภทสมาชิก "${data.name}" มีอยู่ในระบบแล้ว`);
    const newType = await this.prisma.sysMemberTypes.create({ 
      data: { TenantID: tenantId, TypeName: data.name, GroupID: data.groupId ? Number(data.groupId) : null, IsActive: true } 
    });
    return { id: newType.MemberTypeID, name: newType.TypeName, groupId: newType.GroupID };
  }

  async updateMemberType(tenantId: number, id: number, data: any) {
    const updated = await this.prisma.sysMemberTypes.update({ 
      where: { MemberTypeID: id }, 
      data: { TypeName: data.name, GroupID: data.groupId ? Number(data.groupId) : null } 
    });
    return { id: updated.MemberTypeID, name: updated.TypeName, groupId: updated.GroupID };
  }

  async deleteMemberType(tenantId: number, id: number) {
    await this.prisma.sysMemberTypes.update({ where: { MemberTypeID: id }, data: { IsActive: false } });
    return { success: true };
  }
}