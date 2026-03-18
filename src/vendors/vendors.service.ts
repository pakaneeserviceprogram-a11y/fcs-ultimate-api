import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. ดึงรายการร้านค้า
  // ==========================================
  async findAllVendors(tenantId: number) {
    try {
      const vendors = await this.prisma.vendors.findMany({
        where: { TenantID: tenantId },
        include: { _count: { select: { Products: true } } }
      });

      return vendors.map(v => ({
        id: v.VendorID,
        name: v.VendorName,
        branch: 'Main Canteen', 
        gp: Number(v.GPSharePercent || 0),
        productCount: v._count.Products, 
        status: v.IsActive ? 'ACTIVE' : 'INACTIVE'
      }));
    } catch (error) {
      throw new InternalServerErrorException('ไม่สามารถดึงข้อมูลร้านค้าได้: ' + error.message);
    }
  }

  // ==========================================
  // 2. ดึงแคตตาล็อกสินค้าทั้งหมด 
  // ==========================================
  async findAllProducts(tenantId: number, page: number = 1, limit: number = 20, search: string = '', vendorId?: string) {
    const skip = (page - 1) * limit;
    
    const whereCondition: any = { TenantID: tenantId };
    if (search) {
      whereCondition.OR = [
        { ProductCode: { contains: search } },
        { ProductName: { contains: search } }
      ];
    }
    if (vendorId) {
      whereCondition.VendorID = vendorId;
    }

    const [products, totalItems] = await Promise.all([
      this.prisma.products.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        include: { Vendors: true },
        orderBy: { ProductID: 'desc' } 
      }),
      this.prisma.products.count({ where: whereCondition })
    ]);

    const data = products.map(p => ({
      id: p.ProductID.toString(),
      code: p.ProductCode,
      name: p.ProductName,
      category: p.Category || 'ทั่วไป',
      vendor: p.Vendors?.VendorName || 'ไม่ระบุร้านค้า',
      vendorId: p.VendorID,
      price: Number(p.Price),
      status: p.IsActive ? 'ACTIVE' : 'INACTIVE',
      imageUrl: p.ImageURL,
      // 💡 ส่งสถานะเมนูยืนพื้น กลับไปให้ Frontend แสดง Badge
      isAlwaysAvailable: p.IsAlwaysAvailable === true 
    }));

    return {
      data: data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  // =====================================
  // 1. ดึงข้อมูลร้านค้า 1 ร้าน
  // =====================================
  async findOneVendor(tenantId: number, vendorId: string) {
    const vendor = await this.prisma.vendors.findFirst({
      where: { TenantID: tenantId, VendorID: vendorId },
    });
    
    if (!vendor) throw new BadRequestException('ไม่พบข้อมูลร้านค้านี้');

    return {
      id: vendor.VendorID,
      name: vendor.VendorName,
      gp: Number(vendor.GPSharePercent),
      status: vendor.IsActive ? 'ACTIVE' : 'INACTIVE'
    };
  }

  // =====================================
  // 2. ดึงข้อมูลสินค้า 1 รายการ
  // =====================================
  async findOneProduct(tenantId: number, productCode: string) {
    const product = await this.prisma.products.findFirst({
      where: { TenantID: tenantId, ProductCode: productCode },
      include: { Vendors: true }
    });

    if (!product) throw new BadRequestException('ไม่พบข้อมูลสินค้านี้');

    return {
      id: product.ProductID.toString(),
      code: product.ProductCode,
      name: product.ProductName,
      category: product.Category || 'ทั่วไป',
      vendor: product.Vendors?.VendorName || 'ไม่ระบุร้านค้า',
      vendorId: product.VendorID,
      price: Number(product.Price),
      status: product.IsActive ? 'ACTIVE' : 'INACTIVE',
      // 💡 ส่งค่ากลับไป
      isAlwaysAvailable: product.IsAlwaysAvailable === true 
    };
  }
  
  // ==========================================
  // 3. สร้างร้านค้าใหม่ (POST)
  // ==========================================
  async createVendor(tenantId: number, data: any) {
    const existing = await this.prisma.vendors.findUnique({
      where: { TenantID_VendorID: { TenantID: tenantId, VendorID: data.vendorId } }
    });
    if (existing) throw new BadRequestException(`รหัสร้านค้า ${data.vendorId} มีในระบบแล้ว`);

    return this.prisma.vendors.create({
      data: {
        TenantID: tenantId,
        VendorID: data.vendorId,
        VendorName: data.name,
        GPSharePercent: data.gp,
        IsActive: true,
      }
    });
  }

  // ==========================================
  // 4. แก้ไขข้อมูลร้านค้า / ระงับร้านค้า (PATCH)
  // ==========================================
  async updateVendor(tenantId: number, vendorId: string, data: any) {
    return this.prisma.vendors.update({
      where: { TenantID_VendorID: { TenantID: tenantId, VendorID: vendorId } },
      data: {
        VendorName: data.name,
        GPSharePercent: data.gp,
        IsActive: data.isActive, 
      }
    });
  }

  // ==========================================
  // 5. สร้างสินค้าใหม่ (POST)
  // ==========================================
  async createProduct(tenantId: number, data: any, imageUrl: string | null) {
    const existing = await this.prisma.products.findUnique({
      where: { TenantID_ProductCode: { TenantID: tenantId, ProductCode: data.code } }
    });
    if (existing) throw new BadRequestException(`รหัสสินค้า ${data.code} มีในระบบแล้ว`);

    const newProduct = await this.prisma.products.create({
      data: {
        TenantID: tenantId,
        VendorID: data.vendorId,
        ProductCode: data.code,
        ProductName: data.name,
        Category: data.category,
        Price: Number(data.price),
        IsActive: data.isActive === 'true' || data.isActive === true,
        // 💡 แปลงค่าเป็น Boolean ก่อนเซฟลงฐานข้อมูล
        IsAlwaysAvailable: data.isAlwaysAvailable === 'true' || data.isAlwaysAvailable === true,
        ImageURL: imageUrl 
      }
    });

    return { ...newProduct, ProductID: newProduct.ProductID.toString() }; 
  }

  // ==========================================
  // 6. แก้ไขข้อมูลสินค้า / ระงับสินค้า (PATCH)
  // ==========================================
  async updateProduct(tenantId: number, productCode: string, data: any, imageUrl: string | null) {
    const updateData: any = {
      ProductName: data.name,
      Category: data.category,
      Price: Number(data.price),
      IsActive: data.isActive === 'true' || data.isActive === true,
      // 💡 อัปเดตค่าลงฐานข้อมูล
      IsAlwaysAvailable: data.isAlwaysAvailable === 'true' || data.isAlwaysAvailable === true,
    };

    if (imageUrl) {
      updateData.ImageURL = imageUrl;
    }

    return this.prisma.products.update({
      where: { TenantID_ProductCode: { TenantID: tenantId, ProductCode: productCode } },
      data: updateData
    });
  }
}