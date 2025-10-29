import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ScenarioService } from './scenario.service';

@Controller('scenario')
export class ScenarioController {
  constructor(private readonly service: ScenarioService) {}

  @Get()
  getScenario(@Query('id') id: string) {
    return this.service.getScenario(id);
  }

  @Get('turbines')
  getTurbines(
    @Query('scenarioId') scenarioId: string,
    @Query('after') after?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'id' | 'x' | 'y',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.getTurbines(scenarioId, {
      after,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Post('turbines/move')
  @HttpCode(200)
  moveTurbine(
    @Body() body: { scenarioId: string; id: string; x: number; y: number },
  ) {
    return this.service.moveTurbine(body.scenarioId, body.id, body.x, body.y);
  }

  @Post('turbines/add')
  addTurbine(
    @Body()
    body: {
      scenarioId: string;
      x: number;
      y: number;
      hubHeight: number;
      rotorD: number;
    },
  ) {
    return this.service.addTurbine(body.scenarioId, {
      x: body.x,
      y: body.y,
      hubHeight: body.hubHeight,
      rotorD: body.rotorD,
    });
  }

  @Post('turbines/delete')
  @HttpCode(200)
  deleteTurbine(@Body() body: { scenarioId: string; id: string }) {
    return this.service.deleteTurbine(body.scenarioId, body.id);
  }

  @Post('calc')
  @HttpCode(200)
  calculate(@Body() body: { scenarioId: string }) {
    return this.service.calculate(body.scenarioId);
  }

  @Get('results/latest')
  getLatestResult(@Query('scenarioId') scenarioId: string) {
    return this.service.getLatestResult(scenarioId);
  }

  @Get('versions')
  getVersions(@Query('scenarioId') scenarioId: string) {
    return this.service.getVersions(scenarioId);
  }

  @Post('versions/restore')
  @HttpCode(200)
  restoreVersion(@Body() body: { scenarioId: string; version: number }) {
    return this.service.restoreVersion(body.scenarioId, body.version);
  }

  @Get('diff/prev')
  getDiff(@Query('scenarioId') scenarioId: string) {
    return this.service.getDiff(scenarioId);
  }
}
