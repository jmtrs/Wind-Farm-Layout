import { SaveSnapshotUseCase } from './save-snapshot.use-case';
import { ScenarioRepository } from '../ports/scenario.repository';
import { Turbine } from '../entities/turbine.entity';

describe('SaveSnapshotUseCase', () => {
  let useCase: SaveSnapshotUseCase;
  let mockRepository: jest.Mocked<ScenarioRepository>;

  beforeEach(() => {
    mockRepository = {
      getLatestVersion: jest.fn(),
      saveSnapshot: jest.fn(),
      saveSnapshotAtomic: jest.fn(),
      getSnapshot: jest.fn(),
      findTurbines: jest.fn(),
      deleteTurbine: jest.fn(),
      saveTurbine: jest.fn(),
    } as any;

    useCase = new SaveSnapshotUseCase(mockRepository);
  });

  it('should increment version and save snapshot', async () => {
    const turbines = [
      new Turbine('t1', 's1', 0, 0, 100, 120, []),
      new Turbine('t2', 's1', 500, 500, 100, 120, []),
    ];

    mockRepository.getLatestVersion.mockResolvedValue(5);
    mockRepository.saveSnapshotAtomic.mockResolvedValue(6);

    const version = await useCase.execute('s1', turbines);

    expect(version).toBe(6);
    expect(mockRepository.saveSnapshotAtomic).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        turbines: expect.arrayContaining([
          expect.objectContaining({ id: 't1', x: 0, y: 0 }),
          expect.objectContaining({ id: 't2', x: 500, y: 500 }),
        ]),
      }),
    );
  });

  it('should start at version 1 when no previous versions', async () => {
    mockRepository.getLatestVersion.mockResolvedValue(0);
    mockRepository.saveSnapshotAtomic.mockResolvedValue(1);

    const version = await useCase.execute('s1', []);

    expect(version).toBe(1);
  });

  it('should restore snapshot and replace turbines', async () => {
    const snapshotData = {
      turbines: [
        { id: 't1', x: 100, y: 100, hubHeight: 100, rotorD: 120, powerCurve: [] },
        { id: 't2', x: 200, y: 200, hubHeight: 100, rotorD: 120, powerCurve: [] },
      ],
    };

    const currentTurbines = [
      new Turbine('t3', 's1', 300, 300, 100, 120, []),
    ];

    mockRepository.getSnapshot.mockResolvedValue(snapshotData);
    mockRepository.findTurbines.mockResolvedValue(currentTurbines);

    await useCase.restore('s1', 3);

    expect(mockRepository.deleteTurbine).toHaveBeenCalledWith('t3');
    expect(mockRepository.saveTurbine).toHaveBeenCalledTimes(2);
  });

  it('should throw error when restoring non-existent version', async () => {
    mockRepository.getSnapshot.mockResolvedValue(null);

    await expect(useCase.restore('s1', 999)).rejects.toThrow(
      'Version 999 not found',
    );
  });
});
