import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // 💡 1. Import ตัวนี้
import { join } from 'path';

// 💡 เพิ่ม 3 บรรทัดนี้ก่อนเข้าฟังก์ชัน bootstrap() เพื่อแก้ปัญหา BigInt ทั่วทั้งโปรเจกต์!
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
async function bootstrap() {
  // 💡 2. กำหนดประเภทให้แอปพลิเคชันเป็น NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. เปิด CORS เพื่อให้หน้าเว็บ Frontend (React) ยิง API เข้ามาได้
  
  app.enableCors();

  // 2. ตั้งค่า Prefix ให้ API ทุกเส้นขึ้นต้นด้วย /api/v3 อัตโนมัติ
  app.setGlobalPrefix('api/v3');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // รันเซิร์ฟเวอร์ที่ Port 3000 (หรือตามที่ตั้งใน .env)
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v3`);
}
bootstrap();