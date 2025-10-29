import { Scenario } from '../entities/scenario.entity';
import { Turbine } from '../entities/turbine.entity';

export interface TurbineQueryOptions {
  after?: string;
  limit?: number;
  sortBy?: 'id' | 'x' | 'y';
  sortOrder?: 'asc' | 'desc';
}

export interface ScenarioRepository {
  findById(id: string): Promise<Scenario | null>;
  save(scenario: Scenario): Promise<void>;
  
  findTurbines(scenarioId: string, options?: TurbineQueryOptions): Promise<Turbine[]>;
  saveTurbine(turbine: Turbine): Promise<void>;
  updateTurbine(turbine: Turbine): Promise<void>;
  deleteTurbine(id: string): Promise<void>;
  
  saveSnapshot(scenarioId: string, version: number, snapshot: any): Promise<void>;
  getLatestVersion(scenarioId: string): Promise<number>;
  getSnapshot(scenarioId: string, version: number): Promise<any | null>;
  getVersions(scenarioId: string): Promise<Array<{ version: number; createdAt: Date }>>;
}
