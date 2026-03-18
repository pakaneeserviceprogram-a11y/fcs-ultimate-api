import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // ดึง Token จาก Header 'Authorization: Bearer <token>'
      ignoreExpiration: false, // ห้ามใช้ Token ที่หมดอายุแล้ว
      secretOrKey: 'FCS_ULTIMATE_SECRET_KEY_2026', // รหัสลับสำหรับแกะ Token (ของจริงควรย้ายไปไว้ในไฟล์ .env)
    });
  }

  async validate(payload: any) {
    // ข้อมูลใน payload นี้จะถูกดึงไปใช้ต่อใน Controller (เช่น เช็คสิทธิ์)
    return { userId: payload.sub, username: payload.username, tenantId: payload.tenantId };
  }
}