import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PrismaModule } from '../prisma/prisma.module'; // <--- สำคัญมาก ต้อง import ตัวนี้

@Module({
  imports: [PrismaModule], // <--- ใส่ใน array imports
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}