import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ==========================================
  // 💡 1. Route เฉพาะเจาะจง ต้องอยู่บนสุดเสมอ! (ป้องกันบั๊ก :id)
  // ==========================================

  // ---------- โซนจัดการกลุ่มสวัสดิการ (Groups) ----------
  @Get('groups') 
  async getCardGroups(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID Required');
    return this.membersService.findCardGroups(Number(tenantId));
  }

  @Post('groups')
  async createCardGroup(@Headers('x-tenant-id') tenantId: string, @Body('name') name: string) {
    return this.membersService.createCardGroup(Number(tenantId), name);
  }

  @Patch('groups/:id')
  async updateCardGroup(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body('name') name: string) {
    return this.membersService.updateCardGroup(Number(tenantId), Number(id), name);
  }

  @Delete('groups/:id')
  async deleteCardGroup(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.membersService.deleteCardGroup(Number(tenantId), Number(id));
  }

  // ---------- โซนจัดการแผนก (Departments) ----------
  @Get('departments')
  async getDepartments(@Headers('x-tenant-id') tenantId: string) {
    return this.membersService.getDepartments(Number(tenantId));
  }

 // ---------- แผนก ----------
 @Post('departments')
 async createDepartment(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
   return this.membersService.createDepartment(Number(tenantId), body);
 }

 @Patch('departments/:id')
 async updateDepartment(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
   return this.membersService.updateDepartment(Number(tenantId), Number(id), body);
 }

  @Delete('departments/:id')
  async deleteDepartment(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.membersService.deleteDepartment(Number(tenantId), Number(id));
  }

  // ---------- 💡 โซนจัดการประเภทสมาชิก (Member Types) ที่เพิ่มใหม่ ----------
  @Get('types')
  async getMemberTypes(@Headers('x-tenant-id') tenantId: string) {
    return this.membersService.getMemberTypes(Number(tenantId));
  }

  // ---------- ประเภทสมาชิก ----------
  @Post('types')
  async createMemberType(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.membersService.createMemberType(Number(tenantId), body);
  }

  @Patch('types/:id')
  async updateMemberType(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.membersService.updateMemberType(Number(tenantId), Number(id), body);
  }

  @Delete('types/:id')
  async deleteMemberType(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.membersService.deleteMemberType(Number(tenantId), Number(id));
  }


  // ==========================================
  // 💡 2. Route พื้นฐาน (จัดการข้อมูลสมาชิก)
  // ==========================================
  @Get()
  async getMembers(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search: string = '',
    @Query('type') type: string = ''
  ) {
    return this.membersService.findAll(Number(tenantId), Number(page), Number(limit), search, type);
  }

  @Post()
  async createMember(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.membersService.createMember(Number(tenantId), body);
  }


  // ==========================================
  // 💡 3. Route ที่มีตัวแปร Dynamic (:id) ต้องอยู่ล่างสุด!
  // ==========================================
  @Get(':id')
  async getMemberById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.membersService.findOneMember(Number(tenantId), Number(id));
  }

  @Patch(':id')
  async updateMember(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.membersService.updateMember(Number(tenantId), Number(id), body);
  }

  @Patch(':id/bind-card')
  async bindCard(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body('rfid') rfid: string) {
    return this.membersService.bindCard(Number(tenantId), Number(id), rfid);
  }
}