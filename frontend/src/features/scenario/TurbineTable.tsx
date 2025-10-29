import { useMemo, useCallback } from 'react';
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
import { useState } from 'react';

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
        size: 120,
        cell: (info) => (
          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('x', {
        header: 'X',
        size: 80,
        cell: (info) => Math.round(info.getValue()),
      }),
      columnHelper.accessor('y', {
        header: 'Y',
        size: 80,
        cell: (info) => Math.round(info.getValue()),
      }),
      columnHelper.accessor('hubHeight', {
        header: 'Hub H',
        size: 70,
        cell: (info) => Math.round(info.getValue()),
      }),
      columnHelper.accessor('rotorD', {
        header: 'Rotor D',
        size: 70,
        cell: (info) => Math.round(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        size: 60,
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => onDelete(row.original.id)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: '#aa2222',
            }}
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

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index];
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            borderBottom: '1px solid #222',
            background: selectedIds.has(row.original.id) ? '#2a2a2a' : '#111',
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <div
              key={cell.id}
              style={{
                width: cell.column.getSize(),
                padding: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '13px',
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          background: '#1a1a1a',
          borderBottom: '2px solid #333',
          fontWeight: 'bold',
          fontSize: '13px',
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
      <div style={{ flex: 1 }}>
        <List
          height={600}
          itemCount={rows.length}
          itemSize={40}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
      <div
        style={{
          padding: '8px 12px',
          background: '#1a1a1a',
          borderTop: '1px solid #333',
          fontSize: '12px',
        }}
      >
        Total: {turbines.length} turbines | Selected: {selectedIds.size}
      </div>
    </div>
  );
}
