import { WindRose } from './wind-rose.entity';
import { Turbine } from './turbine.entity';

export class Scenario {
  constructor(
    public readonly id: string,
    public name: string,
    public windRose: WindRose,
    public turbines: Turbine[] = [],
  ) {}

  addTurbine(turbine: Turbine): void {
    this.turbines.push(turbine);
  }

  removeTurbine(id: string): boolean {
    const idx = this.turbines.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.turbines.splice(idx, 1);
    return true;
  }

  getTurbine(id: string): Turbine | undefined {
    return this.turbines.find((t) => t.id === id);
  }
}
