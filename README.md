# Wind Farm Layout Sandbox

3D wind farm layout editor with real-time AEP calculation (Jensen/PARK model) and WebSocket synchronization.

## Features

- **3D Editor**: Three.js InstancedMesh for rendering 10k+ turbines
- **Data Table**: Virtualized table with keyset pagination
- **Real-time Sync**: WebSocket for layout changes, calculations, and telemetry
- **AEP Calculation**: Jensen/PARK wake model with Redis caching
- **Version Control**: Snapshot-based versioning with diff and restore
- **High Performance**: Optimized for large datasets

## Tech Stack

### Backend
- NestJS with hexagonal architecture
- PostgreSQL + Prisma
- Redis for caching
- WebSocket (ws library)

### Frontend
- React + Vite
- Three.js for 3D rendering
- TanStack Table + react-window
- TanStack Query

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Installation

```bash
# Install dependencies
npm install

# Start services
docker-compose up -d

# Run migrations
npm run migrate --workspace=backend

# Seed database
npm run seed --workspace=backend

# Start dev servers
npm run dev
```

### Endpoints

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000/ws

## Architecture

```
/backend
  /src/core          # Domain layer (entities, use-cases, ports)
  /src/infra         # Infrastructure (HTTP, WS, Prisma, Redis)
  /prisma            # Database schema

/frontend
  /src/features      # Feature modules
  /src/lib           # Shared utilities
```

## Testing

```bash
npm test
```

## License

MIT
