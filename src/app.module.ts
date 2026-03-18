import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardsModule } from './cards/cards.module';
import { CardsnpxController } from './nest/cardsnpx/cardsnpx.controller';
import { PrismaModule } from './prisma/prisma.module';
// 1. นำเข้า MembersModule ที่นี่
import { MembersModule } from './members/members.module';
import { UsersModule } from './users/users.module'; // <--- เพิ่มบรรทัดนี้
import { AuthModule } from './auth/auth.module'; // <--- เพิ่มตัวนี้
import { VendorsModule } from './vendors/vendors.module'; // <--- 1. Import มา

import { WelfareModule } from './welfare/welfare.module'; // <--- 1. Import มา
import { BranchesModule } from './branches/branches.module'; // <--- 1. Import มา
import { FinanceModule } from './finance/finance.module';
import { PromotionsModule } from './promotions/promotions.module';
import { TerminalsModule } from './terminals/terminals.module'; // 💡 เพิ่มบรรทัดนี้
import { MenuSchedulesModule } from './menu-schedules/menu-schedules.module'; // 👈 1. Import Module เข้ามา
@Module({
  imports: [CardsModule,MembersModule, PrismaModule,UsersModule,
    AuthModule,VendorsModule,WelfareModule,BranchesModule,FinanceModule,
    PromotionsModule,TerminalsModule,MenuSchedulesModule ],
  controllers: [AppController, CardsnpxController],
  providers: [AppService],
})
export class AppModule {}
