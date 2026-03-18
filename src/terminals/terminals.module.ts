import { Module } from '@nestjs/common';
import { TerminalsController } from './terminals.controller';
import { TerminalsService } from './terminals.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TerminalsController],
  providers: [TerminalsService, PrismaService],
})
export class TerminalsModule {}