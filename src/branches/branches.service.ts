import { Injectable, BadRequestException,NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. ดึงข้อมูลสาขาทั้งหมด (GET)
  // ==========================================
  async findAllBranches(tenantId: number) {
    const branches = await this.prisma.sysBranches.findMany({
      where: { TenantID: tenantId },
      orderBy: { BranchID: 'asc' } 
    });

    return branches.map(b => ({
      id: b.BranchID,
      code: b.BranchCode, // <--- เพิ่มบรรทัดนี้เพื่อให้ Frontend เอาไปโชว์ได้
      name: b.BranchName,
      status: b.IsActive ? 'ACTIVE' : 'INACTIVE'
    }));
  }

  // ==========================================
  // 2. สร้างสาขาใหม่ (POST)
  // ==========================================
  async createBranch(tenantId: number, data: any) {
    // เช็ครหัสสาขาซ้ำก่อนสร้าง
    const existing = await this.prisma.sysBranches.findUnique({
      where: { TenantID_BranchCode: { TenantID: tenantId, BranchCode: data.code } }
    });
    if (existing) throw new BadRequestException(`รหัสสาขา ${data.code} มีในระบบแล้ว`);

    return this.prisma.sysBranches.create({
      data: {
        TenantID: tenantId,
        BranchCode: data.code, // <--- เพิ่มบรรทัดนี้เข้ามาครับ!
        BranchName: data.name,
        IsActive: true,
      }
    });
  }

  // ==========================================
  // 3. แก้ไขข้อมูลสาขา / ปิดใช้งานสาขา (PATCH)
  // ==========================================
  async updateBranch(tenantId: number, branchId: number, data: any) {
    return this.prisma.sysBranches.update({
      where: { TenantID_BranchID: { TenantID: tenantId, BranchID: branchId } },
      data: {
        BranchCode: data.code, // <--- (ทางเลือก) เผื่ออยากให้แก้รหัสสาขาได้ด้วย
        BranchName: data.name,
        IsActive: data.isActive, 
      }
    });
  }

  // ==========================================
  // 4. ดึงข้อมูลแค่ 1 สาขา (GET by ID)
  // ==========================================
  async findOneBranch(tenantId: number, branchId: number) {
    const branch = await this.prisma.sysBranches.findUnique({
      where: { TenantID_BranchID: { TenantID: tenantId, BranchID: branchId } }
    });

    // ถ้าหาไม่เจอ ให้โยน Error 404
    if (!branch) {
      throw new NotFoundException(`ไม่พบสาขารหัส ${branchId} ในระบบ`);
    }

    // ถ้าเจอ ก็ส่งข้อมูลกลับไป
    return {
      id: branch.BranchID,
      code: branch.BranchCode,
      name: branch.BranchName,
      status: branch.IsActive ? 'ACTIVE' : 'INACTIVE'
    };
  }
}