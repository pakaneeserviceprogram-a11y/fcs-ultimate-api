import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: "success",
      message: "FCS API v3 Ready",
      version: "3.0.0",
      description: "Financial Production Specification"
    };
  }
}