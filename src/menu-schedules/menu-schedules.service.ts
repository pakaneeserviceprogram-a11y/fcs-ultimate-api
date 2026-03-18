import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuSchedulesService {
  constructor(private prisma: PrismaService) {}

  // 1. ดึงรายชื่อร้านค้า (สำหรับ Dropdown ฝั่งซ้าย)
  async getVendors(tenantId: number) {
    return this.prisma.vendors.findMany({
      where: { TenantID: tenantId, IsActive: true },
      select: { VendorID: true, VendorName: true }
    });
  }

  // 2. ดึงเฉพาะ "เมนูหมุนเวียน" ของร้านที่เลือก
  async getProducts(tenantId: number, vendorId?: string) {
    const whereClause: any = { 
      TenantID: tenantId, 
      IsActive: true, 
      // 💡 แก้ไขตรงนี้: ให้ดึงทั้ง false และ null (รองรับเมนูเก่าที่เคยสร้างไว้)
      OR: [
        { IsAlwaysAvailable: false },
        { IsAlwaysAvailable: null }
      ]
    };
    if (vendorId) whereClause.VendorID = vendorId;

    const products = await this.prisma.products.findMany({
      where: whereClause,
      select: { ProductID: true, ProductName: true, Category: true, Price: true, VendorID: true },
      orderBy: { Category: 'asc' }
    });

    return products.map(p => ({
      id: p.ProductID.toString(),
      name: p.ProductName,
      category: p.Category || 'ทั่วไป',
      price: Number(p.Price),
      vendorId: p.VendorID
    }));
  }

  // 3. ดึงตารางอาหารของวันที่เลือก และแยกร้านค้า
  async getSchedulesByDate(tenantId: number, dateStr: string, vendorId?: string) {
    const targetDate = new Date(dateStr);
    const whereClause: any = { TenantID: tenantId, TargetDate: targetDate };
    
    // 💡 ถ้าเลือกร้านค้า ให้ดึงตารางเฉพาะของร้านนั้น
    if (vendorId) whereClause.Products = { VendorID: vendorId };

    const schedules = await this.prisma.menuSchedules.findMany({
      where: whereClause,
      include: { Products: true }
    });

    // 💡 เพิ่ม ALL_DAY เข้ามาในผลลัพธ์
    const result = { ALL_DAY: [], BREAKFAST: [], LUNCH: [], DINNER: [] };
    schedules.forEach(s => {
      if (result[s.MealPeriod] && s.Products) {
        result[s.MealPeriod].push({
          id: s.Products.ProductID.toString(),
          name: s.Products.ProductName,
          category: s.Products.Category
        });
      }
    });
    return result;
  }

  // 4. บันทึกตารางอาหาร
  async saveBulkSchedule(tenantId: number, data: { date: string, period: string, productIds: string[], vendorId: string }) {
    const targetDate = new Date(data.date);
    
    // ลบของเก่าเฉพาะ "มื้อนั้น" และ "ร้านนั้น"
    const schedulesToDelete = await this.prisma.menuSchedules.findMany({
      where: { TenantID: tenantId, TargetDate: targetDate, MealPeriod: data.period, Products: { VendorID: data.vendorId } },
      select: { ScheduleID: true }
    });
    
    if (schedulesToDelete.length > 0) {
      const ids = schedulesToDelete.map(s => s.ScheduleID);
      await this.prisma.menuSchedules.deleteMany({ where: { ScheduleID: { in: ids } } });
    }

    // Insert ของใหม่
    if (data.productIds && data.productIds.length > 0) {
      const insertData = data.productIds.map(pid => ({
        TenantID: tenantId, TargetDate: targetDate, MealPeriod: data.period, ProductID: BigInt(pid), IsActive: true
      }));
      await this.prisma.menuSchedules.createMany({ data: insertData });
    }
    return { success: true };
  }
  
  // 5. คัดลอกตารางอาหาร (รองรับการ Copy ไปหลายๆ วันพร้อมกัน)
  async copyScheduleMultiple(tenantId: number, fromDateStr: string, targetDates: string[], vendorId: string) {
     const fromDate = new Date(fromDateStr);
     const sourceSchedules = await this.prisma.menuSchedules.findMany({
       where: { TenantID: tenantId, TargetDate: fromDate, Products: { VendorID: vendorId } }
     });
     
     if (sourceSchedules.length === 0) return { success: true };

     for (const tDateStr of targetDates) {
         const toDate = new Date(tDateStr);
         
         // ลบของเก่าในวันปลายทาง (เฉพาะร้านที่เลือก)
         const oldSchedules = await this.prisma.menuSchedules.findMany({
           where: { TenantID: tenantId, TargetDate: toDate, Products: { VendorID: vendorId } },
           select: { ScheduleID: true }
         });
         if (oldSchedules.length > 0) {
           await this.prisma.menuSchedules.deleteMany({ where: { ScheduleID: { in: oldSchedules.map(s => s.ScheduleID) } } });
         }

         // คัดลอกของใหม่ลงไป
         const insertData = sourceSchedules.map(s => ({
           TenantID: tenantId, TargetDate: toDate, MealPeriod: s.MealPeriod, ProductID: s.ProductID, IsActive: true
         }));
         await this.prisma.menuSchedules.createMany({ data: insertData });
     }
     return { success: true };
  }
}