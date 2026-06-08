import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  it('should return Prometheus metrics text including app info', async () => {
    process.env.APP_NAME = 'ecommerce-app';
    process.env.APP_VERSION = 'v1.0.0';
    process.env.APP_ENV = 'blue';

    const controller = new MetricsController();
    const metrics = await controller.getMetrics();

    expect(metrics).toContain('ecommerce_app_info');
    expect(metrics).toContain('version="v1.0.0"');
    expect(metrics).toContain('environment="blue"');
  });
});
