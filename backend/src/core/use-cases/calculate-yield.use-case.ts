import { Turbine, PowerCurvePoint } from '../entities/turbine.entity';
import { WindRose } from '../entities/wind-rose.entity';
import { YieldResult } from '../ports/result-cache.port';
import * as crypto from 'crypto';

export class CalculateYieldUseCase {
  private readonly WAKE_DECAY_CONSTANT = 0.075;

  execute(turbines: Turbine[], windRose: WindRose): YieldResult {
    const turbineYields: Array<{
      turbineId: string;
      AEP_MWh: number;
      wakeDeficit: number;
    }> = [];

    let totalAEP = 0;

    for (const turbine of turbines) {
      let turbineAEP = 0;
      let totalDeficit = 0;

      for (const bin of windRose.bins) {
        const upstreamTurbines = this.findUpstreamTurbines(
          turbine,
          turbines,
          bin.direction,
        );

        const effectiveSpeed = this.calculateEffectiveSpeed(
          bin.speed,
          turbine,
          upstreamTurbines,
        );

        const power = this.interpolatePower(effectiveSpeed, turbine.powerCurve);
        const hours = bin.frequency * 8760;
        turbineAEP += (power / 1000) * hours;

        totalDeficit += (1 - effectiveSpeed / bin.speed) * bin.frequency;
      }

      turbineYields.push({
        turbineId: turbine.id,
        AEP_MWh: turbineAEP,
        wakeDeficit: totalDeficit,
      });

      totalAEP += turbineAEP;
    }

    return {
      AEP_MWh: totalAEP,
      turbineYields,
    };
  }

  calculateHash(turbines: Turbine[], windRose: WindRose): string {
    const data = {
      turbines: turbines.map((t) => ({
        x: t.x,
        y: t.y,
        h: t.hubHeight,
        d: t.rotorD,
      })),
      windRose: windRose.bins,
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private findUpstreamTurbines(
    target: Turbine,
    all: Turbine[],
    windDir: number,
  ): Turbine[] {
    return all.filter((t) => {
      if (t.id === target.id) return false;

      const angle = target.angleTo(t);
      const diff = Math.abs(((angle - windDir + 180) % 360) - 180);

      return diff < 30;
    });
  }

  private calculateEffectiveSpeed(
    freeSpeed: number,
    turbine: Turbine,
    upstreamTurbines: Turbine[],
  ): number {
    let totalDeficit = 0;

    for (const upstream of upstreamTurbines) {
      const distance = turbine.distanceTo(upstream);
      const wakeRadius =
        upstream.rotorD / 2 + this.WAKE_DECAY_CONSTANT * distance;
      const overlapRatio = Math.min(1, turbine.rotorD / (2 * wakeRadius));

      const deficit = (1 - Math.sqrt(1 - 0.4)) * Math.pow(upstream.rotorD / (2 * wakeRadius), 2);
      totalDeficit += deficit * deficit * overlapRatio;
    }

    const totalDeficitFactor = Math.sqrt(totalDeficit);
    return freeSpeed * (1 - totalDeficitFactor);
  }

  private interpolatePower(speed: number, powerCurve: PowerCurvePoint[]): number {
    if (speed <= powerCurve[0].v) return 0;
    if (speed >= powerCurve[powerCurve.length - 1].v) {
      return powerCurve[powerCurve.length - 1].p;
    }

    for (let i = 0; i < powerCurve.length - 1; i++) {
      const p1 = powerCurve[i];
      const p2 = powerCurve[i + 1];

      if (speed >= p1.v && speed <= p2.v) {
        const t = (speed - p1.v) / (p2.v - p1.v);
        return p1.p + t * (p2.p - p1.p);
      }
    }

    return 0;
  }
}
