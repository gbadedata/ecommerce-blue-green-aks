import { Controller, Get, Header } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';

@Controller('api/v1/metrics')
export class MetricsController {
  private readonly registry: Registry;
  private readonly appInfo: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'ecommerce_',
    });

    this.appInfo = new Gauge({
      name: 'ecommerce_app_info',
      help: 'Application version and environment information',
      labelNames: ['app', 'version', 'environment'],
      registers: [this.registry],
    });

    this.appInfo.set(
      {
        app: process.env.APP_NAME || 'ecommerce-app',
        version: process.env.APP_VERSION || 'v1.0.0',
        environment: process.env.APP_ENV || 'blue',
      },
      1,
    );
  }

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
