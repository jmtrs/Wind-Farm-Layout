export interface PowerCurvePoint {
  v: number;
  p: number;
}

export class Turbine {
  constructor(
    public readonly id: string,
    public readonly scenarioId: string,
    public x: number,
    public y: number,
    public hubHeight: number,
    public rotorD: number,
    public powerCurve: PowerCurvePoint[],
  ) {}

  distanceTo(other: Turbine): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  angleTo(other: Turbine): number {
    return Math.atan2(other.y - this.y, other.x - this.x) * (180 / Math.PI);
  }
}
