import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Editor3D } from './Editor3D';
import { TurbineTable } from './TurbineTable';
import { ResultsPanel } from './ResultsPanel';
import { useWs } from './useWs';
import { Turbine } from '@/types';

interface ScenarioViewProps {
  scenarioId: string;
}

export function ScenarioView({ scenarioId }: ScenarioViewProps) {
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [calcStatus, setCalcStatus] = useState<string>('idle');
  const [aepMWh, setAepMWh] = useState<number | null>(null);

  useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => api.getScenario(scenarioId),
  });

  const { data: initialTurbines } = useQuery({
    queryKey: ['turbines', scenarioId],
    queryFn: () => api.getTurbines(scenarioId, { limit: 10000 }),
  });

  useMemo(() => {
    if (initialTurbines) {
      setTurbines(initialTurbines);
    }
  }, [initialTurbines]);

  const wsHandlers = useMemo(
    () => ({
      onLayoutChanged: (data: any) => {
        const { changes } = data;

        setTurbines((prev) => {
          let updated = [...prev];

          changes.removed.forEach((id: string) => {
            updated = updated.filter((t) => t.id !== id);
          });

          changes.moved.forEach((m: any) => {
            const idx = updated.findIndex((t) => t.id === m.id);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], x: m.to.x, y: m.to.y };
            }
          });

          return updated;
        });
      },
      onCalcStatus: (data: any) => {
        setCalcStatus(data.status);
        if (data.AEP_MWh !== undefined) {
          setAepMWh(data.AEP_MWh);
        }
      },
    }),
    []
  );

  useWs(scenarioId, wsHandlers);

  const handleTurbineMove = useCallback(
    async (id: string, x: number, y: number) => {
      await api.moveTurbine(scenarioId, id, x, y);
    },
    [scenarioId]
  );

  const handleTurbineAdd = useCallback(
    async (x: number, y: number) => {
      await api.addTurbine(scenarioId, {
        x,
        y,
        hubHeight: 100,
        rotorD: 120,
      });
    },
    [scenarioId]
  );

  const handleTurbineDelete = useCallback(
    async (id: string) => {
      await api.deleteTurbine(scenarioId, id);
    },
    [scenarioId]
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Editor3D
          turbines={turbines}
          selectedIds={selectedIds}
          onMove={handleTurbineMove}
          onAdd={handleTurbineAdd}
          onSelect={setSelectedIds}
        />
      </div>
      <div
        style={{
          width: '600px',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
          borderLeft: '1px solid #333',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TurbineTable
            turbines={turbines}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onDelete={handleTurbineDelete}
          />
        </div>
        <div style={{ borderTop: '1px solid #333' }}>
          <ResultsPanel
            scenarioId={scenarioId}
            calcStatus={calcStatus}
            aepMWh={aepMWh}
          />
        </div>
      </div>
    </div>
  );
}
