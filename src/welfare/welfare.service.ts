import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WelfareService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. ดึงข้อมูลกฎสวัสดิการทั้งหมด
  // ==========================================
  async findAllRules(tenantId: number) {
    const rules = await this.prisma.welfareRules.findMany({
      where: { TenantID: tenantId },
      orderBy: { RuleID: 'desc' }
    });

    return rules.map(r => {
      // 💡 ปรับการแสดงผล Schedule ให้สวยงามและมีรายละเอียด
      let scheduleDisplay = r.ScheduleType;
      if (r.ScheduleType !== 'MANUAL' && r.ScheduleTime) {
        scheduleDisplay += ` (${r.ScheduleTime})`;
      }

      return {
        id: r.RuleID,
        name: r.RuleName,
        amount: Number(r.Amount),
        schedule: scheduleDisplay,
        
        // 💡 ส่งค่ากลับไปให้หน้าจอ Edit ด้วย
        scheduleType: r.ScheduleType,
        scheduleTime: r.ScheduleTime || '',
        target: r.TargetGroup,
        actionDays: r.ActionDays || '',
        actionDate: r.ActionDate || null,
        skipHolidays: r.SkipHolidays,
        
        status: r.IsActive ? 'ACTIVE' : 'INACTIVE',
        lastRun: r.LastRunAt ? r.LastRunAt.toLocaleString('th-TH') : 'ยังไม่เคยทำงาน'
      };
    });
  }

  // ==========================================
  // 2. สร้างกฎสวัสดิการใหม่
  // ==========================================
  async createRule(tenantId: number, data: any) {
    return this.prisma.welfareRules.create({
      data: {
        TenantID: tenantId,
        RuleName: data.name,
        Amount: data.amount,
        ScheduleType: data.scheduleType, 
        ScheduleTime: data.scheduleTime, 
        TargetGroup: data.target,
        // 💡 รับค่าและบันทึกฟิลด์ใหม่ลง Database
        ActionDays: data.actionDays || null,
        ActionDate: data.actionDate ? Number(data.actionDate) : null,
        SkipHolidays: data.skipHolidays !== undefined ? data.skipHolidays : true,
        IsActive: true
      }
    });
  }

  // ==========================================
  // 3. สั่งรันแจกเงินทันที (Execute Now)
  // ==========================================
  async executeRule(tenantId: number, ruleId: number) {
    await this.prisma.welfareRules.update({
      where: { RuleID: ruleId },
      data: { LastRunAt: new Date() } 
    });

    return { 
      success: true, 
      message: `ระบบได้ทำการแจกสวัสดิการตามกฎหมายเลข ${ruleId} เรียบร้อยแล้ว!` 
    };
  }

  // ==========================================
  // 4. อัปเดตกฎสวัสดิการ (Edit)
  // ==========================================
  async updateRule(tenantId: number, ruleId: number, data: any) {
    return this.prisma.welfareRules.update({
      where: { RuleID: ruleId },
      data: {
        RuleName: data.name,
        Amount: data.amount,
        ScheduleType: data.scheduleType, 
        ScheduleTime: data.scheduleTime, 
        TargetGroup: data.target,
        // 💡 อัปเดตฟิลด์ใหม่ลง Database
        ActionDays: data.actionDays || null,
        ActionDate: data.actionDate ? Number(data.actionDate) : null,
        SkipHolidays: data.skipHolidays !== undefined ? data.skipHolidays : true,
        IsActive: data.isActive
      }
    });
  }
}