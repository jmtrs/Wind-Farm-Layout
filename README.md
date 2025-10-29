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
- npm or yarn

### Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd Wind-Farm-Layout

# 2. Install dependencies
npm install

# 3. Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# 4. Setup backend environment
cp backend/.env.example backend/.env

# 5. Run database migrations
cd backend
npx prisma generate
npx prisma migrate dev
cd ..

# 6. Seed database with 10,000+ turbines
npm run seed --workspace=backend

# 7. Start development servers (backend + frontend)
npm run dev
```

### Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **Prisma Studio**: `npx prisma studio` (from backend directory)

### Running Tests

```bash
# Backend unit tests
npm test --workspace=backend

# Backend E2E tests
npm run test:e2e --workspace=backend

# Frontend lint
npm run lint --workspace=frontend
```

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

## Features in Detail

### 3D Visualization
- **InstancedMesh Rendering**: Efficiently renders 10,000+ turbines using Three.js
- **Interactive Controls**: Drag to move turbines, double-click to add new ones
- **Selection System**: Click to select, Shift+Click for multi-selection
- **Real-time Updates**: Changes sync instantly via WebSocket

### Data Management
- **Virtualized Table**: TanStack Table with react-window for smooth scrolling
- **Keyset Pagination**: Efficient data loading for large datasets
- **Sorting & Filtering**: Client-side table operations
- **Bulk Operations**: Multi-select and batch delete

### AEP Calculation
- **Jensen/PARK Wake Model**: Industry-standard wake effect simulation
- **Redis Caching**: Results cached by layout hash for instant retrieval
- **Debounced Calculation**: Auto-triggers 300ms after layout changes
- **Per-Turbine Metrics**: Individual AEP and wake deficit values

### Version Control
- **Snapshot System**: Every layout change creates a new version
- **Diff Visualization**: See what changed between versions
- **Time Travel**: Restore any previous version
- **Change Tracking**: Added, removed, and moved turbines highlighted

### Real-time Sync
- **WebSocket Events**: `layout_changed`, `calc_status`, `telemetry`
- **Multi-client Support**: Changes broadcast to all connected clients
- **Room-based**: Clients join specific scenario rooms
- **Automatic Reconnection**: Resilient connection handling

## API Reference

### REST Endpoints

```
GET    /scenario?id={id}                    # Get scenario details
GET    /scenario/turbines?scenarioId={id}   # List turbines (paginated)
POST   /scenario/turbines/move              # Move turbine
POST   /scenario/turbines/add               # Add new turbine
POST   /scenario/turbines/delete            # Delete turbine
POST   /scenario/calc                       # Calculate AEP
GET    /scenario/results/latest             # Get latest results
GET    /scenario/versions                   # List versions
POST   /scenario/versions/restore           # Restore version
GET    /scenario/diff/prev                  # Get diff with previous
```

### WebSocket Messages

**Client → Server:**
```json
{"event": "join", "data": {"scenarioId": "default"}}
```

**Server → Client:**
```json
{"event": "layout_changed", "data": {...}}
{"event": "calc_status", "data": {...}}
{"event": "telemetry", "data": {...}}
```

## Performance

- **10,000+ turbines** rendered at 60 FPS
- **Keyset pagination** for efficient data loading
- **Redis caching** reduces calculation time by 95%+
- **InstancedMesh** uses single draw call for all turbines
- **Virtualized table** renders only visible rows (~40)

## Development

### Project Structure

```
/backend
  /src/core          # Clean domain layer
    /entities        # Business entities
    /use-cases       # Application logic
    /ports           # Interface definitions
  /src/infra         # Technical implementation
    /http            # REST controllers
    /ws              # WebSocket gateway
    /persistence     # Prisma repositories
    /cache           # Redis cache
  /prisma            # Database schema & migrations
  /test              # E2E tests

/frontend
  /src/features      # Feature modules
    /scenario        # Main scenario feature
  /src/lib           # Shared utilities
    /api.ts          # API client
  /src/types         # TypeScript definitions
```

### Tech Decisions

- **Hexagonal Architecture**: Clean separation of domain and infrastructure
- **TDD Approach**: Core use cases developed test-first
- **InstancedMesh over Individual Meshes**: 100x performance improvement
- **Keyset Pagination over Offset**: Consistent performance at any page
- **WebSocket over Polling**: Real-time updates with minimal overhead
- **Snapshot Versioning**: Fast restore without complex event sourcing

## Contributing

This is an MVP. Potential improvements:

- [ ] Turbine type library with real power curves
- [ ] Wind resource import (WRG, CFD)
- [ ] Energy calculation export (detailed CSV)
- [ ] Collaborative editing with CRDTs
- [ ] Terrain/obstacle visualization
- [ ] Optimization algorithms (genetic, gradient-based)

## License

MIT
