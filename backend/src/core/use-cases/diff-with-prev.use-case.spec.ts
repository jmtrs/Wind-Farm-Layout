import { DiffWithPrevUseCase } from './diff-with-prev.use-case';
import { ScenarioRepository } from '../ports/scenario.repository';

describe('DiffWithPrevUseCase', () => {
  let useCase: DiffWithPrevUseCase;
  let mockRepository: jest.Mocked<ScenarioRepository>;

  beforeEach(() => {
    mockRepository = {
      getLatestVersion: jest.fn(),
      getSnapshot: jest.fn(),
    } as any;

    useCase = new DiffWithPrevUseCase(mockRepository);
  });

  it('should return null when version < 2', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(1);

    const result = await useCase.execute('s1');

    expect(result).toBeNull();
  });

  it('should detect added turbines', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(2);
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [
        { id: 't1', x: 0, y: 0 },
        { id: 't2', x: 100, y: 100 },
      ],
    });
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [{ id: 't1', x: 0, y: 0 }],
    });

    const result = await useCase.execute('s1');

    expect(result?.added).toEqual([{ id: 't2', x: 100, y: 100 }]);
    expect(result?.removed).toEqual([]);
    expect(result?.moved).toEqual([]);
  });

  it('should detect removed turbines', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(2);
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [{ id: 't1', x: 0, y: 0 }],
    });
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [
        { id: 't1', x: 0, y: 0 },
        { id: 't2', x: 100, y: 100 },
      ],
    });

    const result = await useCase.execute('s1');

    expect(result?.added).toEqual([]);
    expect(result?.removed).toEqual(['t2']);
    expect(result?.moved).toEqual([]);
  });

  it('should detect moved turbines', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(2);
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [{ id: 't1', x: 100, y: 200 }],
    });
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [{ id: 't1', x: 0, y: 0 }],
    });

    const result = await useCase.execute('s1');

    expect(result?.added).toEqual([]);
    expect(result?.removed).toEqual([]);
    expect(result?.moved).toEqual([
      {
        id: 't1',
        from: { x: 0, y: 0 },
        to: { x: 100, y: 200 },
      },
    ]);
  });

  it('should detect mixed changes', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(2);
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [
        { id: 't1', x: 50, y: 50 },
        { id: 't3', x: 300, y: 300 },
      ],
    });
    mockRepository.getSnapshot.mockResolvedValueOnce({
      turbines: [
        { id: 't1', x: 0, y: 0 },
        { id: 't2', x: 100, y: 100 },
      ],
    });

    const result = await useCase.execute('s1');

    expect(result?.added).toHaveLength(1);
    expect(result?.removed).toEqual(['t2']);
    expect(result?.moved).toHaveLength(1);
  });
});
