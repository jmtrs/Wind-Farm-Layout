import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ScenarioController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/scenario (GET)', () => {
    return request(app.getHttpServer())
      .get('/scenario?id=default')
      .expect(200);
  });

  it('/scenario/turbines (GET)', () => {
    return request(app.getHttpServer())
      .get('/scenario/turbines?scenarioId=default&limit=10')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeLessThanOrEqual(10);
      });
  });

  it('/scenario/versions (GET)', () => {
    return request(app.getHttpServer())
      .get('/scenario/versions?scenarioId=default')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
