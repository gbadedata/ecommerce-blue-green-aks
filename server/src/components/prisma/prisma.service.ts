import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly dbLogging: boolean;
  private readonly slowQueryThreshold: number;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('DATABASE_URL'),
    });

    const dbLogging = configService.get<string>('DB_LOGGING') === 'true';

    super({
      adapter,
      log: dbLogging
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'info' },
          ]
        : ['error'],
    });

    this.dbLogging = dbLogging;
    this.slowQueryThreshold =
      Number(configService.get<number>('SLOW_QUERY_THRESHOLD_')) || 200;
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
  }

  async onModuleInit() {
    await this.$connect();

    if (!this.dbLogging) return;

    this.logger.log('Database query logging is enabled');

    this.$on('query' as never, (event: any) => {
      const isSlow = event.duration >= this.slowQueryThreshold;

      if (this.isProduction) {
        // Production: Log only slow queries
        const message = `Query executed in ${event.duration}ms || ${event.query}`;

        if (isSlow) {
          this.logger.warn(
            `SLOW QUERY: ${event.duration}ms >= ${this.slowQueryThreshold}ms`,
          );
        } else {
          this.logger.debug(message);
        }
      } else {
        // Development: Log all queries with duration
        const message = `Query: ${event.query}\n\nParams: [hidden]\n\nDuration: ${event.duration}ms`;

        if (isSlow) {
          this.logger.warn(
            `Slow Query (${event.duration}ms >= ${this.slowQueryThreshold}ms)\n${message}`,
          );
        } else {
          this.logger.debug(message);
        }
      }
    });

    this.$on('error' as never, (event: any) => {
      this.logger.error(`Prisma Error: ${event.message}`);
    });

    this.$on('warn' as never, (event: any) => {
      this.logger.warn(`Prisma Warning: ${event.message}`);
    });

    this.$on('info' as never, (event: any) => {
      if (!this.isProduction) {
        this.logger.log(`Prisma Info: ${event.message}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
