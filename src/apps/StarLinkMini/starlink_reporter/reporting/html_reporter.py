"""
Handles all HTML report generation.
"""
import os
from datetime import datetime
from typing import List, Dict, Any

from ..analysis import calculate_heuristic_score
from .utils import format_dataset_name


def get_common_css() -> str:
    """Get the common CSS styles for all reports."""
    return """
            body { 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
                line-height: 1.4;
                margin: 0;
                padding: 20px;
                background-color: #ffffff;
                color: #000000;
                font-size: 13px;
            }
            .container { 
                max-width: 1000px;
                margin: 0 auto;
                background: #ffffff;
                border: 2px solid #000000;
                padding: 30px;
            }
            h1, h2, h3 { 
                color: #000000; 
                font-weight: bold;
                letter-spacing: 1px;
            }
            h1 { 
                text-align: center; 
                border-bottom: 2px solid #000000; 
                padding-bottom: 15px; 
                margin-bottom: 30px;
                font-size: 24px;
            }
            h2 { 
                border-bottom: 1px solid #000000; 
                padding-bottom: 8px; 
                margin-top: 40px;
                font-size: 18px;
            }
            h3 { 
                margin-top: 25px;
                font-size: 16px;
            }
            .summary-grid { 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1px;
                margin: 30px 0;
                border: 2px solid #000000;
            }
            .summary-card { 
                background: #f8f8f8;
                color: #000000;
                padding: 20px;
                text-align: center;
                border-right: 1px solid #000000;
                border-bottom: 1px solid #000000;
            }
            .summary-card:last-child { border-right: none; }
            .summary-card h3 { 
                color: #000000; 
                margin: 0 0 10px 0; 
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .summary-card .value { 
                font-size: 28px; 
                font-weight: bold; 
                display: block;
                margin: 10px 0;
            }
            .summary-card .unit { 
                font-size: 11px; 
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            table { 
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
                background: #ffffff;
                border: 2px solid #000000;
            }
            th, td { 
                padding: 12px 8px;
                text-align: left;
                border-right: 1px solid #000000;
                border-bottom: 1px solid #000000;
            }
            th:last-child, td:last-child { border-right: none; }
            th { 
                background-color: #000000;
                color: #ffffff;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: 11px;
            }
            tr:nth-child(even) { background-color: #f8f8f8; }
            tr:hover { background-color: #eeeeee; }
            .champion { 
                background: #000000;
                color: #ffffff;
                padding: 25px;
                text-align: center;
                margin: 30px 0;
                border: 2px solid #000000;
            }
            .champion h2 { 
                color: #ffffff; 
                border: none; 
                margin: 0 0 15px 0;
                font-size: 20px;
            }
            .metric-positive { font-weight: bold; }
            .metric-negative { font-weight: bold; }
            .metric-good { color: #000000; font-weight: bold; }
            .metric-average { color: #555555; }
            .metric-poor { color: #888888; }
            .rank-1 { background-color: #eeeeee !important; font-weight: bold; }
            .rank-2 { background-color: #f5f5f5 !important; }
            .rank-3 { background-color: #fafafa !important; }
            .timestamp { 
                text-align: center;
                color: #666666;
                margin-top: 40px;
                border-top: 1px solid #000000;
                padding-top: 20px;
                font-size: 11px;
                letter-spacing: 1px;
            }
            .ascii-art {
                text-align: center;
                font-size: 12px;
                line-height: 1.2;
                margin: 20px 0;
                white-space: pre;
            }
            .definition {
                background: #f8f8f8;
                padding: 15px;
                margin: 20px 0;
                border-left: 4px solid #000000;
                font-size: 12px;
            }
            .report-link {
                display: block;
                padding: 15px;
                margin: 10px 0;
                background: #f8f8f8;
                border: 1px solid #000000;
                text-decoration: none;
                color: #000000;
                font-weight: bold;
            }
            .report-link:hover {
                background: #eeeeee;
            }
            .report-meta {
                font-size: 11px;
                color: #666666;
                margin-top: 5px;
            }
    """


def ensure_reports_directory(reports_dir: str) -> str:
    """Ensure the reports directory exists and return its path."""
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
    return reports_dir


