import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: number) {
    const campaigns = await this.prisma.promoCampaigns.findMany({
      where: { TenantID: tenantId },
      include: { _count: { select: { PromoRedemptionLog: true } } },
      orderBy: { CampaignID: 'desc' }
    });

    return campaigns.map(c => ({
      id: c.CampaignID,
      name: c.CampaignName,
      type: c.CampaignType,
      condition: c.ConditionDesc || '-',
      rewardType: c.RewardType,
      rewardValue: Number(c.RewardValue),
      used: c._count.PromoRedemptionLog,
      startDate: c.StartDate ? c.StartDate.toISOString().split('T')[0] : '',
      endDate: c.EndDate ? c.EndDate.toISOString().split('T')[0] : '',
      startTime: c.StartTime || '', // 💡 ส่งค่าเวลาออกไป
      endTime: c.EndTime || '',     // 💡 ส่งค่าเวลาออกไป
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
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null, // 💡 รับค่าเวลาบันทึก
        EndTime: data.endTime || null,     // 💡 รับค่าเวลาบันทึก
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
        RewardType: data.rewardType,
        RewardValue: data.rewardValue,
        StartDate: data.startDate ? new Date(data.startDate) : null,
        EndDate: data.endDate ? new Date(data.endDate) : null,
        StartTime: data.startTime || null, // 💡 รับค่าเวลาบันทึก
        EndTime: data.endTime || null,     // 💡 รับค่าเวลาบันทึก
        IsActive: data.isActive
      }
    });
  }
}