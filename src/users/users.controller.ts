import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async registerUser(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    if (!body.username || !body.password || !body.fullName) {
      throw new BadRequestException('ข้อมูลไม่ครบถ้วน จำเป็นต้องระบุ username, password และ fullName');
    }

    return this.usersService.createUser(Number(tenantId), body);
  }
}