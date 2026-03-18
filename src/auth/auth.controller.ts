import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any
  ) {
    if (!tenantId) throw new UnauthorizedException('Tenant ID is required');
    if (!body.username || !body.password) {
      throw new BadRequestException('กรุณาระบุ username และ password ให้ครบถ้วน');
    }

    // ส่งไปให้ Service ตรวจสอบ
    const user = await this.authService.validateUser(Number(tenantId), body.username, body.password);
    
    if (!user) {
      throw new UnauthorizedException('Username หรือ Password ไม่ถูกต้อง!');
    }

    // ถ้าผ่าน ให้แจก Token
    return this.authService.login(user, Number(tenantId));
  }
}