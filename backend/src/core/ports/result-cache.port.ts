export interface YieldResult {
  AEP_MWh: number;
  turbineYields: Array<{
    turbineId: string;
    AEP_MWh: number;
    wakeDeficit: number;
  }>;
}

export interface ResultCache {
  get(key: string): Promise<YieldResult | null>;
  set(key: string, value: YieldResult, ttlSeconds?: number): Promise<void>;
}
