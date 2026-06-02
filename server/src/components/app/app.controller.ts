import { Controller, Get, Head } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Head()
  headRoot() {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
