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

    # Plot 1: Download Speeds Over Time
    plt.clf()
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

    plt.show()

    # Plot 2: Upload Speeds Over Time
    plt.clf()
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

    plt.show()

    # Plot 3: Latency Over Time
    plt.clf()
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

    plt.show()


def present_comparative_analysis(
    analyses: List[Dict[str, Any]], show_plots: bool = False
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

    # Time series plots
    if show_plots:
        time_series_data = extract_time_series_data(analyses)
        create_time_series_plots(time_series_data)

    # Winner announcement
    if rankings["heuristic"]:
        winner = rankings["heuristic"][0]
        console.print("\n")
        console.print(
            Panel(
                f"🏆 Overall Winner: [bold green]{winner[0].replace('.json', '').replace('_', ' ').title()}[/bold green]\n"
                f"Performance Score: [bold yellow]{winner[1]:.2f} points[/bold yellow]",
                title="🎉 Champion Dataset",
                border_style="gold1",
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
        present_comparative_analysis(valid_analyses, show_plots=args.plots)

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
