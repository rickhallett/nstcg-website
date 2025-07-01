// StarLinkOptimiser/src/ReportGenerator.ts
import { SpeedTestResult } from './DataStore';
import { GraphGenerator } from './GraphGenerator';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

export class ReportGenerator {
    static generate(testName: string, results: SpeedTestResult[]) {
        const graphs = GraphGenerator.generate(results);
        const totalTests = results.length;
        const averageDownload = results.reduce((acc, r) => acc + r.download, 0) / totalTests;
        const averageUpload = results.reduce((acc, r) => acc + r.upload, 0) / totalTests;
        const averagePing = results.reduce((acc, r) => acc + r.ping, 0) / totalTests;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Report for ${testName}</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            </head>
            <body>
                <h1>Report for ${testName}</h1>
                <h2>Summary</h2>
                <ul>
                    <li>Total Tests: ${totalTests}</li>
                    <li>Average Download: ${averageDownload.toFixed(2)} Mbps</li>
                    <li>Average Upload: ${averageUpload.toFixed(2)} Mbps</li>
                    <li>Average Ping: ${averagePing.toFixed(2)} ms</li>
                </ul>
                <h2>Graphs</h2>
                ${graphs}
            </body>
            </html>
        `;
        if (!existsSync('observer/reports')) {
            mkdirSync('observer/reports');
        }
        writeFileSync(`observer/reports/${testName}-${new Date().toISOString()}.html`, html);
    }
}