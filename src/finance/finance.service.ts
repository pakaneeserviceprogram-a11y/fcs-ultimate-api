import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // สรุปยอดขายและคำนวณรอบบิลให้ร้านค้า (Settlement)
  // ==========================================
  async getSettlementReport(tenantId: number, startDate: string, endDate: string) {
    try {
      // 1. ดึงข้อมูลร้านค้าทั้งหมดที่ Active พร้อมกับ "ยอดขาย (SalesOrders)" ในช่วงวันที่กำหนด
      const vendors = await this.prisma.vendors.findMany({
        where: { TenantID: tenantId, IsActive: true },
        include: {
          SalesOrders: {
            where: {
              OrderDate: {
                gte: new Date(`${startDate}T00:00:00.000Z`), // ตั้งแต่เริ่มวัน
                lte: new Date(`${endDate}T23:59:59.999Z`),   // จนถึงสิ้นวัน
              },
              // Status: 'COMPLETED' // 💡 ถ้ามีฟิลด์ Status บิลที่สำเร็จ ให้เอาคอมเมนต์ออกครับ
            }
          }
        }
      });

      // 2. คำนวณตัวเลขรายร้านค้า (Vendor Level)
      const details = vendors.map(vendor => {
        // หาผลรวมยอดขายทั้งหมด (Gross Sales) ของร้านนี้
        const grossSales = vendor.SalesOrders.reduce((sum, order) => {
          // สมมติว่ายอดเงินใน Database ชื่อ TotalAmount
          return sum + Number(order['TotalAmount'] || 0); 
        }, 0);

        // คำนวณยอดหักเข้าศูนย์อาหาร (GP Deduction)
        const gpRate = Number(vendor.GPSharePercent || 0);
        const gpDeduction = (grossSales * gpRate) / 100;

        // คำนวณยอดเงินที่ต้องโอนให้ร้านค้า (Net Payable)
        const netPayable = grossSales - gpDeduction;

        return {
          vendorId: vendor.VendorID,
          vendorName: vendor.VendorName,
          totalTransactions: vendor.SalesOrders.length, // จำนวนบิลทั้งหมด
          grossSales: grossSales, // ยอดขายรวม
          gpRate: gpRate, // เปอร์เซ็นต์ GP
          gpDeduction: gpDeduction, // ยอดหัก GP
          netPayable: netPayable // ยอดที่ต้องจ่ายคืนร้าน
        };
      });

      // 3. คำนวณภาพรวมของทั้งศูนย์อาหาร (Grand Total Level)
      const summary = {
        totalGrossSales: details.reduce((sum, r) => sum + r.grossSales, 0),
        totalGpRevenue: details.reduce((sum, r) => sum + r.gpDeduction, 0), // รายได้ศูนย์อาหาร
        totalNetPayable: details.reduce((sum, r) => sum + r.netPayable, 0) // รายจ่ายศูนย์อาหาร (คืนร้าน)
      };

      return {
        success: true,
        dateRange: { startDate, endDate },
        summary: summary,
        details: details
      };

    } catch (error) {
      throw new InternalServerErrorException('เกิดข้อผิดพลาดในการคำนวณยอด: ' + error.message);
    }
  }
}