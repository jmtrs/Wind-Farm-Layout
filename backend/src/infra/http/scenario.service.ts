import { Injectable } from '@nestjs/common';
import { CalculateYieldUseCase } from '@/core/use-cases/calculate-yield.use-case';
import { SaveSnapshotUseCase } from '@/core/use-cases/save-snapshot.use-case';
import { DiffWithPrevUseCase } from '@/core/use-cases/diff-with-prev.use-case';
import { Turbine } from '@/core/entities/turbine.entity';
import { ScenarioRepositoryImpl } from '../persistence/scenario.repository.impl';
import { RedisCacheService } from '../cache/redis-cache.service';
import { WsGateway } from '../ws/ws.gateway';

@Injectable()
export class ScenarioService {
  private readonly calculateYield: CalculateYieldUseCase;
  private readonly saveSnapshot: SaveSnapshotUseCase;
  private readonly diffWithPrev: DiffWithPrevUseCase;
  private calcTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: ScenarioRepositoryImpl,
    private readonly cache: RedisCacheService,
    private readonly wsGateway: WsGateway,
  ) {
    this.calculateYield = new CalculateYieldUseCase();
    this.saveSnapshot = new SaveSnapshotUseCase(repository);
    this.diffWithPrev = new DiffWithPrevUseCase(repository);
  }

  async getScenario(id: string) {
    return this.repository.findById(id);
  }

  async getTurbines(scenarioId: string, query: any) {
    return this.repository.findTurbines(scenarioId, query);
  }

  async moveTurbine(scenarioId: string, id: string, x: number, y: number) {
    const turbines = await this.repository.findTurbines(scenarioId, { limit: 1000 });
    const turbine = turbines.find((t) => t.id === id);
    if (!turbine) throw new Error('Turbine not found');

    const oldPos = { x: turbine.x, y: turbine.y };
    turbine.x = x;
    turbine.y = y;

    await this.repository.updateTurbine(turbine);

    this.wsGateway.broadcastToScenario(scenarioId, 'layout_changed', {
      scenarioId,
      version: 0,
      changes: {
        added: [],
        removed: [],
        moved: [{ id, from: oldPos, to: { x, y } }],
      },
    });

    this.scheduleCalculation(scenarioId);

    return { version: 0 };
  }

  async addTurbine(
    scenarioId: string,
    data: { x: number; y: number; hubHeight: number; rotorD: number },
  ) {
    const scenario = await this.repository.findById(scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    const turbine = new Turbine(
      `t${Date.now()}`,
      scenarioId,
      data.x,
      data.y,
      data.hubHeight,
      data.rotorD,
      scenario.turbines[0]?.powerCurve || [],
    );

    await this.repository.saveTurbine(turbine);

    this.wsGateway.broadcastToScenario(scenarioId, 'layout_changed', {
      scenarioId,
      version: 0,
      changes: {
        added: [{ id: turbine.id, x: data.x, y: data.y }],
        removed: [],
        moved: [],
      },
    });

    this.scheduleCalculation(scenarioId);

    return { id: turbine.id, version: 0 };
  }

  async deleteTurbine(scenarioId: string, id: string) {
    await this.repository.deleteTurbine(id);

    this.wsGateway.broadcastToScenario(scenarioId, 'layout_changed', {
      scenarioId,
      version: 0,
      changes: {
        added: [],
        removed: [id],
        moved: [],
      },
    });

    this.scheduleCalculation(scenarioId);

    return { version: 0 };
  }

  async calculate(scenarioId: string) {
    this.wsGateway.broadcastToScenario(scenarioId, 'calc_status', {
      scenarioId,
      status: 'queued',
    });

    const scenario = await this.repository.findById(scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    const hash = this.calculateYield.calculateHash(
      scenario.turbines,
      scenario.windRose,
    );
    const cacheKey = `yield:${scenarioId}:${hash}`;

    let result = await this.cache.get(cacheKey);

    if (!result) {
      this.wsGateway.broadcastToScenario(scenarioId, 'calc_status', {
        scenarioId,
        status: 'running',
      });

      result = this.calculateYield.execute(scenario.turbines, scenario.windRose);
      await this.cache.set(cacheKey, result, 600);
    }

    this.wsGateway.broadcastToScenario(scenarioId, 'calc_status', {
      scenarioId,
      status: 'done',
      AEP_MWh: result.AEP_MWh,
    });

    return result;
  }

  async getLatestResult(scenarioId: string) {
    const scenario = await this.repository.findById(scenarioId);
    if (!scenario) return null;

    const hash = this.calculateYield.calculateHash(
      scenario.turbines,
      scenario.windRose,
    );
    return this.cache.get(`yield:${scenarioId}:${hash}`);
  }

  async getVersions(scenarioId: string) {
    return this.repository.getVersions(scenarioId);
  }

  async restoreVersion(scenarioId: string, version: number) {
    await this.saveSnapshot.restore(scenarioId, version);
    this.scheduleCalculation(scenarioId);
    return { restored: version };
  }

  async getDiff(scenarioId: string) {
    return this.diffWithPrev.execute(scenarioId);
  }

  private scheduleCalculation(scenarioId: string) {
    if (this.calcTimeout) {
      clearTimeout(this.calcTimeout);
    }

    this.calcTimeout = setTimeout(() => {
      this.calculate(scenarioId).catch(console.error);
      this.calcTimeout = null;
    }, 300);
  }
}
