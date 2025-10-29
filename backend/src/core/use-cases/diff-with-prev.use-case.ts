import { ScenarioRepository } from '../ports/scenario.repository';

export interface DiffResult {
  added: Array<{ id: string; x: number; y: number }>;
  removed: string[];
  moved: Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
}

export class DiffWithPrevUseCase {
  constructor(private readonly repository: ScenarioRepository) {}

  async execute(scenarioId: string): Promise<DiffResult | null> {
    const latestVersion = await this.repository.getLatestVersion(scenarioId);
    if (latestVersion < 2) return null;

    const current = await this.repository.getSnapshot(scenarioId, latestVersion);
    const previous = await this.repository.getSnapshot(
      scenarioId,
      latestVersion - 1,
    );

    if (!current || !previous) return null;

    const prevMap = new Map<string, { x: number; y: number }>(
      previous.turbines.map((t: any) => [t.id, { x: t.x, y: t.y }]),
    );
    const currMap = new Map<string, { x: number; y: number }>(
      current.turbines.map((t: any) => [t.id, { x: t.x, y: t.y }]),
    );

    const added: Array<{ id: string; x: number; y: number }> = [];
    const removed: string[] = [];
    const moved: Array<{
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }> = [];

    for (const [id, pos] of currMap) {
      if (!prevMap.has(id)) {
        added.push({ id, x: pos.x, y: pos.y });
      } else {
        const prevPos = prevMap.get(id)!;
        if (prevPos.x !== pos.x || prevPos.y !== pos.y) {
          moved.push({
            id,
            from: prevPos,
            to: pos,
          });
        }
      }
    }

    for (const id of prevMap.keys()) {
      if (!currMap.has(id)) {
        removed.push(id);
      }
    }

    return { added, removed, moved };
  }
}
