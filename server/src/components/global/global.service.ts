import { Injectable } from '@nestjs/common';

import { CreateErrorLogsDto } from './dto/create-error.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalService {
  constructor(private prisma: PrismaService) {}

  async logError(dto: CreateErrorLogsDto): Promise<void> {
    const { level, name, message, stack, context } = dto;

    const error = {
      level,
      name,
      message,
      stack,
      context,
    };

    console.log(error);
    await this.prisma.errorLog.create({
      data: error,
    });
  }
}
