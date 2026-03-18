import { Module } from '@nestjs/common';
import { MenuSchedulesService } from './menu-schedules.service';
import { MenuSchedulesController } from './menu-schedules.controller';
import { PrismaService } from '../prisma/prisma.service'; // หรือนำเข้า PrismaModule ถ้าคุณทำเป็น Module ไว้

@Module({
  controllers: [MenuSchedulesController],
  providers: [MenuSchedulesService, PrismaService],
})
export class MenuSchedulesModule {}