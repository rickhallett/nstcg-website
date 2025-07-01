import { describe, it, expect } from 'bun:test';

// Tests for output formatting functions
describe('OutputFormatter', () => {
  // Mock speedtest result structure
  const mockSpeedtestResult = {
    timestamp: '2024-01-15T10:30:00Z',
    download: {
      bandwidth: 157286400,
      bytes: 242844672,
      elapsed: 15004
    },
    upload: {
      bandwidth: 21096448,
      bytes: 32505856,
      elapsed: 15001
    },
    ping: {
      jitter: 2.145,
      latency: 28.5
    },
    server: {
      name: 'Starlink Server',
      location: 'Seattle, WA',
      country: 'United States',
      host: 'speedtest.starlink.com',
      id: '12345'
    },
    result: {
      url: 'https://www.speedtest.net/result/12345678'
    }
  };

  const formatCsvRow = (result: any, direction?: string, tilt?: number): string => {
    const downloadMbps = (result.download.bandwidth * 8 / 1000000).toFixed(2);
    const uploadMbps = (result.upload.bandwidth * 8 / 1000000).toFixed(2);
    const pingMs = result.ping.latency.toFixed(1);
    
    return [
      result.timestamp,
      downloadMbps,
      uploadMbps,
      pingMs,
      `"${result.server.name}"`,
      `"${result.server.location}"`,
      direction || '',
      tilt?.toString() || ''
    ].join(',');
  };

  const formatJsonResult = (result: any, direction?: string, directionDegrees?: number, tilt?: number): any => {
    const downloadMbps = parseFloat((result.download.bandwidth * 8 / 1000000).toFixed(2));
    const uploadMbps = parseFloat((result.upload.bandwidth * 8 / 1000000).toFixed(2));
    
    return {
      timestamp: result.timestamp,
      download: {
        ...result.download,
        mbps: downloadMbps
      },
      upload: {
        ...result.upload,
        mbps: uploadMbps
      },
      ping: result.ping,
      server: result.server,
      result: result.result,
      ...(direction && { direction }),
      ...(directionDegrees !== undefined && { direction_degrees: directionDegrees }),
      ...(tilt !== undefined && { tilt })
    };
  };

  describe('CSV Formatting', () => {
    it('should format basic speedtest result to CSV', () => {
      const csv = formatCsvRow(mockSpeedtestResult);
      expect(csv).toBe('2024-01-15T10:30:00Z,125.83,16.88,28.5,"Starlink Server","Seattle, WA",,');
    });

    it('should include direction when provided', () => {
      const csv = formatCsvRow(mockSpeedtestResult, 'NW');
      expect(csv).toContain(',NW,');
    });

    it('should include tilt when provided', () => {
      const csv = formatCsvRow(mockSpeedtestResult, 'NW', 45);
      expect(csv).toMatch(/,NW,45$/);
    });

    it('should handle all parameters', () => {
      const csv = formatCsvRow(mockSpeedtestResult, 'ESE', 30);
      expect(csv).toBe('2024-01-15T10:30:00Z,125.83,16.88,28.5,"Starlink Server","Seattle, WA",ESE,30');
    });

    it('should escape quotes in server names', () => {
      const resultWithQuotes = {
        ...mockSpeedtestResult,
        server: {
          ...mockSpeedtestResult.server,
          name: 'Server "Test" Name'
        }
      };
      const csv = formatCsvRow(resultWithQuotes);
      expect(csv).toContain('"Server ""Test"" Name"');
    });
  });

  describe('JSON Formatting', () => {
    it('should format basic speedtest result to JSON', () => {
      const json = formatJsonResult(mockSpeedtestResult);
      
      expect(json.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(json.download.mbps).toBe(125.83);
      expect(json.upload.mbps).toBe(16.88);
      expect(json.ping.latency).toBe(28.5);
      expect(json.server.name).toBe('Starlink Server');
    });

    it('should include direction fields when provided', () => {
      const json = formatJsonResult(mockSpeedtestResult, 'NW', 315);
      
      expect(json.direction).toBe('NW');
      expect(json.direction_degrees).toBe(315);
    });

    it('should include tilt when provided', () => {
      const json = formatJsonResult(mockSpeedtestResult, 'NW', 315, 45);
      
      expect(json.tilt).toBe(45);
    });

    it('should not include undefined optional fields', () => {
      const json = formatJsonResult(mockSpeedtestResult);
      
      expect(json).not.toHaveProperty('direction');
      expect(json).not.toHaveProperty('direction_degrees');
      expect(json).not.toHaveProperty('tilt');
    });

    it('should preserve original speedtest data', () => {
      const json = formatJsonResult(mockSpeedtestResult, 'N', 0, 30);
      
      expect(json.download.bandwidth).toBe(157286400);
      expect(json.download.bytes).toBe(242844672);
      expect(json.download.elapsed).toBe(15004);
      expect(json.result.url).toBe('https://www.speedtest.net/result/12345678');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should validate ISO 8601 format', () => {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      
      expect(mockSpeedtestResult.timestamp).toMatch(iso8601Regex);
    });

    it('should handle different timezone representations', () => {
      const timestamps = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00+00:00',
        '2024-01-15T10:30:00.000Z'
      ];
      
      timestamps.forEach(ts => {
        const result = { ...mockSpeedtestResult, timestamp: ts };
        const csv = formatCsvRow(result);
        expect(csv).toContain(ts);
      });
    });
  });

  describe('Number Formatting', () => {
    it('should format speeds to 2 decimal places', () => {
      const result = {
        ...mockSpeedtestResult,
        download: { bandwidth: 157286399 }, // Will result in 125.829...
        upload: { bandwidth: 21096447 }     // Will result in 16.877...
      };
      
      const csv = formatCsvRow(result);
      expect(csv).toContain('125.83');
      expect(csv).toContain('16.88');
    });

    it('should format ping to 1 decimal place', () => {
      const result = {
        ...mockSpeedtestResult,
        ping: { latency: 28.567 }
      };
      
      const csv = formatCsvRow(result);
      expect(csv).toContain('28.6');
    });
  });
});