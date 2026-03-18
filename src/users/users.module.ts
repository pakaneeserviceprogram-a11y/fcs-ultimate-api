import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // <--- สำคัญ: ต้อง export Service นี้ เพื่อให้ AuthModule เรียกใช้งานฟังก์ชัน findByUsername ได้ในอนาคต
})
export class UsersModule {}