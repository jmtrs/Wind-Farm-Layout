import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ResultsPanelProps {
  scenarioId: string;
  calcStatus: string;
  aepMWh: number | null;
}

export function ResultsPanel({
  scenarioId,
  calcStatus,
  aepMWh,
}: ResultsPanelProps) {
  const [showVersions, setShowVersions] = useState(false);

  const { data: versions } = useQuery({
    queryKey: ['versions', scenarioId],
    queryFn: () => api.getVersions(scenarioId),
    enabled: showVersions,
  });

  const { data: diff } = useQuery({
    queryKey: ['diff', scenarioId],
    queryFn: () => api.getDiff(scenarioId),
    refetchInterval: false,
  });

  const handleRestore = async (version: number) => {
    if (confirm(`Restore to version ${version}?`)) {
      await api.restoreVersion(scenarioId, version);
      window.location.reload();
    }
  };

  const handleCalculate = async () => {
    await api.calculate(scenarioId);
  };

  return (
    <div style={{ padding: '16px', background: '#0a0a0a' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
          Results & Calculation
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <button onClick={handleCalculate} disabled={calcStatus === 'running'}>
            {calcStatus === 'running' ? 'Calculating...' : 'Calculate AEP'}
          </button>
          <div style={{ fontSize: '13px', color: '#888' }}>
            Status:{' '}
            <span
              style={{
                color:
                  calcStatus === 'done'
                    ? '#4a9eff'
                    : calcStatus === 'running'
                    ? '#ffaa44'
                    : '#666',
              }}
            >
              {calcStatus}
            </span>
          </div>
        </div>
        {aepMWh !== null && (
          <div
            style={{
              padding: '12px',
              background: '#1a1a1a',
              borderRadius: '4px',
              border: '1px solid #333',
            }}
          >
            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '4px' }}>
              Annual Energy Production
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a9eff' }}>
              {aepMWh.toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh
            </div>
          </div>
        )}
      </div>

      {diff && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Last Changes
          </h4>
          <div
            style={{
              fontSize: '12px',
              background: '#1a1a1a',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            {diff.added.length > 0 && (
              <div style={{ color: '#44ff88' }}>
                +{diff.added.length} added
              </div>
            )}
            {diff.removed.length > 0 && (
              <div style={{ color: '#ff4444' }}>
                -{diff.removed.length} removed
              </div>
            )}
            {diff.moved.length > 0 && (
              <div style={{ color: '#ffaa44' }}>
                ~{diff.moved.length} moved
              </div>
            )}
            {diff.added.length === 0 &&
              diff.removed.length === 0 &&
              diff.moved.length === 0 && (
                <div style={{ color: '#666' }}>No changes</div>
              )}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowVersions(!showVersions)}
          style={{ marginBottom: '8px' }}
        >
          {showVersions ? 'Hide' : 'Show'} Versions
        </button>
        {showVersions && versions && (
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              background: '#1a1a1a',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            {versions.map((v) => (
              <div
                key={v.version}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  marginBottom: '4px',
                  background: '#0a0a0a',
                  borderRadius: '3px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>v{v.version}</span>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleRestore(v.version)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: '#333',
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
