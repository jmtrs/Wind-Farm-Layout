import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';
import { Turbine } from '@/types';

interface TurbineTableProps {
  turbines: Turbine[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
}

const columnHelper = createColumnHelper<Turbine>();

export function TurbineTable({
  turbines,
  selectedIds,
  onSelect,
  onDelete,
}: TurbineTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(600);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        size: 40,
        header: () => (
          <input
            type="checkbox"
            checked={turbines.length > 0 && selectedIds.size === turbines.length}
            onChange={(e) => {
              if (e.target.checked) {
                onSelect(new Set(turbines.map((t) => t.id)));
              } else {
                onSelect(new Set());
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedIds);
              if (e.target.checked) {
                newSelected.add(row.original.id);
              } else {
                newSelected.delete(row.original.id);
              }
              onSelect(newSelected);
            }}
          />
        ),
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        size: 100,
        cell: (info) => (
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#aaa' }}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('x', {
        header: 'X',
        size: 75,
        cell: (info) => (
          <span style={{ fontFamily: 'monospace', color: '#ddd' }}>
            {Math.round(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('y', {
        header: 'Y',
        size: 75,
        cell: (info) => (
          <span style={{ fontFamily: 'monospace', color: '#ddd' }}>
            {Math.round(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('hubHeight', {
        header: 'Hub H',
        size: 65,
        cell: (info) => (
          <span style={{ color: '#bbb' }}>
            {Math.round(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('rotorD', {
        header: 'Rotor D',
        size: 70,
        cell: (info) => (
          <span style={{ color: '#bbb' }}>
            {Math.round(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        size: 70,
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => onDelete(row.original.id)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
          >
            Del
          </button>
        ),
      }),
    ],
    [turbines, selectedIds, onSelect, onDelete]
  );

  const table = useReactTable({
    data: turbines,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Restar altura del header (44px) y footer (40px)
        setTableHeight(rect.height - 84);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index];
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #1a1a1a',
            background: selectedIds.has(row.original.id) ? '#1e3a5f' : index % 2 === 0 ? '#0d0d0d' : '#111',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!selectedIds.has(row.original.id)) {
              e.currentTarget.style.background = '#1a1a1a';
            }
          }}
          onMouseLeave={(e) => {
            if (!selectedIds.has(row.original.id)) {
              e.currentTarget.style.background = index % 2 === 0 ? '#0d0d0d' : '#111';
            }
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <div
              key={cell.id}
              style={{
                width: cell.column.getSize(),
                padding: '6px 8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      );
    },
    [rows, selectedIds]
  );

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          background: '#0a0a0a',
          borderBottom: '2px solid #2a2a2a',
          fontWeight: '600',
          fontSize: '12px',
          color: '#aaa',
        }}
      >
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <div
              key={header.id}
              style={{
                width: header.getSize(),
                padding: '10px 8px',
                cursor: header.column.getCanSort() ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getIsSorted()
                ? header.column.getIsSorted() === 'desc'
                  ? ' ▼'
                  : ' ▲'
                : ''}
            </div>
          ))
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <List
          height={tableHeight}
          itemCount={rows.length}
          itemSize={36}
          width="100%"
          overscanCount={10}
          style={{ scrollbarWidth: 'thin' }}
        >
          {Row}
        </List>
      </div>
      <div
        style={{
          padding: '10px 12px',
          background: '#0a0a0a',
          borderTop: '2px solid #2a2a2a',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#888',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Total: <strong style={{ color: '#4a9eff' }}>{turbines.length}</strong> turbinas</span>
        <span>Seleccionadas: <strong style={{ color: '#f59e0b' }}>{selectedIds.size}</strong></span>
      </div>
    </div>
  );
}
