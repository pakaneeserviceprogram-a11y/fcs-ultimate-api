import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. สร้างผู้ใช้งานใหม่ (Register / Create User)
  // ==========================================
  async createUser(tenantId: number, data: any) {
    // 1. ตรวจสอบว่ามี Username นี้ในระบบขององค์กรนี้แล้วหรือยัง
    const existingUser = await this.prisma.appUsers.findFirst({
      where: { 
        TenantID: tenantId, 
        Username: data.username 
      },
    });

    if (existingUser) {
      throw new ConflictException(`Username '${data.username}' นี้ถูกใช้งานแล้ว`);
    }

    try {
      // 2. เข้ารหัสผ่านด้วย bcrypt (Salt 10 rounds คือมาตรฐานที่ปลอดภัยและเร็วพอ)
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

     // 3. บันทึกข้อมูลลงตาราง AppUsers
     const newUser = await this.prisma.appUsers.create({
        data: {
          TenantID: tenantId,
          Username: data.username,
          PasswordHash: hashedPassword,
          FullName: data.fullName, // <--- ใช้ฟิลด์ใหม่ได้เลย
          Email: data.email,       // <--- ใช้ฟิลด์ใหม่ได้เลย
          IsActive: true, 
        },
      });

      // 4. (ทางเลือก) ถ้ามีการส่ง RoleID มาด้วย ให้ผูก Role ในตาราง AppUserRoles
      if (data.roleId) {
        await this.prisma.appUserRoles.create({
          data: {
            TenantID: tenantId, // <--- เพิ่มบรรทัดนี้เข้าไปครับ
            UserID: newUser.UserID,
            RoleID: data.roleId,
          }
        });
      }

      // 5. ลบฟิลด์ PasswordHash ออกก่อนส่งข้อมูลกลับไปให้ Frontend (เพื่อความปลอดภัย)
      const { PasswordHash, ...result } = newUser;
      
      return {
        success: true,
        message: 'สร้างบัญชีผู้ใช้งานสำเร็จ',
        data: result,
      };

    } catch (error) {
      throw new InternalServerErrorException('เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน: ' + error.message);
    }
  }

  // ==========================================
  // 2. ดึงข้อมูลผู้ใช้งาน (ใช้ตอนทำระบบ Login ในอนาคต)
  // ==========================================
  async findByUsername(tenantId: number, username: string) {
    return this.prisma.appUsers.findFirst({
      where: { 
        TenantID: tenantId, 
        Username: username,
        IsActive: true // อนุญาตเฉพาะคนที่สถานะ ACTIVE เท่านั้น
      },
    });
  }
}