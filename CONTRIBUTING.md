# Contributing Guide

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch (optional)
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code improvements

### Commit Convention

Follow conventional commits:

```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): refactor code
test(scope): add tests
docs(scope): update documentation
chore(scope): maintenance tasks
```

Examples:
```
feat(backend): add turbine deletion endpoint
fix(frontend): correct 3D selection logic
test(core): add wake model unit tests
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes** with atomic commits

3. **Run tests**
   ```bash
   npm test --workspace=backend
   npm run lint --workspace=frontend
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

## Code Style

### Backend (TypeScript/NestJS)

- Use dependency injection
- Keep domain logic in `core/`
- Infrastructure in `infra/`
- Write unit tests for use cases
- Follow hexagonal architecture

### Frontend (React/TypeScript)

- Functional components with hooks
- Memoize expensive computations
- Use TanStack Query for server state
- Keep components small and focused
- Inline styles acceptable for MVP

## Testing

### Backend Tests

```bash
# Unit tests
npm test --workspace=backend

# E2E tests
npm run test:e2e --workspace=backend

# With coverage
npm run test:cov --workspace=backend
```

### What to Test

- **Core Use Cases**: All domain logic
- **Repository**: Integration with database
- **Controllers**: E2E request/response
- **Calculations**: Numerical accuracy

## Architecture Decisions

### Why Hexagonal?

Clean separation between business logic and technical details. Domain can be tested without infrastructure.

### Why InstancedMesh?

Rendering 10k individual meshes = 10k draw calls = poor performance. InstancedMesh = 1 draw call.

### Why Keyset Pagination?

Offset pagination slows down at high offsets. Keyset (cursor) pagination has consistent performance.

### Why WebSocket?

Server-initiated updates needed. HTTP polling wastes resources. WebSocket provides true real-time sync.

## Performance Guidelines

### Frontend

- Use `React.memo()` for expensive components
- Virtualize large lists (react-window)
- Batch state updates
- Debounce frequent operations

### Backend

- Use database indexes
- Cache expensive calculations
- Limit query result sizes
- Use select to fetch only needed columns

## Getting Help

- Check existing issues
- Review pull requests
- Read the README
- Ask in discussions

## Pull Request Checklist

- [ ] Branch is up to date with main
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Commit messages follow convention
- [ ] Documentation updated if needed
- [ ] No console.logs or debugger statements
- [ ] TypeScript types are correct
