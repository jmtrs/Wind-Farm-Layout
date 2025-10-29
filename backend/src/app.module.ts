import { Module } from '@nestjs/common';
import { PrismaService } from './infra/persistence/prisma.service';
import { ScenarioRepositoryImpl } from './infra/persistence/scenario.repository.impl';
import { RedisCacheService } from './infra/cache/redis-cache.service';
import { WsGateway } from './infra/ws/ws.gateway';
import { ScenarioController } from './infra/http/scenario.controller';
import { ScenarioService } from './infra/http/scenario.service';

@Module({
  imports: [],
  controllers: [ScenarioController],
  providers: [
    PrismaService,
    {
      provide: 'ScenarioRepository',
      useClass: ScenarioRepositoryImpl,
    },
    {
      provide: 'ResultCache',
      useClass: RedisCacheService,
    },
    WsGateway,
    ScenarioService,
    RedisCacheService,
    ScenarioRepositoryImpl,
  ],
})
export class AppModule {}
