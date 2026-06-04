import { Module } from '@nestjs/common';

import { GlobalService } from './global.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [],
  providers: [GlobalService, PrismaService],
  imports: [],
})
export class GlobalModule {}
