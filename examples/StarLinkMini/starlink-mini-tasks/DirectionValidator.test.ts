import { describe, it, expect } from 'bun:test';

// This would test the direction validation logic once implemented
describe('DirectionValidator', () => {
  // Mock the validation function that would be extracted from the main script
  const validateDirection = (direction: string): { valid: boolean; degrees?: number; error?: string } => {
    // Compass point validation
    const compassPoints: Record<string, number> = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };

    // Check if it's a compass point
    if (compassPoints.hasOwnProperty(direction.toUpperCase())) {
      return { valid: true, degrees: compassPoints[direction.toUpperCase()] };
    }

    // Check if it's a number
    const degrees = parseFloat(direction);
    if (!isNaN(degrees)) {
      if (degrees >= 0 && degrees < 360) {
        return { valid: true, degrees: degrees };
      } else {
        // Wrap around for out of range values
        return { valid: true, degrees: ((degrees % 360) + 360) % 360 };
      }
    }

    return { valid: false, error: `Invalid direction: ${direction}` };
  };

  describe('Compass Points', () => {
    it('should validate single-letter cardinal directions', () => {
      expect(validateDirection('N')).toEqual({ valid: true, degrees: 0 });
      expect(validateDirection('E')).toEqual({ valid: true, degrees: 90 });
      expect(validateDirection('S')).toEqual({ valid: true, degrees: 180 });
      expect(validateDirection('W')).toEqual({ valid: true, degrees: 270 });
    });

    it('should validate two-letter intercardinal directions', () => {
      expect(validateDirection('NE')).toEqual({ valid: true, degrees: 45 });
      expect(validateDirection('SE')).toEqual({ valid: true, degrees: 135 });
      expect(validateDirection('SW')).toEqual({ valid: true, degrees: 225 });
      expect(validateDirection('NW')).toEqual({ valid: true, degrees: 315 });
    });

    it('should validate three-letter secondary-intercardinal directions', () => {
      expect(validateDirection('NNE')).toEqual({ valid: true, degrees: 22.5 });
      expect(validateDirection('ENE')).toEqual({ valid: true, degrees: 67.5 });
      expect(validateDirection('ESE')).toEqual({ valid: true, degrees: 112.5 });
      expect(validateDirection('SSE')).toEqual({ valid: true, degrees: 157.5 });
      expect(validateDirection('SSW')).toEqual({ valid: true, degrees: 202.5 });
      expect(validateDirection('WSW')).toEqual({ valid: true, degrees: 247.5 });
      expect(validateDirection('WNW')).toEqual({ valid: true, degrees: 292.5 });
      expect(validateDirection('NNW')).toEqual({ valid: true, degrees: 337.5 });
    });

    it('should be case-insensitive', () => {
      expect(validateDirection('n')).toEqual({ valid: true, degrees: 0 });
      expect(validateDirection('Ne')).toEqual({ valid: true, degrees: 45 });
      expect(validateDirection('nne')).toEqual({ valid: true, degrees: 22.5 });
    });

    it('should reject invalid compass combinations', () => {
      expect(validateDirection('NN')).toEqual({ valid: false, error: 'Invalid direction: NN' });
      expect(validateDirection('EW')).toEqual({ valid: false, error: 'Invalid direction: EW' });
      expect(validateDirection('NSE')).toEqual({ valid: false, error: 'Invalid direction: NSE' });
      expect(validateDirection('NNNN')).toEqual({ valid: false, error: 'Invalid direction: NNNN' });
    });
  });

  describe('Numeric Degrees', () => {
    it('should accept valid degree values', () => {
      expect(validateDirection('0')).toEqual({ valid: true, degrees: 0 });
      expect(validateDirection('45')).toEqual({ valid: true, degrees: 45 });
      expect(validateDirection('90.5')).toEqual({ valid: true, degrees: 90.5 });
      expect(validateDirection('180')).toEqual({ valid: true, degrees: 180 });
      expect(validateDirection('359.9')).toEqual({ valid: true, degrees: 359.9 });
    });

    it('should wrap around degrees greater than 360', () => {
      expect(validateDirection('360')).toEqual({ valid: true, degrees: 0 });
      expect(validateDirection('450')).toEqual({ valid: true, degrees: 90 });
      expect(validateDirection('720')).toEqual({ valid: true, degrees: 0 });
    });

    it('should handle negative degrees', () => {
      expect(validateDirection('-90')).toEqual({ valid: true, degrees: 270 });
      expect(validateDirection('-180')).toEqual({ valid: true, degrees: 180 });
      expect(validateDirection('-360')).toEqual({ valid: true, degrees: 0 });
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject non-numeric non-compass strings', () => {
      expect(validateDirection('ABC')).toEqual({ valid: false, error: 'Invalid direction: ABC' });
      expect(validateDirection('North')).toEqual({ valid: false, error: 'Invalid direction: North' });
      expect(validateDirection('45degrees')).toEqual({ valid: false, error: 'Invalid direction: 45degrees' });
    });

    it('should reject empty strings', () => {
      expect(validateDirection('')).toEqual({ valid: false, error: 'Invalid direction: ' });
    });
  });
});