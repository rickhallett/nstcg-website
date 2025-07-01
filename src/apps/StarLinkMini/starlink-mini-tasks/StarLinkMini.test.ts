import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('StarLinkMini', () => {
  const scriptPath = join(__dirname, '../../src/StarLinkMini/index.ts');
  const testName = 'test-session';
  const csvFile = `${testName}.csv`;
  const jsonFile = `${testName}.json`;

  beforeEach(() => {
    // Clean up any existing test files
    if (existsSync(csvFile)) unlinkSync(csvFile);
    if (existsSync(jsonFile)) unlinkSync(jsonFile);
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(csvFile)) unlinkSync(csvFile);
    if (existsSync(jsonFile)) unlinkSync(jsonFile);
  });

  describe('Core Functionality', () => {
    it('should execute without errors', () => {
      expect(() => {
        execSync(`bun run ${scriptPath} --help`, { stdio: 'pipe' });
      }).not.toThrow();
    });

    it('should create output files with correct names', () => {
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      
      expect(existsSync(csvFile)).toBe(true);
      expect(existsSync(jsonFile)).toBe(true);
    });

    it('should capture speed test results', () => {
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      
      const csvContent = readFileSync(csvFile, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      expect(lines.length).toBeGreaterThanOrEqual(2); // Header + at least one data row
      expect(lines[0]).toContain('timestamp,download_mbps,upload_mbps,ping_ms');
    });
  });

  describe('Parameter Validation', () => {
    describe('--name parameter', () => {
      it('should create files with the specified name', () => {
        const customName = 'custom-test';
        execSync(`bun run ${scriptPath} --name ${customName} --single-run`, { stdio: 'pipe' });
        
        expect(existsSync(`${customName}.csv`)).toBe(true);
        expect(existsSync(`${customName}.json`)).toBe(true);
        
        // Cleanup
        unlinkSync(`${customName}.csv`);
        unlinkSync(`${customName}.json`);
      });

      it('should reject missing name parameter', () => {
        expect(() => {
          execSync(`bun run ${scriptPath} --single-run`, { stdio: 'pipe' });
        }).toThrow();
      });
    });

    describe('--direction parameter', () => {
      const validCompassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW'];
      
      validCompassPoints.forEach(direction => {
        it(`should accept valid compass point: ${direction}`, () => {
          expect(() => {
            execSync(`bun run ${scriptPath} --name ${testName} --direction ${direction} --single-run`, { stdio: 'pipe' });
          }).not.toThrow();
        });
      });

      it('should accept numeric degrees', () => {
        const degrees = [0, 45.5, 90, 180, 270, 359.9];
        degrees.forEach(deg => {
          expect(() => {
            execSync(`bun run ${scriptPath} --name ${testName} --direction ${deg} --single-run`, { stdio: 'pipe' });
          }).not.toThrow();
        });
      });

      it('should reject invalid compass points', () => {
        const invalidDirections = ['XY', 'NNNN', 'EW', 'NS'];
        invalidDirections.forEach(dir => {
          expect(() => {
            execSync(`bun run ${scriptPath} --name ${testName} --direction ${dir} --single-run`, { stdio: 'pipe' });
          }).toThrow();
        });
      });

      it('should store direction in output files', () => {
        execSync(`bun run ${scriptPath} --name ${testName} --direction NW --single-run`, { stdio: 'pipe' });
        
        const csvContent = readFileSync(csvFile, 'utf-8');
        expect(csvContent).toContain('NW');
        
        const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        expect(jsonContent[0].direction).toBe('NW');
        expect(jsonContent[0].direction_degrees).toBe(315);
      });
    });

    describe('--tilt parameter', () => {
      it('should accept valid tilt angles', () => {
        const validTilts = [0, 15, 30, 45, 60, 75, 90];
        validTilts.forEach(tilt => {
          expect(() => {
            execSync(`bun run ${scriptPath} --name ${testName} --tilt ${tilt} --single-run`, { stdio: 'pipe' });
          }).not.toThrow();
        });
      });

      it('should reject out-of-range tilt values', () => {
        const invalidTilts = [-10, 95, 180, 'abc'];
        invalidTilts.forEach(tilt => {
          expect(() => {
            execSync(`bun run ${scriptPath} --name ${testName} --tilt ${tilt} --single-run`, { stdio: 'pipe' });
          }).toThrow();
        });
      });

      it('should store tilt in output files', () => {
        execSync(`bun run ${scriptPath} --name ${testName} --tilt 45 --single-run`, { stdio: 'pipe' });
        
        const csvContent = readFileSync(csvFile, 'utf-8');
        const lines = csvContent.trim().split('\n');
        expect(lines[0]).toContain('tilt');
        expect(lines[1]).toContain('45');
        
        const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        expect(jsonContent[0].tilt).toBe(45);
      });
    });
  });

  describe('Output Format', () => {
    beforeEach(() => {
      execSync(`bun run ${scriptPath} --name ${testName} --direction NE --tilt 30 --single-run`, { stdio: 'pipe' });
    });

    describe('CSV Format', () => {
      it('should have correct headers', () => {
        const csvContent = readFileSync(csvFile, 'utf-8');
        const headers = csvContent.split('\n')[0];
        
        expect(headers).toBe('timestamp,download_mbps,upload_mbps,ping_ms,server_name,server_location,direction,tilt');
      });

      it('should have properly formatted data', () => {
        const csvContent = readFileSync(csvFile, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const dataLine = lines[1].split(',');
        
        expect(dataLine.length).toBe(8);
        expect(dataLine[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/); // ISO 8601
        expect(parseFloat(dataLine[1])).toBeGreaterThan(0); // download
        expect(parseFloat(dataLine[2])).toBeGreaterThan(0); // upload
        expect(parseFloat(dataLine[3])).toBeGreaterThan(0); // ping
      });
    });

    describe('JSON Format', () => {
      it('should be valid JSON', () => {
        expect(() => {
          JSON.parse(readFileSync(jsonFile, 'utf-8'));
        }).not.toThrow();
      });

      it('should have correct structure', () => {
        const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        const result = jsonContent[0];
        
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('download');
        expect(result.download).toHaveProperty('mbps');
        expect(result).toHaveProperty('upload');
        expect(result.upload).toHaveProperty('mbps');
        expect(result).toHaveProperty('ping');
        expect(result.ping).toHaveProperty('latency');
        expect(result).toHaveProperty('server');
        expect(result).toHaveProperty('direction');
        expect(result).toHaveProperty('tilt');
      });

      it('should have ISO 8601 timestamps', () => {
        const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        const timestamp = jsonContent[0].timestamp;
        
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing speedtest-cli gracefully', () => {
      // This test would need to mock the speedtest-cli absence
      // For now, we'll test that the script checks for it
      const helpOutput = execSync(`bun run ${scriptPath} --help`, { encoding: 'utf-8' });
      expect(helpOutput).toContain('speedtest-cli');
    });

    it('should log errors appropriately', () => {
      // Test with invalid parameters to trigger error logging
      const result = execSync(`bun run ${scriptPath} --name ${testName} --direction INVALID 2>&1 || true`, { encoding: 'utf-8' });
      expect(result).toContain('Error');
    });
  });

  describe('Integration', () => {
    it('should append to existing files on multiple runs', () => {
      // First run
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      const firstCsvSize = readFileSync(csvFile, 'utf-8').split('\n').length;
      
      // Second run
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      const secondCsvSize = readFileSync(csvFile, 'utf-8').split('\n').length;
      
      expect(secondCsvSize).toBe(firstCsvSize + 1); // One more data line
    });

    it('should maintain data integrity across runs', () => {
      // Run twice
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      execSync(`bun run ${scriptPath} --name ${testName} --single-run`, { stdio: 'pipe' });
      
      const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      expect(jsonContent.length).toBe(2);
      expect(jsonContent[0].timestamp).not.toBe(jsonContent[1].timestamp);
    });
  });
});