def update_reports_index(
    reports_dir: str,
    report_filename: str,
    report_title: str,
    report_description: str,
):
    """Update the reports index.html with a new report link."""
    reports_dir = ensure_reports_directory(reports_dir)
    index_path = os.path.join(reports_dir, "index.html")
    existing_links = []
    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                content = f.read()
                start_marker = "<!-- REPORTS_START -->"
                end_marker = "<!-- REPORTS_END -->"
                if start_marker in content and end_marker in content:
                    start_idx = content.find(start_marker) + len(start_marker)
                    end_idx = content.find(end_marker)
                    existing_links_section = content[start_idx:end_idx].strip()
                    if existing_links_section:
                        existing_links = [existing_links_section]
        except Exception:
            existing_links = []

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_link = f"""
                <a href="{report_filename}" class="report-link">
                    {report_title}
                    <div class="report-meta">{report_description} • Generated: {timestamp}</div>
                </a>"""
    all_links = [new_link] + existing_links
    links_html = "\n".join(all_links)
    total_reports = len(all_links)
    index_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starlink Analysis Reports</title>
        <style>{get_common_css()}</style>
    </head>
    <body>
        <div class="container">
            <div class="ascii-art">
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                        STARLINK ANALYSIS REPORTS                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Reports</h3>
                    <div class="value">{total_reports}</div>
                </div>
                <div class="summary-card">
                    <h3>Latest</h3>
                    <div class="value">{report_title.split()[0]}</div>
                </div>
                <div class="summary-card">
                    <h3>Last Updated</h3>
                    <div class="value">{datetime.now().strftime('%H:%M')}</div>
                    <div class="unit">{datetime.now().strftime('%Y-%m-%d')}</div>
                </div>
            </div>

            <h2>AVAILABLE REPORTS</h2>
            <!-- REPORTS_START -->{links_html}<!-- REPORTS_END -->

            <div class="timestamp">
                Index updated on {timestamp}
            </div>
        </div>
    </body>
    </html>
    """
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    return index_path


def generate_consistency_html_report(
    analyses: List[Dict[str, Any]],
    reports_dir: str,
    output_file: str = "consistency_analysis.html",
):
    """Generate a dedicated HTML consistency analysis report."""
    reports_dir = ensure_reports_directory(reports_dir)
    output_path = os.path.join(reports_dir, output_file)
    sorted_by_stability = sorted(
        analyses,
        key=lambda x: x["consistency"]["stability_scores"]["overall"],
        reverse=True,
    )
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starlink Consistency Analysis Report</title>
        <style>{get_common_css()}</style>
    </head>
    <body>
        <div class="container">
            <div class="ascii-art">
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                     STARLINK CONSISTENCY ANALYSIS                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Datasets</h3>
                    <div class="value">{len(analyses)}</div>
                </div>
                <div class="summary-card">
                    <h3>Most Stable</h3>
                    <div class="value">{sorted_by_stability[0]['filename'].replace('.json', '').replace('_', ' ').upper()}</div>
                </div>
                <div class="summary-card">
                    <h3>Best Stability</h3>
                    <div class="value">{sorted_by_stability[0]['consistency']['stability_scores']['overall']:.1f}</div>
                    <div class="unit">/100</div>
                </div>
                <div class="summary-card">
                    <h3>Avg Stability</h3>
                    <div class="value">{sum(a['consistency']['stability_scores']['overall'] for a in analyses) / len(analyses):.1f}</div>
                    <div class="unit">/100</div>
                </div>
            </div>

            <div class="definition">
                <strong>CONSISTENCY METRICS EXPLAINED:</strong><br>
                • <strong>Standard Deviation:</strong> Lower values indicate more consistent performance<br>
                • <strong>Stability Score:</strong> Higher values (0-100) indicate more reliable connections<br>
                • <strong>Coefficient of Variation:</strong> Normalized measure of variability
            </div>

            <h2>STABILITY RANKINGS</h2>
            <h3>OVERALL STABILITY SCORES (HIGHER = MORE STABLE)</h3>
            <table>
                <tr>
                    <th>Rank</th>
                    <th>Dataset</th>
                    <th>DL Stability</th>
                    <th>UL Stability</th>
                    <th>Lat Stability</th>
                    <th>Overall Score</th>
                </tr>
    """
    for idx, analysis in enumerate(sorted_by_stability):
        filename = format_dataset_name(analysis, case="upper")
        scores = analysis["consistency"]["stability_scores"]
        rank_class = f"rank-{idx + 1}" if idx < 3 else ""
        rank_display = f"#{idx + 1}"
        html_content += f"""
                <tr class="{rank_class}">
                    <td><strong>{rank_display}</strong></td>
                    <td>{filename}</td>
                    <td>{scores['download']:.1f}</td>
                    <td>{scores['upload']:.1f}</td>
                    <td>{scores['latency']:.1f}</td>
                    <td><strong>{scores['overall']:.1f}</strong></td>
                </tr>
        """
    html_content += "</table>"
    html_content += """
            <h2>VARIABILITY ANALYSIS</h2>
            <h3>STANDARD DEVIATIONS (LOWER = MORE CONSISTENT)</h3>
            <table>
                <tr>
                    <th>Dataset</th>
                    <th>Download StdDev</th>
                    <th>Upload StdDev</th>
                    <th>Latency StdDev</th>
                    <th>Consistency Grade</th>
                </tr>
    """
    for analysis in analyses:
        filename = format_dataset_name(analysis, case="upper")
        std = analysis["consistency"]["standard_deviations"]
        overall_stability = analysis["consistency"]["stability_scores"]["overall"]
        if overall_stability >= 80:
            grade = "EXCELLENT"
            grade_class = "metric-good"
        elif overall_stability >= 60:
            grade = "GOOD"
            grade_class = "metric-average"
        else:
            grade = "VARIABLE"
            grade_class = "metric-poor"
        html_content += f"""
                <tr>
                    <td><strong>{filename}</strong></td>
                    <td>{std['download']:.2f} Mbps</td>
                    <td>{std['upload']:.2f} Mbps</td>
                    <td>{std['latency']:.2f} ms</td>
                    <td class="{grade_class}"><strong>{grade}</strong></td>
                </tr>
        """
    html_content += "</table>"
    html_content += """
            <h2>DETAILED CONSISTENCY METRICS</h2>
            <h3>COEFFICIENT OF VARIATION ANALYSIS</h3>
            <table>
                <tr>
                    <th>Dataset</th>
                    <th>DL CoV</th>
                    <th>UL CoV</th>
                    <th>Lat CoV</th>
                    <th>Performance Notes</th>
                </tr>
    """
    for analysis in analyses:
        filename = format_dataset_name(analysis, case="upper")
        cv = analysis["consistency"]["coefficients_of_variation"]
        avg_cv = (cv["download"] + cv["upload"] + cv["latency"]) / 3
        if avg_cv < 0.2:
            notes = "Very stable connection"
        elif avg_cv < 0.4:
            notes = "Generally stable"
        else:
            notes = "Variable performance"
        html_content += f"""
                <tr>
                    <td><strong>{filename}</strong></td>
                    <td>{cv['download']:.3f}</td>
                    <td>{cv['upload']:.3f}</td>
                    <td>{cv['latency']:.3f}</td>
                    <td>{notes}</td>
                </tr>
        """
    html_content += "</table>"
    html_content += f"""
            <div class="timestamp">
                Consistency analysis generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
    </body>
    </html>
    """
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    report_desc = f"Stability analysis of {len(analyses)} dataset(s)"
    update_reports_index(
        reports_dir, output_file, "Consistency Analysis", report_desc
    )
    return output_path


