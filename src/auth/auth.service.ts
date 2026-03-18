import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  // 1. ตรวจสอบ Username และ Password
  async validateUser(tenantId: number, username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(tenantId, username);
    
    // ใช้ bcrypt.compare เพื่อเทียบรหัสผ่านที่รับมา กับ Hash ใน Database
    if (user && await bcrypt.compare(pass, user.PasswordHash)) {
      const { PasswordHash, ...result } = user; // ลบรหัสผ่านทิ้งก่อนส่งข้อมูลกลับ
      return result;
    }
    return null; // ถ้ารหัสผิดให้คืนค่า null
  }

  // 2. สร้าง JWT Token แจกให้ผู้ใช้งาน
  async login(user: any, tenantId: number) {
    // ข้อมูลที่จะฝังลงไปใน Token (Payload)
    const payload = { 
      username: user.Username, 
      sub: user.UserID, // ปกติ JWT จะใช้ 'sub' (subject) เก็บ ID ผู้ใช้
      tenantId: tenantId,
      fullName: user.FullName
    };

    return {
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      access_token: this.jwtService.sign(payload), // สร้าง Token ออกมา!
      user: {
        id: user.UserID,
        username: user.Username,
        fullName: user.FullName,
        email: user.Email
      }
    };
  }
}