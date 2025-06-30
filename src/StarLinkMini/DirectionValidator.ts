export interface ValidationResult {
  valid: boolean;
  degrees?: number;
  error?: string;
}

export class DirectionValidator {
  private static readonly compassPoints: Record<string, number> = {
    'N': 0,
    'NNE': 22.5,
    'NE': 45,
    'ENE': 67.5,
    'E': 90,
    'ESE': 112.5,
    'SE': 135,
    'SSE': 157.5,
    'S': 180,
    'SSW': 202.5,
    'SW': 225,
    'WSW': 247.5,
    'W': 270,
    'WNW': 292.5,
    'NW': 315,
    'NNW': 337.5,
  };

  static validate(direction: string): ValidationResult {
    // Check if it's a compass point
    const upperDirection = direction.toUpperCase();
    if (this.compassPoints.hasOwnProperty(upperDirection)) {
      return { 
        valid: true, 
        degrees: this.compassPoints[upperDirection] 
      };
    }

    // Check if it's a number
    const degrees = parseFloat(direction);
    if (!isNaN(degrees)) {
      // Normalize to 0-359.9 range
      const normalized = ((degrees % 360) + 360) % 360;
      return { 
        valid: true, 
        degrees: normalized 
      };
    }

    return { 
      valid: false, 
      error: `Invalid direction: ${direction}. Use compass points (N, NW, etc.) or degrees (0-359.9)` 
    };
  }

  static toDegrees(direction: string): number {
    const validation = this.validate(direction);
    if (validation.valid && validation.degrees !== undefined) {
      return validation.degrees;
    }
    throw new Error(`Cannot convert invalid direction: ${direction}`);
  }

  static isCompassPoint(direction: string): boolean {
    return this.compassPoints.hasOwnProperty(direction.toUpperCase());
  }
}