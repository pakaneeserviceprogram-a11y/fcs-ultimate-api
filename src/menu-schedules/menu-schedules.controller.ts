import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { MenuSchedulesService } from './menu-schedules.service';

@Controller('menu-schedules')
export class MenuSchedulesController {
  constructor(private readonly service: MenuSchedulesService) {}

  @Get('vendors')
  async getVendors(@Headers('x-tenant-id') tenantId: string) {
    return this.service.getVendors(Number(tenantId));
  }

  @Get('products')
  async getProducts(@Headers('x-tenant-id') tenantId: string, @Query('vendorId') vendorId: string) {
    return this.service.getProducts(Number(tenantId), vendorId);
  }

  @Get()
  async getSchedules(@Headers('x-tenant-id') tenantId: string, @Query('date') date: string, @Query('vendorId') vendorId: string) {
    return this.service.getSchedulesByDate(Number(tenantId), date, vendorId);
  }

  @Post('bulk')
  async saveBulk(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.service.saveBulkSchedule(Number(tenantId), body);
  }
  
  @Post('copy')
  async copyDay(@Headers('x-tenant-id') tenantId: string, @Body() body: { fromDate: string, targetDates: string[], vendorId: string }) {
    return this.service.copyScheduleMultiple(Number(tenantId), body.fromDate, body.targetDates, body.vendorId);
  }
}