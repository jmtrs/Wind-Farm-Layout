import { CalculateYieldUseCase } from './calculate-yield.use-case';
import { Turbine } from '../entities/turbine.entity';
import { WindRose } from '../entities/wind-rose.entity';

describe('CalculateYieldUseCase', () => {
  let useCase: CalculateYieldUseCase;

  beforeEach(() => {
    useCase = new CalculateYieldUseCase();
  });

  const defaultPowerCurve = [
    { v: 0, p: 0 },
    { v: 3, p: 0 },
    { v: 8, p: 1500 },
    { v: 12, p: 3000 },
    { v: 25, p: 3000 },
  ];

  it('should calculate AEP for single turbine', () => {
    const turbines = [
      new Turbine('t1', 's1', 0, 0, 100, 120, defaultPowerCurve),
    ];

    const windRose = new WindRose([
      { direction: 0, speed: 8, frequency: 1.0 },
    ]);

    const result = useCase.execute(turbines, windRose);

    expect(result.AEP_MWh).toBeGreaterThan(0);
    expect(result.turbineYields).toHaveLength(1);
    expect(result.turbineYields[0].turbineId).toBe('t1');
    expect(result.turbineYields[0].wakeDeficit).toBe(0);
  });

  it.skip('should apply wake deficit for turbines in line', () => {
    // Place turbines on X axis, wind from East (90°) means downstream is negative X
    const turbines = [
      new Turbine('t1', 's1', 500, 0, 100, 120, defaultPowerCurve), // upstream
      new Turbine('t2', 's1', 0, 0, 100, 120, defaultPowerCurve),   // downstream
    ];

    const windRose = new WindRose([
      { direction: 90, speed: 8, frequency: 1.0 }, // Wind from East
    ]);

    const result = useCase.execute(turbines, windRose);

    expect(result.turbineYields[0].wakeDeficit).toBe(0);
    expect(result.turbineYields[1].wakeDeficit).toBeGreaterThan(0);
    expect(result.turbineYields[1].AEP_MWh).toBeLessThan(
      result.turbineYields[0].AEP_MWh,
    );
  });

  it('should interpolate power curve correctly', () => {
    const turbines = [
      new Turbine('t1', 's1', 0, 0, 100, 120, defaultPowerCurve),
    ];

    const windRose = new WindRose([
      { direction: 0, speed: 10, frequency: 1.0 },
    ]);

    const result = useCase.execute(turbines, windRose);
    expect(result.AEP_MWh).toBeGreaterThan(0);
  });

  it('should handle multiple wind directions', () => {
    const turbines = [
      new Turbine('t1', 's1', 0, 0, 100, 120, defaultPowerCurve),
    ];

    const windRose = new WindRose([
      { direction: 0, speed: 8, frequency: 0.3 },
      { direction: 90, speed: 10, frequency: 0.4 },
      { direction: 180, speed: 6, frequency: 0.3 },
    ]);

    const result = useCase.execute(turbines, windRose);
    expect(result.AEP_MWh).toBeGreaterThan(0);
  });

  it('should generate consistent hash', () => {
    const turbines = [
      new Turbine('t1', 's1', 0, 0, 100, 120, defaultPowerCurve),
    ];

    const windRose = new WindRose([
      { direction: 0, speed: 8, frequency: 1.0 },
    ]);

    const hash1 = useCase.calculateHash(turbines, windRose);
    const hash2 = useCase.calculateHash(turbines, windRose);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different layouts', () => {
    const turbines1 = [
      new Turbine('t1', 's1', 0, 0, 100, 120, defaultPowerCurve),
    ];
    const turbines2 = [
      new Turbine('t1', 's1', 100, 0, 100, 120, defaultPowerCurve),
    ];

    const windRose = new WindRose([
      { direction: 0, speed: 8, frequency: 1.0 },
    ]);

    const hash1 = useCase.calculateHash(turbines1, windRose);
    const hash2 = useCase.calculateHash(turbines2, windRose);

    expect(hash1).not.toBe(hash2);
  });
});
