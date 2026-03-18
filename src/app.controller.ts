import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // <--- ลบ 'api/v3' ออก ปล่อยว่างไว้
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // ตัวนี้จะหมายถึง /api/v3 ทันทีเพราะมี Global Prefix
  getHello() {
    return this.appService.getHello();
  }
}