import { Controller, Get, Post, Patch, Body, Param, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('branches')
@UseGuards(JwtAuthGuard) // <--- บังคับว่าต้องมี Token
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async getBranches(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.branchesService.findAllBranches(Number(tenantId));
  }

  @Get(':id')
  async getBranchById(
    @Headers('x-tenant-id') tenantId: string, 
    @Param('id') branchId: string
  ) {
    return this.branchesService.findOneBranch(Number(tenantId), Number(branchId));
  }

  // เปลี่ยนฟังก์ชัน createBranch เดิมเป็นแบบนี้ครับ
  @Post()
  async createBranch(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    // เพิ่มการดักเช็ค body.code 
    if (!body.code || !body.name) {
      throw new BadRequestException('ระบุรหัสสาขา (code) และชื่อสาขา (name) ให้ครบถ้วน');
    }
    return this.branchesService.createBranch(Number(tenantId), body);
  }

  @Patch(':id')
  async updateBranch(
    @Headers('x-tenant-id') tenantId: string, 
    @Param('id') branchId: string, 
    @Body() body: any
  ) {
    return this.branchesService.updateBranch(Number(tenantId), Number(branchId), body);
  }
}