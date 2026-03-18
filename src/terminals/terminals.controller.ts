import { Controller, Get, Post, Patch, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { TerminalsService } from './terminals.service';

@Controller('terminals')
export class TerminalsController {
  constructor(private readonly terminalsService: TerminalsService) {}

  @Get()
  async getTerminals(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID Required');
    return this.terminalsService.findAll(Number(tenantId));
  }

  @Post()
  async createTerminal(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.terminalsService.create(Number(tenantId), body);
  }

  @Patch(':id')
  async updateTerminal(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.terminalsService.update(Number(tenantId), id, body);
  }
}