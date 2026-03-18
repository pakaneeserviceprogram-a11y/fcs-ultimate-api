import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TerminalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: number) {
    const terminals = await this.prisma.terminals.findMany({
      where: { TenantID: tenantId },
      include: { Vendors: true }, // ดึงชื่อร้านค้ามาด้วย
      orderBy: { TerminalID: 'asc' }
    });

    return terminals.map(t => ({
      id: t.TerminalID,
      name: t.TerminalName,
      type: t.TerminalType,
      vendorId: t.VendorID,
      vendorName: t.Vendors?.VendorName || null,
      isActive: t.IsActive,
      status: t.IsActive ? 'ONLINE' : 'OFFLINE'
    }));
  }

  async create(tenantId: number, data: any) {
    const existing = await this.prisma.terminals.findUnique({
      where: { TenantID_TerminalID: { TenantID: tenantId, TerminalID: data.id } }
    });

    if (existing) {
      throw new BadRequestException(`รหัสอุปกรณ์ ${data.id} มีในระบบแล้ว`);
    }

    return this.prisma.terminals.create({
      data: {
        TenantID: tenantId,
        TerminalID: data.id,
        TerminalName: data.name,
        TerminalType: data.type,
        VendorID: data.type === 'VENDOR' ? data.vendorId : null,
        IsActive: data.isActive
      }
    });
  }

  async update(tenantId: number, terminalId: string, data: any) {
    const existing = await this.prisma.terminals.findUnique({
      where: { TenantID_TerminalID: { TenantID: tenantId, TerminalID: terminalId } }
    });

    if (!existing) throw new NotFoundException('ไม่พบอุปกรณ์นี้ในระบบ');

    return this.prisma.terminals.update({
      where: { TenantID_TerminalID: { TenantID: tenantId, TerminalID: terminalId } },
      data: {
        TerminalName: data.name,
        TerminalType: data.type,
        VendorID: data.type === 'VENDOR' ? data.vendorId : null,
        IsActive: data.isActive
      }
    });
  }
}