def generate_html_report(
    analyses: List[Dict[str, Any]],
    rankings: Dict[str, Any],
    reports_dir: str,
    output_file: str = "comprehensive_analysis.html",
):
    """Generate a comprehensive HTML report."""
    reports_dir = ensure_reports_directory(reports_dir)
    output_path = os.path.join(reports_dir, output_file)
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starlink Speed Test Analysis Report</title>
        <style>{get_common_css()}</style>
    </head>
    <body>
        <div class="container">
            <div class="ascii-art">
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                        STARLINK SPEED TEST ANALYSIS                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Datasets</h3>
                    <div class="value">{len(analyses)}</div>
                </div>
                <div class="summary-card">
                    <h3>Total Tests</h3>
                    <div class="value">{sum(a['test_count'] for a in analyses)}</div>
                </div>
                <div class="summary-card">
                    <h3>Peak Download</h3>
                    <div class="value">{max(a['averages']['download'] for a in analyses):.1f}</div>
                    <div class="unit">Mbps</div>
                </div>
                <div class="summary-card">
                    <h3>Champion</h3>
                    <div class="value">{(format_dataset_name(next(a for a in analyses if a["filename"] == rankings['heuristic'][0][0]), case='upper')) if rankings else format_dataset_name(analyses[0], case='upper')}</div>
                </div>
            </div>
    """
    html_content += """
            <h2>DATASET COMPARISON OVERVIEW</h2>
            <table>
                <tr>
                    <th>Dataset</th>
                    <th>Tests</th>
                    <th>Avg DL (Mbps)</th>
                    <th>Avg UL (Mbps)</th>
                    <th>Avg Lat (ms)</th>
                    <th>Score</th>
                    <th>Duration</th>
                </tr>
    """
    for analysis in analyses:
        filename = format_dataset_name(analysis, case="upper")
        score = calculate_heuristic_score(analysis)
        html_content += f"""
                <tr>
                    <td><strong>{filename}</strong></td>
                    <td>{analysis['test_count']}</td>
                    <td class="metric-positive">{analysis['averages']['download']:.1f}</td>
                    <td class="metric-positive">{analysis['averages']['upload']:.1f}</td>
                    <td class="metric-negative">{analysis['averages']['latency']:.1f}</td>
                    <td><strong>{score:.2f}</strong></td>
                    <td>{analysis['duration'].split('.')[0] if '.' in analysis['duration'] else analysis['duration']}</td>
                </tr>
        """
    html_content += "</table>"
    if rankings:
        html_content += """
                <h2>PERFORMANCE RANKINGS</h2>
                <h3>OVERALL PERFORMANCE SCORE</h3>
                <table>
                    <tr><th>Rank</th><th>Dataset</th><th>Score</th></tr>
        """
        for idx, (filename, score) in enumerate(rankings["heuristic"]):
            rank_class = f"rank-{idx + 1}" if idx < 3 else ""
            rank_display = f"#{idx + 1}"
            analysis = next((a for a in analyses if a["filename"] == filename), None)
            display_name = (
                format_dataset_name(analysis, case="upper")
                if analysis
                else filename.upper()
            )
            html_content += f"""
                    <tr class="{rank_class}">
                        <td><strong>{rank_display}</strong></td>
                        <td>{display_name}</td>
                        <td>{score:.2f}</td>
                    </tr>
            """
        html_content += "</table>"
        html_content += """
                <h2>CONSISTENCY OVERVIEW</h2>
                <h3>TOP STABILITY SCORES</h3>
                <table>
                    <tr>
                        <th>Rank</th>
                        <th>Dataset</th>
                        <th>Overall Stability</th>
                    </tr>
        """
        sorted_by_stability = sorted(
            analyses,
            key=lambda x: x["consistency"]["stability_scores"]["overall"],
            reverse=True,
        )
        for idx, analysis in enumerate(sorted_by_stability[:5]):
            filename = format_dataset_name(analysis, case="upper")
            scores = analysis["consistency"]["stability_scores"]
            rank_class = f"rank-{idx + 1}" if idx < 3 else ""
            rank_display = f"#{idx + 1}"
            html_content += f"""
                    <tr class="{rank_class}">
                        <td><strong>{rank_display}</strong></td>
                        <td>{filename}</td>
                        <td><strong>{scores['overall']:.1f}/100</strong></td>
                    </tr>
            """
        html_content += "</table>"
    html_content += f"""
            <div class="timestamp">
                Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
    </body>
    </html>
    """
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    report_desc = f"Comprehensive analysis of {len(analyses)} dataset(s)"
    update_reports_index(
        reports_dir, output_file, "Comprehensive Analysis", report_desc
    )
    return output_path
