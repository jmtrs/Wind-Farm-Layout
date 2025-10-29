export interface WindBin {
  direction: number;
  speed: number;
  frequency: number;
}

export class WindRose {
  constructor(public readonly bins: WindBin[]) {
    if (bins.length === 0) {
      throw new Error('WindRose must have at least one bin');
    }
    
    const totalFreq = bins.reduce((sum, b) => sum + b.frequency, 0);
    if (Math.abs(totalFreq - 1.0) > 0.01) {
      throw new Error('WindRose frequencies must sum to 1.0');
    }
  }

  static fromJson(data: any): WindRose {
    return new WindRose(data.bins);
  }

  toJson(): any {
    return { bins: this.bins };
  }
}
