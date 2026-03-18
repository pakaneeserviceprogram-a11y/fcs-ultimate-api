import { Controller, Get, Query, Headers, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard) // ยามเฝ้าประตูเรื่องเงินๆ ทองๆ สำคัญมาก!
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==========================================
  // API: ดึงรายงานสรุปยอดจ่ายเงินร้านค้า (GET /api/v3/finance/settlement)
  // ==========================================
  @Get('settlement')
  async getSettlement(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID is required');
    
    // บังคับว่าต้องส่งวันที่เริ่มต้นและสิ้นสุดมาเสมอ (รูปแบบ YYYY-MM-DD)
    if (!startDate || !endDate) {
      throw new BadRequestException('กรุณาระบุ startDate และ endDate (เช่น YYYY-MM-DD)');
    }

    return this.financeService.getSettlementReport(Number(tenantId), startDate, endDate);
  }
}