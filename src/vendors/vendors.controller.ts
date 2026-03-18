import { Controller, Get, Post, Patch, Body, Param, Query, Headers, UnauthorizedException,
  UseInterceptors, UploadedFile } from '@nestjs/common';
import { BadRequestException, UseGuards } from '@nestjs/common'; // <--- เพิ่ม Query ตรงนี้ครับ
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs'; // 💡 ต้องมีบรรทัดนี้ครับ ระบบถึงจะรู้จัก fs.existsSync
// 💡 ฟังก์ชันตั้งชื่อไฟล์รูปอัตโนมัติ (กันชื่อซ้ำ)

// 💡 2. เพิ่มโค้ดเช็คและสร้างโฟลเดอร์อัตโนมัติ
const uploadPath = './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
const storageOptions = diskStorage({
  destination: './uploads', // เก็บไฟล์ไว้ในโฟลเดอร์ uploads ของโปรเจกต์
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  }
});
@Controller('vendors')
//@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ================== โซนสินค้า (Products) ================== 
  // 💡 ต้องวาง 'products' ไว้ข้างบนสุด เพื่อไม่ให้ชนกับ ':id' ของร้านค้า

  @Get('products')
  async getProducts(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search: string = '',
    @Query('vendorId') vendorId: string = '' // 💡 รับ vendorId เพิ่ม
  ) {
    return this.vendorsService.findAllProducts(Number(tenantId), Number(page), Number(limit), search);
  }

  @Post('products')
  @UseInterceptors(FileInterceptor('image', { storage: storageOptions })) // 💡 สกัดไฟล์รูปชื่อ 'image'
  async createProduct(
    @Headers('x-tenant-id') tenantId: string, 
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File // 💡 รับไฟล์เข้ามา
  ) {
    // สร้าง URL รูปภาพ
    const imageUrl = file ? `http://localhost:3000/uploads/${file.filename}` : null;
    return this.vendorsService.createProduct(Number(tenantId), body, imageUrl);
  }

  @Get('products/:code')
  async getProductByCode(@Headers('x-tenant-id') tenantId: string, @Param('code') productCode: string) {
    return this.vendorsService.findOneProduct(Number(tenantId), productCode);
  }

  @Patch('products/:code')
  @UseInterceptors(FileInterceptor('image', { storage: storageOptions }))
  async updateProduct(
    @Headers('x-tenant-id') tenantId: string, 
    @Param('code') code: string, 
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    const imageUrl = file ? `http://localhost:3000/uploads/${file.filename}` : null;
    return this.vendorsService.updateProduct(Number(tenantId), code, body, imageUrl);
  }

  // ================== โซนร้านค้า (Vendors) ==================

  @Get()
  async getVendors(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID is required');
    return this.vendorsService.findAllVendors(Number(tenantId));
  }

  @Post()
  async createVendor(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.vendorsService.createVendor(Number(tenantId), body);
  }

  @Get(':id')
  async getVendorById(@Headers('x-tenant-id') tenantId: string, @Param('id') vendorId: string) {
    return this.vendorsService.findOneVendor(Number(tenantId), vendorId);
  }

  @Patch(':id')
  async updateVendor(@Headers('x-tenant-id') tenantId: string, @Param('id') vendorId: string, @Body() body: any) {
    return this.vendorsService.updateVendor(Number(tenantId), vendorId, body);
  }
}