import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service'; // อย่าลืมเช็ค path ของ PrismaService ให้ถูกต้องตามโปรเจกต์ของคุณ

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService, PrismaService],
})
export class PromotionsModule {}