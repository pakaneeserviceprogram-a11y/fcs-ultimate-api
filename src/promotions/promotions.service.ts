import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: number) {
    const campaigns = await this.prisma.promoCampaigns.findMany({
      where: { TenantID: tenantId },
      include: { _count: { select: { PromoRedemptionLog: true } } }, // 💡 ถ้า Error ตรงนี้เพราะยังไม่มีตาราง ให้ลบออกก่อนได้ครับ
      orderBy: { CampaignID: 'desc' }
    });

    return campaigns.map(c => ({
      id: c.CampaignID,
      name: c.CampaignName,
      type: c.CampaignType,
      condition: c.ConditionDesc || '-',
      minAmount: Number(c.ConditionMinAmount || 0), // 💡 ส่งยอดขั้นต่ำไปให้หน้าจอ
      rewardType: c.RewardType,
      rewardValue: Number(c.RewardValue),
      used: c._count?.PromoRedemptionLog || 0,
      startDate: c.StartDate ? c.StartDate.toISOString().split('T')[0] : '',
      endDate: c.EndDate ? c.EndDate.toISOString().split('T')[0] : '',
      startTime: c.StartTime || '',
      endTime: c.EndTime || '',
      status: c.IsActive ? 'ACTIVE' : 'INACTIVE'
    }));
  }

  async create(tenantId: number, data: any) {
    return this.prisma.promoCampaigns.create({
      data: {
        TenantID: tenantId,
        CampaignName: data.name,
        CampaignType: data.type,
        ConditionDesc: data.condition,
        ConditionMinAmount: data.minAmount || 0, // 💡 บันทึกยอดขั้นต่ำ
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null,
        EndTime: data.endTime || null,
        IsActive: true
      }
    });
  }

  async update(tenantId: number, campaignId: number, data: any) {
    return this.prisma.promoCampaigns.update({
      where: { CampaignID: campaignId },
      data: {
        CampaignName: data.name,
        CampaignType: data.type,
        ConditionDesc: data.condition,
        ConditionMinAmount: data.minAmount || 0, // 💡 บันทึกยอดขั้นต่ำ
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null,
        EndTime: data.endTime || null,
        IsActive: data.isActive
      }
    });
  }
}