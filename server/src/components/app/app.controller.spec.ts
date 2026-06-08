import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    process.env.APP_NAME = 'ecommerce-app';
    process.env.APP_VERSION = 'v1.0.0';
    process.env.APP_ENV = 'blue';

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the Blue-Green deployment landing page', () => {
      expect(appController.getHello()).toContain('Blue-Green Deployment');
    });
  });

  describe('version', () => {
    it('should return deployment version metadata', () => {
      expect(appController.getVersion()).toEqual(
        expect.objectContaining({
          app: 'ecommerce-app',
          version: 'v1.0.0',
          environment: 'blue',
          status: 'ok',
        }),
      );
    });
  });
});
