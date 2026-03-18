import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // นำเข้า UsersModule เพื่อใช้หาข้อมูลคน
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: 'FCS_ULTIMATE_SECRET_KEY_2026', // ต้องตรงกับใน jwt.strategy.ts
      signOptions: { expiresIn: '8h' }, // ให้ Token มีอายุ 8 ชั่วโมง (พอดีกะทำงาน)
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}