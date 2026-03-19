import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: number) {
    const campaigns = await this.prisma.promoCampaigns.findMany({
      where: { TenantID: tenantId },
      include: { 
        _count: { select: { PromoRedemptionLog: true } },
        PromoVendors: true,   // 💡 ดึงข้อมูลร้านค้าที่ผูกไว้
        PromoProducts: true   // 💡 ดึงข้อมูลสินค้าที่ผูกไว้
      }, 
      orderBy: { CampaignID: 'desc' }
    });

    return campaigns.map(c => ({
      id: c.CampaignID,
      name: c.CampaignName,
      type: c.CampaignType,
      condition: c.ConditionDesc || '-',
      minAmount: Number(c.ConditionMinAmount || 0), 
      rewardType: c.RewardType,
      rewardValue: Number(c.RewardValue),
      used: c._count?.PromoRedemptionLog || 0,
      startDate: c.StartDate ? c.StartDate.toISOString().split('T')[0] : '',
      endDate: c.EndDate ? c.EndDate.toISOString().split('T')[0] : '',
      startTime: c.StartTime || '',
      endTime: c.EndTime || '',
      targetMemberType: c.TargetMemberType || 'ALL',
      
      // 💡 ข้อมูล Scope ที่เพิ่มเข้ามาใหม่
      scopeType: c.ScopeType || 'ALL',
      selectedVendors: c.PromoVendors.map(v => v.VendorID),
      // แปลง BigInt กลับเป็น String เพื่อส่งให้ Frontend
      selectedProducts: c.PromoProducts.map(p => p.ProductID.toString()), 

      status: c.IsActive ? 'ACTIVE' : 'INACTIVE'
    }));
  }

  async create(tenantId: number, data: any) {
    return this.prisma.promoCampaigns.create({
      data: {
        TenantID: tenantId,
        CampaignName: data.name,
        CampaignType: data.type,
        ConditionDesc: data.type === 'MEMBER_DISCOUNT' ? `สำหรับสมาชิก: ${data.targetMemberType}` : data.condition,
        ConditionMinAmount: data.minAmount || 0, 
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null,
        EndTime: data.endTime || null,
        TargetMemberType: data.type === 'MEMBER_DISCOUNT' ? data.targetMemberType : 'ALL',
        IsActive: true,

        // 💡 บันทึก Scope และผูกข้อมูลลงตารางเชื่อม (Junction Tables)
        ScopeType: data.scopeType,
        PromoVendors: data.scopeType === 'SPECIFIC_VENDOR' && data.selectedVendors?.length > 0 ? {
          create: data.selectedVendors.map((vId: string) => ({ TenantID: tenantId, VendorID: vId }))
        } : undefined,
        
        PromoProducts: data.scopeType === 'SPECIFIC_PRODUCT' && data.selectedProducts?.length > 0 ? {
          create: data.selectedProducts.map((pId: string) => ({ TenantID: tenantId, ProductID: BigInt(pId) }))
        } : undefined,
      }
    });
  }

  async update(tenantId: number, campaignId: number, data: any) {
    return this.prisma.promoCampaigns.update({
      where: { CampaignID: campaignId },
      data: {
        CampaignName: data.name,
        CampaignType: data.type,
        ConditionDesc: data.type === 'MEMBER_DISCOUNT' ? `สำหรับสมาชิก: ${data.targetMemberType}` : data.condition,
        ConditionMinAmount: data.minAmount || 0, 
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null,
        EndTime: data.endTime || null,
        TargetMemberType: data.type === 'MEMBER_DISCOUNT' ? data.targetMemberType : 'ALL',
        IsActive: data.isActive,

        // 💡 อัปเดต Scope (ลบของเก่าทิ้งทั้งหมด แล้วสร้างใหม่เฉพาะที่เลือกมา)
        ScopeType: data.scopeType,
        PromoVendors: {
          deleteMany: {}, // ลบข้อมูลผูกร้านค้าเดิมออกทั้งหมด
          create: data.scopeType === 'SPECIFIC_VENDOR' && data.selectedVendors?.length > 0 
            ? data.selectedVendors.map((vId: string) => ({ TenantID: tenantId, VendorID: vId }))
            : []
        },
        PromoProducts: {
          deleteMany: {}, // ลบข้อมูลผูกสินค้าเดิมออกทั้งหมด
          create: data.scopeType === 'SPECIFIC_PRODUCT' && data.selectedProducts?.length > 0 
            ? data.selectedProducts.map((pId: string) => ({ TenantID: tenantId, ProductID: BigInt(pId) }))
            : []
        }
      }
    });
  }
}