// StarLinkOptimiser/src/GraphGenerator.ts
import { Chart } from 'chart.js/auto';
import { SpeedTestResult } from './DataStore';

export class GraphGenerator {
    static generate(results: SpeedTestResult[]): string {
        const labels = results.map(r => new Date(r.timestamp).toLocaleTimeString());
        const downloadData = results.map(r => r.download);
        const uploadData = results.map(r => r.upload);
        const pingData = results.map(r => r.ping);

        const html = `
            <canvas id="downloadChart"></canvas>
            <canvas id="uploadChart"></canvas>
            <canvas id="pingChart"></canvas>
            <script>
                new Chart(document.getElementById('downloadChart'), {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(labels)},
                        datasets: [{
                            label: 'Download Speed (Mbps)',
                            data: ${JSON.stringify(downloadData)},
                            borderColor: 'rgb(75, 192, 192)',
                        }]
                    }
                });
                new Chart(document.getElementById('uploadChart'), {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(labels)},
                        datasets: [{
                            label: 'Upload Speed (Mbps)',
                            data: ${JSON.stringify(uploadData)},
                            borderColor: 'rgb(255, 99, 132)',
                        }]
                    }
                });
                new Chart(document.getElementById('pingChart'), {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(labels)},
                        datasets: [{
                            label: 'Ping (ms)',
                            data: ${JSON.stringify(pingData)},
                            borderColor: 'rgb(54, 162, 235)',
                        }]
                    }
                });
            </script>
        `;
        return html;
    }
}
