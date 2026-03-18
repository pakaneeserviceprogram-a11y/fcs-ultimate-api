import { Controller, Get, Post, Patch, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  async getPromotions(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID Required');
    return this.promotionsService.findAll(Number(tenantId));
  }

  @Post()
  async createPromotion(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.promotionsService.create(Number(tenantId), body);
  }

  @Patch(':id')
  async updatePromotion(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.promotionsService.update(Number(tenantId), Number(id), body);
  }
}