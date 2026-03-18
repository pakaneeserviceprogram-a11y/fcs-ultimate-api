import { Controller, Get, Post,Patch, Body, Headers, Param, UnauthorizedException, UseGuards, BadRequestException } from '@nestjs/common';
import { WelfareService } from './welfare.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ให้ยามมาเฝ้าประตู

@Controller('welfare')
//@UseGuards(JwtAuthGuard) // บังคับให้ต้องมี Token
export class WelfareController {
  constructor(private readonly welfareService: WelfareService) {}

  @Get()
  async getRules(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID is required');
    return this.welfareService.findAllRules(Number(tenantId));
  }

  @Post()
  async createRule(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    if (!body.name || !body.amount || !body.target || !body.scheduleType) {
      throw new BadRequestException('ข้อมูลสร้างกฎไม่ครบถ้วน');
    }
    return this.welfareService.createRule(Number(tenantId), body);
  }

  @Post(':id/execute')
  async executeRule(@Headers('x-tenant-id') tenantId: string, @Param('id') ruleId: string) {
    return this.welfareService.executeRule(Number(tenantId), Number(ruleId));
  }
  @Patch(':id')
  async updateRule(@Headers('x-tenant-id') tenantId: string, @Param('id') ruleId: string, @Body() body: any) {
    return this.welfareService.updateRule(Number(tenantId), Number(ruleId), body);
  }
}