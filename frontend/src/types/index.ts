export interface Turbine {
  id: string;
  scenarioId: string;
  x: number;
  y: number;
  hubHeight: number;
  rotorD: number;
  powerCurve: PowerCurvePoint[];
  aep?: number;
  wakeDeficit?: number;
}

export interface PowerCurvePoint {
  v: number;
  p: number;
}

export interface Scenario {
  id: string;
  name: string;
  windRose: WindRose;
}

export interface WindRose {
  bins: WindBin[];
}

export interface WindBin {
  direction: number;
  speed: number;
  frequency: number;
}

export interface YieldResult {
  AEP_MWh: number;
  turbineYields: Array<{
    turbineId: string;
    AEP_MWh: number;
    wakeDeficit: number;
  }>;
}

export interface LayoutChange {
  added: Array<{ id: string; x: number; y: number }>;
  removed: string[];
  moved: Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
}

export interface ScenarioVersion {
  version: number;
  createdAt: string;
}
