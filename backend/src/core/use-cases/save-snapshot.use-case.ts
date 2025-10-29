import { ScenarioRepository } from '../ports/scenario.repository';
import { Turbine } from '../entities/turbine.entity';

export interface SnapshotData {
  version: number;
  turbines: Array<{
    id: string;
    x: number;
    y: number;
    hubHeight: number;
    rotorD: number;
    powerCurve: any;
  }>;
}

export class SaveSnapshotUseCase {
  constructor(private readonly repository: ScenarioRepository) {}

  async execute(scenarioId: string, turbines: Turbine[]): Promise<number> {
    const snapshot = {
      turbines: turbines.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        hubHeight: t.hubHeight,
        rotorD: t.rotorD,
        powerCurve: t.powerCurve,
      })),
    };

    return await this.repository.saveSnapshotAtomic(scenarioId, snapshot);
  }

  async restore(scenarioId: string, version: number): Promise<void> {
    const snapshot = await this.repository.getSnapshot(scenarioId, version);
    if (!snapshot) {
      throw new Error(`Version ${version} not found`);
    }

    const currentTurbines = await this.repository.findTurbines(scenarioId, {
      limit: 100000,
    });

    for (const turbine of currentTurbines) {
      await this.repository.deleteTurbine(turbine.id);
    }

    for (const turbineData of snapshot.turbines) {
      const turbine = new Turbine(
        turbineData.id,
        scenarioId,
        turbineData.x,
        turbineData.y,
        turbineData.hubHeight,
        turbineData.rotorD,
        turbineData.powerCurve,
      );
      await this.repository.saveTurbine(turbine);
    }
  }
}
