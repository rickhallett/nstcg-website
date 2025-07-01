#!/usr/bin/env python3
"""
Starlink Speed Test Analysis
Analyzes internet speed test data from JSON files with optional time series plotting
"""

import json
import statistics
import argparse
import glob
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns
from rich.text import Text
from rich.progress import track
from rich import box

try:
    import plotext as plt

    PLOTEXT_AVAILABLE = True
except ImportError:
    PLOTEXT_AVAILABLE = False

console = Console()


def load_speed_data(json_file: str) -> List[Dict[str, Any]]:
    """Load speed test data from JSON file."""
    try:
        with open(json_file, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        console.print(f"[red]Error: {json_file} not found![/red]")
        return []
    except json.JSONDecodeError:
        console.print(f"[red]Error: Invalid JSON in {json_file}![/red]")
        return []


def extract_metrics(data: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    """Extract download, upload, and latency metrics from the data."""
    metrics = {"download": [], "upload": [], "latency": []}

    for entry in track(data, description="Processing speed test data..."):
        try:
            metrics["download"].append(entry["download"]["mbps"])
            metrics["upload"].append(entry["upload"]["mbps"])
            metrics["latency"].append(entry["ping"]["latency"])
        except KeyError as e:
            console.print(f"[yellow]Warning: Missing key {e} in entry[/yellow]")
            continue

    return metrics


def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """Calculate min, median, max for a list of values."""
    if not values:
        return {"min": 0, "median": 0, "max": 0}

    return {"min": min(values), "median": statistics.median(values), "max": max(values)}


def get_directional_info(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract directional and tilt information."""
    if not data:
        return {}

    # Get unique directions and tilts
    directions = [entry.get("direction_degrees", 0) for entry in data]
    tilts = [entry.get("tilt", 0) for entry in data]

    return {
        "direction_degrees": list(set(directions)),
        "tilt_degrees": list(set(tilts)),
        "primary_direction": statistics.mode(directions) if directions else 0,
        "primary_tilt": statistics.mode(tilts) if tilts else 0,
    }


def create_statistics_table(metrics: Dict[str, List[float]]) -> Table:
    """Create a Rich table with speed statistics."""
    table = Table(title="📊 Speed Test Statistics", box=box.ROUNDED)

    table.add_column("Metric", style="cyan", no_wrap=True)
    table.add_column("Minimum", style="green")
    table.add_column("Median", style="yellow")
    table.add_column("Maximum", style="red")
    table.add_column("Unit", style="white")

    # Download speeds
    download_stats = calculate_statistics(metrics["download"])
    table.add_row(
        "🔽 Download",
        f"{download_stats['min']:.2f}",
        f"{download_stats['median']:.2f}",
        f"{download_stats['max']:.2f}",
        "Mbps",
    )

    # Upload speeds
    upload_stats = calculate_statistics(metrics["upload"])
    table.add_row(
        "🔼 Upload",
        f"{upload_stats['min']:.2f}",
        f"{upload_stats['median']:.2f}",
        f"{upload_stats['max']:.2f}",
        "Mbps",
    )

    # Latency
    latency_stats = calculate_statistics(metrics["latency"])
    table.add_row(
        "📡 Latency",
        f"{latency_stats['min']:.2f}",
        f"{latency_stats['median']:.2f}",
        f"{latency_stats['max']:.2f}",
        "ms",
    )

    return table


def create_directional_panel(directional_info: Dict[str, Any]) -> Panel:
    """Create a Rich panel with directional information."""
    if not directional_info:
        return Panel("No directional data available", title="📍 Antenna Configuration")

    content = []

    # Primary direction and tilt
    content.append(
        f"🧭 Primary Direction: [bold blue]{directional_info.get('primary_direction', 'N/A')}°[/bold blue]"
    )
    content.append(
        f"📐 Primary Tilt: [bold green]{directional_info.get('primary_tilt', 'N/A')}°[/bold green]"
    )

    # All unique directions
    if directional_info.get("direction_degrees"):
        directions_str = ", ".join(
            [f"{d}°" for d in sorted(directional_info["direction_degrees"])]
        )
        content.append(f"🔄 All Directions: {directions_str}")

    # All unique tilts
    if directional_info.get("tilt_degrees"):
        tilts_str = ", ".join(
            [f"{t}°" for t in sorted(directional_info["tilt_degrees"])]
        )
        content.append(f"⚡ All Tilts: {tilts_str}")

    return Panel(
        "\n".join(content), title="📍 Antenna Configuration", border_style="blue"
    )


def create_summary_panel(
    data: List[Dict[str, Any]], metrics: Dict[str, List[float]]
) -> Panel:
    """Create a summary panel with key information."""
    test_count = len(data)
    time_span = ""

    if data:
        try:
            first_test = datetime.fromisoformat(
                data[0]["timestamp"].replace("Z", "+00:00")
            )
            last_test = datetime.fromisoformat(
                data[-1]["timestamp"].replace("Z", "+00:00")
            )
            duration = last_test - first_test
            time_span = f"⏱️ Test Duration: [bold]{duration}[/bold]"
        except (ValueError, KeyError):
            time_span = "⏱️ Test Duration: Unable to calculate"

    # Calculate averages
    avg_download = statistics.mean(metrics["download"]) if metrics["download"] else 0
    avg_upload = statistics.mean(metrics["upload"]) if metrics["upload"] else 0
    avg_latency = statistics.mean(metrics["latency"]) if metrics["latency"] else 0

    content = [
        f"📋 Total Tests: [bold cyan]{test_count}[/bold cyan]",
        time_span,
        f"📊 Average Download: [bold green]{avg_download:.2f} Mbps[/bold green]",
        f"📈 Average Upload: [bold yellow]{avg_upload:.2f} Mbps[/bold yellow]",
        f"⚡ Average Latency: [bold red]{avg_latency:.2f} ms[/bold red]",
    ]

    return Panel("\n".join(content), title="📋 Test Summary", border_style="green")


def find_json_files(directory: str = ".") -> List[str]:
    """Find all JSON files in the specified directory."""
    pattern = os.path.join(directory, "*.json")
    json_files = glob.glob(pattern)
    return sorted(json_files)


def validate_schema(data: List[Dict[str, Any]]) -> bool:
    """Validate that the data matches the expected speed test schema."""
    if not data or not isinstance(data, list):
        return False

    # Check if at least one entry has the required structure
    required_fields = ["download", "upload", "ping"]
    sample = data[0] if data else {}

    try:
        # Check basic structure
        if not all(field in sample for field in required_fields):
            return False

        # Check nested structure
        if not (
            "mbps" in sample["download"]
            and "mbps" in sample["upload"]
            and "latency" in sample["ping"]
        ):
            return False

        # Validate data types
        float(sample["download"]["mbps"])
        float(sample["upload"]["mbps"])
        float(sample["ping"]["latency"])

        return True
    except (KeyError, ValueError, TypeError):
        return False


def analyze_file_silent(json_file: str) -> Optional[Dict[str, Any]]:
    """Analyze a single file and return results without printing."""
    data = load_speed_data(json_file)

    if not data:
        return None

    if not validate_schema(data):
        return None

    metrics = extract_metrics(data)
    directional_info = get_directional_info(data)

    # Calculate statistics
    download_stats = calculate_statistics(metrics["download"])
    upload_stats = calculate_statistics(metrics["upload"])
    latency_stats = calculate_statistics(metrics["latency"])

    # Calculate averages
    avg_download = statistics.mean(metrics["download"]) if metrics["download"] else 0
    avg_upload = statistics.mean(metrics["upload"]) if metrics["upload"] else 0
    avg_latency = statistics.mean(metrics["latency"]) if metrics["latency"] else 0

    # Calculate time span
    duration_str = "Unknown"
    timestamps = []
    if data:
        try:
            first_test = datetime.fromisoformat(
                data[0]["timestamp"].replace("Z", "+00:00")
            )
            last_test = datetime.fromisoformat(
                data[-1]["timestamp"].replace("Z", "+00:00")
            )
            duration = last_test - first_test
            duration_str = str(duration)

            # Extract timestamps for time series plotting
            for entry in data:
                ts = datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
                timestamps.append(ts)
        except (ValueError, KeyError):
            pass

    return {
        "filename": os.path.basename(json_file),
        "filepath": json_file,
        "test_count": len(data),
        "duration": duration_str,
        "metrics": metrics,
        "timestamps": timestamps,
        "download_stats": download_stats,
        "upload_stats": upload_stats,
        "latency_stats": latency_stats,
        "averages": {
            "download": avg_download,
            "upload": avg_upload,
            "latency": avg_latency,
        },
        "directional_info": directional_info,
    }


def calculate_heuristic_score(analysis: Dict[str, Any]) -> float:
    """Calculate a heuristic performance score for ranking."""
    avg_download = analysis["averages"]["download"]
    avg_upload = analysis["averages"]["upload"]
    avg_latency = analysis["averages"]["latency"]

    if avg_latency == 0:
        return 0

    # Heuristic: (download + upload) / latency
    # Higher speeds and lower latency = better score
    score = (avg_download + avg_upload) / avg_latency
    return score


def rank_datasets(analyses: List[Dict[str, Any]]) -> Dict[str, List[Tuple[str, float]]]:
    """Rank datasets by multiple criteria."""
    rankings = {}

    # Heuristic score ranking
    heuristic_scores = [(a["filename"], calculate_heuristic_score(a)) for a in analyses]
    rankings["heuristic"] = sorted(heuristic_scores, key=lambda x: x[1], reverse=True)

    # Average metrics rankings
    avg_download = [(a["filename"], a["averages"]["download"]) for a in analyses]
    avg_upload = [(a["filename"], a["averages"]["upload"]) for a in analyses]
    avg_latency = [(a["filename"], a["averages"]["latency"]) for a in analyses]

    rankings["avg_download"] = sorted(avg_download, key=lambda x: x[1], reverse=True)
    rankings["avg_upload"] = sorted(avg_upload, key=lambda x: x[1], reverse=True)
    rankings["avg_latency"] = sorted(avg_latency, key=lambda x: x[1])  # Lower is better

    # Median metrics rankings
    median_download = [(a["filename"], a["download_stats"]["median"]) for a in analyses]
    median_upload = [(a["filename"], a["upload_stats"]["median"]) for a in analyses]
    median_latency = [(a["filename"], a["latency_stats"]["median"]) for a in analyses]

    rankings["median_download"] = sorted(
        median_download, key=lambda x: x[1], reverse=True
    )
    rankings["median_upload"] = sorted(median_upload, key=lambda x: x[1], reverse=True)
    rankings["median_latency"] = sorted(
        median_latency, key=lambda x: x[1]
    )  # Lower is better

    # Maximum metrics rankings
    max_download = [(a["filename"], a["download_stats"]["max"]) for a in analyses]
    max_upload = [(a["filename"], a["upload_stats"]["max"]) for a in analyses]

    rankings["max_download"] = sorted(max_download, key=lambda x: x[1], reverse=True)
    rankings["max_upload"] = sorted(max_upload, key=lambda x: x[1], reverse=True)

    # Minimum metrics rankings
    min_download = [(a["filename"], a["download_stats"]["min"]) for a in analyses]
    min_upload = [(a["filename"], a["upload_stats"]["min"]) for a in analyses]

    rankings["min_download"] = sorted(min_download, key=lambda x: x[1], reverse=True)
    rankings["min_upload"] = sorted(min_upload, key=lambda x: x[1], reverse=True)

    return rankings


def create_ranking_table(
    ranking_data: List[Tuple[str, float]],
    title: str,
    metric_unit: str = "",
    reverse_ranking: bool = False,
) -> Table:
    """Create a ranking table with Rich formatting."""
    table = Table(title=title, box=box.ROUNDED)

    table.add_column("Rank", style="bold cyan", width=6)
    table.add_column("Dataset", style="white", min_width=20)
    table.add_column(
        "Value",
        style="bold green" if not reverse_ranking else "bold red",
        justify="right",
    )

    for idx, (filename, value) in enumerate(ranking_data, 1):
        # Color coding for ranks
        if idx == 1:
            rank_style = "🥇"
        elif idx == 2:
            rank_style = "🥈"
        elif idx == 3:
            rank_style = "🥉"
        else:
            rank_style = f"{idx}"

        # Format filename for display
        display_name = filename.replace(".json", "").replace("_", " ").title()

        # Format value
        if metric_unit:
            value_str = f"{value:.2f} {metric_unit}"
        else:
            value_str = f"{value:.2f}"

        table.add_row(rank_style, display_name, value_str)

    return table


def create_summary_comparison_table(analyses: List[Dict[str, Any]]) -> Table:
    """Create a comprehensive comparison table of all datasets."""
    table = Table(title="📊 Dataset Comparison Summary", box=box.ROUNDED)

    table.add_column("Dataset", style="cyan", min_width=15)
    table.add_column("Tests", style="white", justify="center")
    table.add_column("Avg DL", style="green", justify="right")
    table.add_column("Avg UL", style="yellow", justify="right")
    table.add_column("Avg Lat", style="red", justify="right")
    table.add_column("Score", style="bold magenta", justify="right")
    table.add_column("Duration", style="blue", justify="center")

    for analysis in analyses:
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
        score = calculate_heuristic_score(analysis)

        table.add_row(
            filename,
            str(analysis["test_count"]),
            f"{analysis['averages']['download']:.1f}",
            f"{analysis['averages']['upload']:.1f}",
            f"{analysis['averages']['latency']:.1f}",
            f"{score:.1f}",
            (
                analysis["duration"].split(".")[0]
                if "." in analysis["duration"]
                else analysis["duration"]
            ),
        )

    return table


def extract_time_series_data(
    analyses: List[Dict[str, Any]],
) -> Dict[str, Dict[str, List]]:
    """Extract time series data from all analyses for plotting."""
    time_series = {}

    for analysis in analyses:
        filename = analysis["filename"]
        timestamps = analysis.get("timestamps", [])
        metrics = analysis["metrics"]

        if not timestamps:
            # Fallback to sequence numbers if no timestamps
            num_points = len(metrics["download"])
            timestamps = list(range(num_points))
        else:
            # Convert timestamps to minutes since start for better plotting
            if timestamps:
                start_time = timestamps[0]
                timestamps = [
                    (ts - start_time).total_seconds() / 60 for ts in timestamps
                ]

        time_series[filename] = {
            "timestamps": timestamps,
            "download_speeds": metrics["download"],
            "upload_speeds": metrics["upload"],
            "latencies": metrics["latency"],
        }

    return time_series


def create_time_series_plots(time_series_data: Dict[str, Dict[str, List]]):
    """Create time series plots for each metric using plotext."""
    if not PLOTEXT_AVAILABLE:
        console.print(
            "[yellow]⚠ plotext not available. Install with: pip install plotext[/yellow]"
        )
        return

    if not time_series_data:
        return

    # Define colors for different datasets
    colors = ["red", "green", "blue", "yellow", "magenta", "cyan", "white"]

    console.print("\n")
    console.print("[bold]📈 Time Series Analysis[/bold]")
    console.print("Showing performance trends over time for each dataset\n")

    # Check if we have real timestamps or sequence numbers
    has_real_timestamps = any(
        isinstance(data["timestamps"][0], float)
        for data in time_series_data.values()
        if data["timestamps"]
    )
    x_label = "Time (minutes)" if has_real_timestamps else "Test Sequence"

    # Calculate global min/max values for standardized y-axes
    all_download_speeds = []
    all_upload_speeds = []
    all_latencies = []
    all_timestamps = []

    for data in time_series_data.values():
        all_download_speeds.extend(data["download_speeds"])
        all_upload_speeds.extend(data["upload_speeds"])
        all_latencies.extend(data["latencies"])
        all_timestamps.extend(data["timestamps"])

    # Add some padding to the ranges for better visualization
    download_padding = (max(all_download_speeds) - min(all_download_speeds)) * 0.1
    upload_padding = (max(all_upload_speeds) - min(all_upload_speeds)) * 0.1
    latency_padding = (max(all_latencies) - min(all_latencies)) * 0.1

    download_min = max(0, min(all_download_speeds) - download_padding)
    download_max = max(all_download_speeds) + download_padding
    upload_min = max(0, min(all_upload_speeds) - upload_padding)
    upload_max = max(all_upload_speeds) + upload_padding
    latency_min = max(0, min(all_latencies) - latency_padding)
    latency_max = max(all_latencies) + latency_padding

    # Set smaller plot size for more compact display
    plot_width = 80
    plot_height = 20

    # Plot 1: Download Speeds Over Time
    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("📊 Download Speeds Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Download Speed (Mbps)")

    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        label = filename.replace(".json", "").replace("_", " ").title()
        plt.plot(
            data["timestamps"],
            data["download_speeds"],
            label=label,
            color=color,
            marker="braille",
        )

    plt.ylim(download_min, download_max)
    plt.show()

    # Plot 2: Upload Speeds Over Time
    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("📈 Upload Speeds Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Upload Speed (Mbps)")

    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        label = filename.replace(".json", "").replace("_", " ").title()
        plt.plot(
            data["timestamps"],
            data["upload_speeds"],
            label=label,
            color=color,
            marker="braille",
        )

    plt.ylim(upload_min, upload_max)
    plt.show()

    # Plot 3: Latency Over Time
    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("⚡ Latency Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Latency (ms)")

    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        label = filename.replace(".json", "").replace("_", " ").title()
        plt.plot(
            data["timestamps"],
            data["latencies"],
            label=label,
            color=color,
            marker="braille",
        )

    plt.ylim(latency_min, latency_max)
    plt.show()


def calculate_consistency_metrics(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate consistency and stability metrics for a single dataset."""
    metrics = analysis["metrics"]

    # Calculate standard deviations
    download_std = (
        statistics.stdev(metrics["download"]) if len(metrics["download"]) > 1 else 0
    )
    upload_std = (
        statistics.stdev(metrics["upload"]) if len(metrics["upload"]) > 1 else 0
    )
    latency_std = (
        statistics.stdev(metrics["latency"]) if len(metrics["latency"]) > 1 else 0
    )

    # Calculate coefficients of variation (CV = std/mean)
    download_cv = (
        download_std / analysis["averages"]["download"]
        if analysis["averages"]["download"] > 0
        else 0
    )
    upload_cv = (
        upload_std / analysis["averages"]["upload"]
        if analysis["averages"]["upload"] > 0
        else 0
    )
    latency_cv = (
        latency_std / analysis["averages"]["latency"]
        if analysis["averages"]["latency"] > 0
        else 0
    )

    # Calculate stability scores (lower CV = higher stability, scale 0-100)
    download_stability = max(0, 100 - (download_cv * 100))
    upload_stability = max(0, 100 - (upload_cv * 100))
    latency_stability = max(0, 100 - (latency_cv * 100))

    # Overall stability score (weighted average)
    overall_stability = (
        download_stability * 0.4 + upload_stability * 0.3 + latency_stability * 0.3
    )

    return {
        "standard_deviations": {
            "download": download_std,
            "upload": upload_std,
            "latency": latency_std,
        },
        "coefficients_of_variation": {
            "download": download_cv,
            "upload": upload_cv,
            "latency": latency_cv,
        },
        "stability_scores": {
            "download": download_stability,
            "upload": upload_stability,
            "latency": latency_stability,
            "overall": overall_stability,
        },
    }


def create_consistency_analysis_tables(analyses: List[Dict[str, Any]]) -> List[Table]:
    """Create Rich tables for consistency analysis."""
    tables = []

    # Add consistency metrics to analyses
    for analysis in analyses:
        analysis["consistency"] = calculate_consistency_metrics(analysis)

    # Standard Deviations Table
    std_table = Table(
        title="📊 Standard Deviations (Lower = More Consistent)", box=box.ROUNDED
    )
    std_table.add_column("Dataset", style="cyan", min_width=15)
    std_table.add_column("Download", style="green", justify="right")
    std_table.add_column("Upload", style="yellow", justify="right")
    std_table.add_column("Latency", style="red", justify="right")

    for analysis in analyses:
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
        std = analysis["consistency"]["standard_deviations"]
        std_table.add_row(
            filename,
            f"{std['download']:.2f} Mbps",
            f"{std['upload']:.2f} Mbps",
            f"{std['latency']:.2f} ms",
        )

    tables.append(std_table)

    # Stability Scores Table
    stability_table = Table(
        title="🎯 Stability Scores (Higher = More Stable)", box=box.ROUNDED
    )
    stability_table.add_column("Dataset", style="cyan", min_width=15)
    stability_table.add_column("Download", style="green", justify="right")
    stability_table.add_column("Upload", style="yellow", justify="right")
    stability_table.add_column("Latency", style="red", justify="right")
    stability_table.add_column("Overall", style="bold magenta", justify="right")

    # Sort by overall stability
    sorted_analyses = sorted(
        analyses,
        key=lambda x: x["consistency"]["stability_scores"]["overall"],
        reverse=True,
    )

    for idx, analysis in enumerate(sorted_analyses):
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
        scores = analysis["consistency"]["stability_scores"]

        # Add rank emoji
        rank_emoji = (
            "🥇"
            if idx == 0
            else "🥈" if idx == 1 else "🥉" if idx == 2 else f"{idx + 1}"
        )

        stability_table.add_row(
            f"{rank_emoji} {filename}",
            f"{scores['download']:.1f}",
            f"{scores['upload']:.1f}",
            f"{scores['latency']:.1f}",
            f"{scores['overall']:.1f}",
        )

    tables.append(stability_table)

    return tables


def generate_html_report(
    analyses: List[Dict[str, Any]], output_file: str = "starlink_analysis_report.html"
):
    """Generate a comprehensive HTML report."""

    # Calculate consistency metrics if not already done
    for analysis in analyses:
        if "consistency" not in analysis:
            analysis["consistency"] = calculate_consistency_metrics(analysis)

    # Get rankings
    rankings = rank_datasets(analyses)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starlink Speed Test Analysis Report</title>
        <style>
            body {{ 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{ 
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }}
            h1, h2, h3 {{ color: #2c3e50; }}
            h1 {{ text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
            h2 {{ border-left: 4px solid #3498db; padding-left: 15px; margin-top: 30px; }}
            .summary-grid {{ 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }}
            .summary-card {{ 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }}
            .summary-card h3 {{ color: white; margin-top: 0; }}
            .summary-card .value {{ font-size: 2em; font-weight: bold; }}
            .summary-card .unit {{ font-size: 0.8em; opacity: 0.8; }}
            table {{ 
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
            }}
            th, td {{ 
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }}
            th {{ 
                background-color: #3498db;
                color: white;
                font-weight: bold;
            }}
            tr:nth-child(even) {{ background-color: #f2f2f2; }}
            tr:hover {{ background-color: #e8f4fd; }}
            .champion {{ 
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                margin: 20px 0;
            }}
            .champion h2 {{ color: white; border: none; margin: 0; }}
            .metric-positive {{ color: #27ae60; font-weight: bold; }}
            .metric-negative {{ color: #e74c3c; font-weight: bold; }}
            .rank-1 {{ background-color: #f1c40f !important; }}
            .rank-2 {{ background-color: #95a5a6 !important; }}
            .rank-3 {{ background-color: #cd7f32 !important; }}
            .timestamp {{ 
                text-align: center;
                color: #7f8c8d;
                font-style: italic;
                margin-top: 30px;
                border-top: 1px solid #eee;
                padding-top: 15px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛰️ Starlink Speed Test Analysis Report</h1>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>📊 Datasets Analyzed</h3>
                    <div class="value">{len(analyses)}</div>
                </div>
                <div class="summary-card">
                    <h3>📈 Total Tests</h3>
                    <div class="value">{sum(a['test_count'] for a in analyses)}</div>
                </div>
                <div class="summary-card">
                    <h3>⚡ Best Download</h3>
                    <div class="value">{max(a['averages']['download'] for a in analyses):.1f}</div>
                    <div class="unit">Mbps</div>
                </div>
                <div class="summary-card">
                    <h3>🏆 Champion</h3>
                    <div class="value">{rankings['heuristic'][0][0].replace('.json', '').replace('_', ' ').title()}</div>
                </div>
            </div>
    """

    # Dataset Comparison Table
    html_content += """
            <h2>📊 Dataset Comparison Overview</h2>
            <table>
                <tr>
                    <th>Dataset</th>
                    <th>Tests</th>
                    <th>Avg Download (Mbps)</th>
                    <th>Avg Upload (Mbps)</th>
                    <th>Avg Latency (ms)</th>
                    <th>Performance Score</th>
                    <th>Duration</th>
                </tr>
    """

    for analysis in analyses:
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
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

    # Performance Rankings
    html_content += """
            <h2>🏆 Performance Rankings</h2>
            <h3>🎯 Overall Performance Score</h3>
            <table>
                <tr><th>Rank</th><th>Dataset</th><th>Score</th></tr>
    """

    for idx, (filename, score) in enumerate(rankings["heuristic"]):
        rank_class = f"rank-{idx + 1}" if idx < 3 else ""
        rank_emoji = (
            "🥇"
            if idx == 0
            else "🥈" if idx == 1 else "🥉" if idx == 2 else f"{idx + 1}"
        )
        display_name = filename.replace(".json", "").replace("_", " ").title()
        html_content += f"""
                <tr class="{rank_class}">
                    <td><strong>{rank_emoji}</strong></td>
                    <td>{display_name}</td>
                    <td>{score:.2f} pts</td>
                </tr>
        """

    html_content += "</table>"

    # Consistency Analysis
    html_content += """
            <h2>📈 Consistency Analysis</h2>
            <h3>🎯 Stability Scores (Higher = More Stable)</h3>
            <table>
                <tr>
                    <th>Rank</th>
                    <th>Dataset</th>
                    <th>Download Stability</th>
                    <th>Upload Stability</th>
                    <th>Latency Stability</th>
                    <th>Overall Stability</th>
                </tr>
    """

    sorted_by_stability = sorted(
        analyses,
        key=lambda x: x["consistency"]["stability_scores"]["overall"],
        reverse=True,
    )

    for idx, analysis in enumerate(sorted_by_stability):
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
        scores = analysis["consistency"]["stability_scores"]
        rank_class = f"rank-{idx + 1}" if idx < 3 else ""
        rank_emoji = (
            "🥇"
            if idx == 0
            else "🥈" if idx == 1 else "🥉" if idx == 2 else f"{idx + 1}"
        )

        html_content += f"""
                <tr class="{rank_class}">
                    <td><strong>{rank_emoji}</strong></td>
                    <td>{filename}</td>
                    <td>{scores['download']:.1f}</td>
                    <td>{scores['upload']:.1f}</td>
                    <td>{scores['latency']:.1f}</td>
                    <td><strong>{scores['overall']:.1f}</strong></td>
                </tr>
        """

    html_content += "</table>"

    # Statistical Details
    html_content += """
            <h2>📊 Statistical Details</h2>
            <h3>📏 Standard Deviations (Lower = More Consistent)</h3>
            <table>
                <tr><th>Dataset</th><th>Download (Mbps)</th><th>Upload (Mbps)</th><th>Latency (ms)</th></tr>
    """

    for analysis in analyses:
        filename = analysis["filename"].replace(".json", "").replace("_", " ").title()
        std = analysis["consistency"]["standard_deviations"]
        html_content += f"""
                <tr>
                    <td><strong>{filename}</strong></td>
                    <td>{std['download']:.2f}</td>
                    <td>{std['upload']:.2f}</td>
                    <td>{std['latency']:.2f}</td>
                </tr>
        """

    html_content += "</table>"

    # Champion announcement
    if rankings["heuristic"]:
        winner = rankings["heuristic"][0]
        winner_analysis = next(a for a in analyses if a["filename"] == winner[0])
        winner_stability = winner_analysis["consistency"]["stability_scores"]["overall"]

        html_content += f"""
            <div class="champion">
                <h2>🎉 Champion Dataset</h2>
                <h3>🏆 Overall Winner: {winner[0].replace('.json', '').replace('_', ' ').title()}</h3>
                <p><strong>Performance Score:</strong> {winner[1]:.2f} points</p>
                <p><strong>Stability Score:</strong> {winner_stability:.1f}/100</p>
            </div>
        """

    # Footer
    from datetime import datetime

    html_content += f"""
            <div class="timestamp">
                Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
    </body>
    </html>
    """

    # Write the HTML file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    return output_file


def present_comparative_analysis(
    analyses: List[Dict[str, Any]],
    show_plots: bool = False,
    show_consistency: bool = False,
    generate_report: bool = False,
):
    """Present comprehensive comparative analysis with Rich formatting."""
    console.print("\n")
    console.print(
        Panel.fit(
            "[bold blue]📊 Comparative Analysis Results[/bold blue]\n[dim]Ranking datasets across multiple performance metrics[/dim]",
            border_style="blue",
        )
    )

    rankings = rank_datasets(analyses)

    # Summary comparison table
    console.print("\n")
    summary_table = create_summary_comparison_table(analyses)
    console.print(summary_table)

    # Create ranking tables
    console.print("\n")
    console.print("[bold]🏆 Performance Rankings[/bold]")

    # Heuristic score ranking (most important)
    heuristic_table = create_ranking_table(
        rankings["heuristic"], "🎯 Overall Performance Score", "pts"
    )

    # Average metrics rankings
    avg_dl_table = create_ranking_table(
        rankings["avg_download"], "📊 Average Download Speed", "Mbps"
    )

    avg_ul_table = create_ranking_table(
        rankings["avg_upload"], "📈 Average Upload Speed", "Mbps"
    )

    avg_lat_table = create_ranking_table(
        rankings["avg_latency"], "⚡ Average Latency", "ms", reverse_ranking=True
    )

    # Display in columns
    console.print("\n")
    from rich.columns import Columns

    console.print(Columns([heuristic_table, avg_dl_table]))

    console.print("\n")
    console.print(Columns([avg_ul_table, avg_lat_table]))

    # Median rankings
    console.print("\n")
    console.print("[bold]📊 Median Performance Rankings[/bold]")

    med_dl_table = create_ranking_table(
        rankings["median_download"], "🔽 Median Download Speed", "Mbps"
    )

    med_ul_table = create_ranking_table(
        rankings["median_upload"], "🔼 Median Upload Speed", "Mbps"
    )

    med_lat_table = create_ranking_table(
        rankings["median_latency"], "📡 Median Latency", "ms", reverse_ranking=True
    )

    console.print(Columns([med_dl_table, med_ul_table, med_lat_table]))

    # Peak performance rankings
    console.print("\n")
    console.print("[bold]🚀 Peak Performance Rankings[/bold]")

    max_dl_table = create_ranking_table(
        rankings["max_download"], "⚡ Maximum Download Speed", "Mbps"
    )

    max_ul_table = create_ranking_table(
        rankings["max_upload"], "⚡ Maximum Upload Speed", "Mbps"
    )

    console.print(Columns([max_dl_table, max_ul_table]))

    # Minimum performance rankings
    console.print("\n")
    console.print("[bold]📉 Minimum Performance Rankings[/bold]")

    min_dl_table = create_ranking_table(
        rankings["min_download"], "🔻 Minimum Download Speed", "Mbps"
    )

    min_ul_table = create_ranking_table(
        rankings["min_upload"], "🔻 Minimum Upload Speed", "Mbps"
    )

    console.print(Columns([min_dl_table, min_ul_table]))

    # Consistency analysis if requested
    if show_consistency:
        console.print("\n")
        console.print("[bold yellow]📈 Consistency & Stability Analysis[/bold yellow]")
        consistency_tables = create_consistency_analysis_tables(analyses)
        for table in consistency_tables:
            console.print("\n")
            console.print(table)

    # Time series plots
    if show_plots:
        time_series_data = extract_time_series_data(analyses)
        create_time_series_plots(time_series_data)

    # Winner announcement (with stability info if available)
    if rankings["heuristic"]:
        winner = rankings["heuristic"][0]
        winner_analysis = next(a for a in analyses if a["filename"] == winner[0])

        # Add stability info if consistency analysis was done
        stability_info = ""
        if "consistency" in winner_analysis:
            stability_score = winner_analysis["consistency"]["stability_scores"][
                "overall"
            ]
            stability_info = (
                f"\nStability Score: [bold cyan]{stability_score:.1f}/100[/bold cyan]"
            )

        console.print("\n")
        console.print(
            Panel(
                f"🏆 Overall Winner: [bold green]{winner[0].replace('.json', '').replace('_', ' ').title()}[/bold green]\n"
                f"Performance Score: [bold yellow]{winner[1]:.2f} points[/bold yellow]{stability_info}",
                title="🎉 Champion Dataset",
                border_style="gold1",
            )
        )

    # Generate HTML report if requested
    if generate_report:
        console.print("\n")
        console.print(
            "[bold green]📄 Generating comprehensive HTML report...[/bold green]"
        )

        with console.status("[bold green]Creating report..."):
            report_file = generate_html_report(analyses)

        console.print(
            Panel(
                f"[bold green]✅ Report generated successfully![/bold green]\n"
                f"📄 File: [bold]{report_file}[/bold]\n"
                f"🌐 [dim]Open this file in your web browser to view the comprehensive report[/dim]",
                title="Report Ready",
                style="bold green",
            )
        )


def main():
    """Main analysis function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Analyze Starlink speed test data from JSON files with optional time series plotting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Create mutually exclusive group for file modes
    file_group = parser.add_mutually_exclusive_group(required=True)
    file_group.add_argument(
        "-f",
        "--file",
        help="Path to the JSON file containing speed test data",
    )
    file_group.add_argument(
        "-a",
        "--all",
        action="store_true",
        help="Analyze all JSON files in the current directory and provide comparative rankings",
    )

    parser.add_argument(
        "--plots",
        action="store_true",
        help="Show time series plots (requires plotext)",
    )

    parser.add_argument(
        "--consistency",
        action="store_true",
        help="Perform consistency and stability analysis",
    )

    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate comprehensive HTML report",
    )

    args = parser.parse_args()

    console.print(
        Panel.fit(
            "[bold blue]Starlink Speed Test Analysis[/bold blue]\n[dim]Analyzing internet performance data[/dim]",
            border_style="blue",
        )
    )

    if args.all:
        # Comparative analysis mode
        console.print(
            "\n[bold]🔍 Scanning for JSON files in current directory...[/bold]"
        )
        json_files = find_json_files()

        if not json_files:
            console.print(
                "[red]No JSON files found in current directory. Exiting.[/red]"
            )
            return

        console.print(f"[green]✓ Found {len(json_files)} JSON files[/green]")

        # Analyze each file silently
        valid_analyses = []
        invalid_files = []

        with console.status("[bold green]Analyzing datasets...") as status:
            for json_file in json_files:
                status.update(f"[bold green]Analyzing {os.path.basename(json_file)}...")
                analysis = analyze_file_silent(json_file)
                if analysis:
                    valid_analyses.append(analysis)
                else:
                    invalid_files.append(json_file)

        if not valid_analyses:
            console.print("[red]No valid speed test datasets found. Exiting.[/red]")
            return

        console.print(
            f"\n[green]✓ Successfully analyzed {len(valid_analyses)} datasets[/green]"
        )

        if invalid_files:
            console.print(
                f"[yellow]⚠ Skipped {len(invalid_files)} invalid files: {', '.join([os.path.basename(f) for f in invalid_files])}[/yellow]"
            )

        # Present comparative analysis
        present_comparative_analysis(
            valid_analyses,
            show_plots=args.plots,
            show_consistency=args.consistency,
            generate_report=args.report,
        )

    else:
        # Single file analysis mode
        console.print(f"\n[bold]Loading speed test data from {args.file}...[/bold]")
        data = load_speed_data(args.file)

        if not data:
            console.print("[red]No data to analyze. Exiting.[/red]")
            return

        console.print(f"[green]✓ Loaded {len(data)} speed test records[/green]")

        # Extract metrics
        metrics = extract_metrics(data)

        # Get directional information
        directional_info = get_directional_info(data)

        # Create visualizations
        console.print("\n")

        # Summary panel
        summary_panel = create_summary_panel(data, metrics)
        console.print(summary_panel)

        console.print("\n")

        # Statistics table
        stats_table = create_statistics_table(metrics)
        console.print(stats_table)

        console.print("\n")

        # Directional panel
        directional_panel = create_directional_panel(directional_info)
        console.print(directional_panel)

        # Handle consistency analysis for single file
        if args.consistency:
            console.print("\n")
            console.print(
                "[bold yellow]📈 Consistency & Stability Analysis[/bold yellow]"
            )

            # Create a mini analysis object for consistency calculation
            analysis_obj = {
                "filename": args.file,
                "metrics": metrics,
                "averages": {
                    "download": sum(metrics["download"]) / len(metrics["download"]),
                    "upload": sum(metrics["upload"]) / len(metrics["upload"]),
                    "latency": sum(metrics["latency"]) / len(metrics["latency"]),
                },
            }
            consistency = calculate_consistency_metrics(analysis_obj)

            # Create a simple consistency panel for single file
            consistency_text = f"""
📊 [bold]Standard Deviations[/bold] (Lower = More Consistent)
• Download: [green]{consistency['standard_deviations']['download']:.2f} Mbps[/green]
• Upload: [yellow]{consistency['standard_deviations']['upload']:.2f} Mbps[/yellow]
• Latency: [red]{consistency['standard_deviations']['latency']:.2f} ms[/red]

🎯 [bold]Stability Scores[/bold] (Higher = More Stable)
• Download: [green]{consistency['stability_scores']['download']:.1f}/100[/green]
• Upload: [yellow]{consistency['stability_scores']['upload']:.1f}/100[/yellow]
• Latency: [red]{consistency['stability_scores']['latency']:.1f}/100[/red]
• Overall: [bold magenta]{consistency['stability_scores']['overall']:.1f}/100[/bold magenta]
            """

            consistency_panel = Panel(
                consistency_text, title="📈 Consistency Analysis", style="yellow"
            )
            console.print(consistency_panel)

        # Handle report generation for single file
        if args.report:
            console.print("\n")
            console.print(
                "[bold green]📄 Generating HTML report for single dataset...[/bold green]"
            )

            # Create analysis object for report generation
            analysis_obj = {
                "filename": args.file,
                "test_count": len(data),
                "metrics": metrics,
                "averages": {
                    "download": sum(metrics["download"]) / len(metrics["download"]),
                    "upload": sum(metrics["upload"]) / len(metrics["upload"]),
                    "latency": sum(metrics["latency"]) / len(metrics["latency"]),
                },
                "download_stats": {
                    "min": min(metrics["download"]),
                    "max": max(metrics["download"]),
                    "median": statistics.median(metrics["download"]),
                },
                "upload_stats": {
                    "min": min(metrics["upload"]),
                    "max": max(metrics["upload"]),
                    "median": statistics.median(metrics["upload"]),
                },
                "latency_stats": {
                    "min": min(metrics["latency"]),
                    "max": max(metrics["latency"]),
                    "median": statistics.median(metrics["latency"]),
                },
                "duration": f"{len(data)} test samples",
            }

            with console.status("[bold green]Creating single-file report..."):
                report_file = generate_html_report(
                    [analysis_obj], "single_dataset_report.html"
                )

            console.print(
                Panel(
                    f"[bold green]✅ Single dataset report generated![/bold green]\n"
                    f"📄 File: [bold]{report_file}[/bold]\n"
                    f"🌐 [dim]Open this file in your web browser to view the report[/dim]",
                    title="Report Ready",
                    style="bold green",
                )
            )

        # Performance assessment
        console.print("\n")
        avg_download = (
            statistics.mean(metrics["download"]) if metrics["download"] else 0
        )

        if avg_download > 100:
            performance = "[bold green]Excellent! 🚀[/bold green]"
        elif avg_download > 50:
            performance = "[bold yellow]Good 👍[/bold yellow]"
        elif avg_download > 25:
            performance = "[bold orange1]Fair 📶[/bold orange1]"
        else:
            performance = "[bold red]Poor 📶[/bold red]"

        console.print(
            Panel(
                f"Overall Performance Rating: {performance}",
                title="🎯 Performance Assessment",
                border_style="magenta",
            )
        )

        # Single file time series plot
        if args.plots:
            console.print("\n")
            console.print("[bold]📈 Time Series Analysis[/bold]")

            if PLOTEXT_AVAILABLE:
                # Create a mock analysis for plotting
                analysis = analyze_file_silent(args.file)
                if analysis:
                    time_series_data = extract_time_series_data([analysis])
                    create_time_series_plots(time_series_data)
            else:
                console.print(
                    "[yellow]⚠ plotext not available. Install with: pip install plotext[/yellow]"
                )


if __name__ == "__main__":
    main()
