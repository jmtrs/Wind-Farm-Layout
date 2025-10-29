import { Turbine, Scenario, YieldResult, ScenarioVersion, LayoutChange } from '@/types';

const API_BASE = '';

export const api = {
  getScenario: async (id: string): Promise<Scenario> => {
    const res = await fetch(`${API_BASE}/scenario?id=${id}`);
    return res.json();
  },

  getTurbines: async (
    scenarioId: string,
    params?: { after?: string; limit?: number; sortBy?: string; sortOrder?: string }
  ): Promise<Turbine[]> => {
    const query = new URLSearchParams({
      scenarioId,
      ...(params?.after && { after: params.after }),
      ...(params?.limit && { limit: String(params.limit) }),
      ...(params?.sortBy && { sortBy: params.sortBy }),
      ...(params?.sortOrder && { sortOrder: params.sortOrder }),
    });
    const res = await fetch(`${API_BASE}/scenario/turbines?${query}`);
    return res.json();
  },

  moveTurbine: async (scenarioId: string, id: string, x: number, y: number) => {
    const res = await fetch(`${API_BASE}/scenario/turbines/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, id, x, y }),
    });
    return res.json();
  },

  addTurbine: async (
    scenarioId: string,
    data: { x: number; y: number; hubHeight: number; rotorD: number }
  ) => {
    const res = await fetch(`${API_BASE}/scenario/turbines/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, ...data }),
    });
    return res.json();
  },

  deleteTurbine: async (scenarioId: string, id: string) => {
    const res = await fetch(`${API_BASE}/scenario/turbines/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, id }),
    });
    return res.json();
  },

  calculate: async (scenarioId: string): Promise<YieldResult> => {
    const res = await fetch(`${API_BASE}/scenario/calc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
    return res.json();
  },

  getLatestResult: async (scenarioId: string): Promise<YieldResult | null> => {
    const res = await fetch(`${API_BASE}/scenario/results/latest?scenarioId=${scenarioId}`);
    return res.json();
  },

  getVersions: async (scenarioId: string): Promise<ScenarioVersion[]> => {
    const res = await fetch(`${API_BASE}/scenario/versions?scenarioId=${scenarioId}`);
    return res.json();
  },

  restoreVersion: async (scenarioId: string, version: number) => {
    const res = await fetch(`${API_BASE}/scenario/versions/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, version }),
    });
    return res.json();
  },

  getDiff: async (scenarioId: string): Promise<LayoutChange | null> => {
    const res = await fetch(`${API_BASE}/scenario/diff/prev?scenarioId=${scenarioId}`);
    return res.json();
  },
};
