"""
Handles all console-based reporting.
"""
import statistics
from datetime import datetime
from typing import List, Dict, Any, Tuple

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns
from rich import box

from .utils import format_dataset_name
from ..analysis import calculate_heuristic_score, calculate_statistics

console = Console()


def create_statistics_table(metrics: Dict[str, List[float]]) -> Table:
    """Create a Rich table with speed statistics."""
    table = Table(title="📊 Speed Test Statistics", box=box.ROUNDED)
    table.add_column("Metric", style="cyan", no_wrap=True)
    table.add_column("Minimum", style="green")
    table.add_column("Median", style="yellow")
    table.add_column("Maximum", style="red")
    table.add_column("Unit", style="white")

    download_stats = calculate_statistics(metrics["download"])
    table.add_row(
        "🔽 Download",
        f"{download_stats['min']:.2f}",
        f"{download_stats['median']:.2f}",
        f"{download_stats['max']:.2f}",
        "Mbps",
    )
    upload_stats = calculate_statistics(metrics["upload"])
    table.add_row(
        "🔼 Upload",
        f"{upload_stats['min']:.2f}",
        f"{upload_stats['median']:.2f}",
        f"{upload_stats['max']:.2f}",
        "Mbps",
    )
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

    content = [
        f"🧭 Primary Direction: [bold blue]{directional_info.get('primary_direction', 'N/A')}°[/bold blue]",
        f"📐 Primary Tilt: [bold green]{directional_info.get('primary_tilt', 'N/A')}°[/bold green]",
    ]
    if directional_info.get("direction_degrees"):
        directions_str = ", ".join(
            [f"{d}°" for d in sorted(directional_info["direction_degrees"])]
        )
        content.append(f"🔄 All Directions: {directions_str}")
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


def create_ranking_table(
    ranking_data: List[Tuple[str, float]],
    analyses: List[Dict[str, Any]],
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
        if idx == 1:
            rank_style = "🥇"
        elif idx == 2:
            rank_style = "🥈"
        elif idx == 3:
            rank_style = "🥉"
        else:
            rank_style = f"{idx}"

        analysis = next((a for a in analyses if a["filename"] == filename), None)
        display_name = (
            format_dataset_name(analysis)
            if analysis
            else filename.replace(".json", "").replace("_", " ").title()
        )
        value_str = f"{value:.2f} {metric_unit}" if metric_unit else f"{value:.2f}"
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
        filename = format_dataset_name(analysis)
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


def create_consistency_analysis_tables(analyses: List[Dict[str, Any]]) -> List[Table]:
    """Create Rich tables for consistency analysis."""
    tables = []
    std_table = Table(
        title="📊 Standard Deviations (Lower = More Consistent)", box=box.ROUNDED
    )
    std_table.add_column("Dataset", style="cyan", min_width=15)
    std_table.add_column("Download", style="green", justify="right")
    std_table.add_column("Upload", style="yellow", justify="right")
    std_table.add_column("Latency", style="red", justify="right")

    for analysis in analyses:
        filename = format_dataset_name(analysis)
        std = analysis["consistency"]["standard_deviations"]
        std_table.add_row(
            filename,
            f"{std['download']:.2f} Mbps",
            f"{std['upload']:.2f} Mbps",
            f"{std['latency']:.2f} ms",
        )
    tables.append(std_table)

    stability_table = Table(
        title="🎯 Stability Scores (Higher = More Stable)", box=box.ROUNDED
    )
    stability_table.add_column("Dataset", style="cyan", min_width=15)
    stability_table.add_column("Download", style="green", justify="right")
    stability_table.add_column("Upload", style="yellow", justify="right")
    stability_table.add_column("Latency", style="red", justify="right")
    stability_table.add_column("Overall", style="bold magenta", justify="right")

    sorted_by_stability = sorted(
        analyses,
        key=lambda x: x["consistency"]["stability_scores"]["overall"],
        reverse=True,
    )

    for idx, analysis in enumerate(sorted_by_stability):
        filename = format_dataset_name(analysis, case="upper")
        scores = analysis["consistency"]["stability_scores"]
        rank_display = f"#{idx + 1}"
        stability_table.add_row(
            f"{rank_display} {filename}",
            f"{scores['download']:.1f}",
            f"{scores['upload']:.1f}",
            f"{scores['latency']:.1f}",
            f"{scores['overall']:.1f}",
        )
    tables.append(stability_table)
    return tables


def present_comparative_analysis(
    analyses: List[Dict[str, Any]],
    rankings: Dict[str, List[Tuple[str, float]]],
    show_consistency: bool,
):
    """Present comprehensive comparative analysis with Rich formatting."""
    console.print(
        Panel.fit(
            "[bold blue]📊 Comparative Analysis Results[/bold blue]\n[dim]Ranking datasets across multiple performance metrics[/dim]",
            border_style="blue",
        )
    )
    console.print("\n")
    summary_table = create_summary_comparison_table(analyses)
    console.print(summary_table)
    console.print("\n")
    console.print("[bold]🏆 Performance Rankings[/bold]")
    heuristic_table = create_ranking_table(
        rankings["heuristic"], analyses, "🎯 Overall Performance Score", "pts"
    )
    avg_dl_table = create_ranking_table(
        rankings["avg_download"], analyses, "📊 Average Download Speed", "Mbps"
    )
    console.print("\n")
    console.print(Columns([heuristic_table, avg_dl_table]))
    avg_ul_table = create_ranking_table(
        rankings["avg_upload"], analyses, "📈 Average Upload Speed", "Mbps"
    )
    avg_lat_table = create_ranking_table(
        rankings["avg_latency"],
        analyses,
        "⚡ Average Latency",
        "ms",
        reverse_ranking=True,
    )
    console.print("\n")
    console.print(Columns([avg_ul_table, avg_lat_table]))
    console.print("\n")
    console.print("[bold]📊 Median Performance Rankings[/bold]")
    med_dl_table = create_ranking_table(
        rankings["median_download"], analyses, "🔽 Median Download Speed", "Mbps"
    )
    med_ul_table = create_ranking_table(
        rankings["median_upload"], analyses, "🔼 Median Upload Speed", "Mbps"
    )
    med_lat_table = create_ranking_table(
        rankings["median_latency"],
        analyses,
        "📡 Median Latency",
        "ms",
        reverse_ranking=True,
    )
    console.print(Columns([med_dl_table, med_ul_table, med_lat_table]))
    console.print("\n")
    console.print("[bold]🚀 Peak Performance Rankings[/bold]")
    max_dl_table = create_ranking_table(
        rankings["max_download"], analyses, "⚡ Maximum Download Speed", "Mbps"
    )
    max_ul_table = create_ranking_table(
        rankings["max_upload"], analyses, "⚡ Maximum Upload Speed", "Mbps"
    )
    console.print(Columns([max_dl_table, max_ul_table]))
    console.print("\n")
    console.print("[bold]📉 Minimum Performance Rankings[/bold]")
    min_dl_table = create_ranking_table(
        rankings["min_download"], analyses, "🔻 Minimum Download Speed", "Mbps"
    )
    min_ul_table = create_ranking_table(
        rankings["min_upload"], analyses, "🔻 Minimum Upload Speed", "Mbps"
    )
    console.print(Columns([min_dl_table, min_ul_table]))

    if show_consistency:
        console.print("\n")
        console.print("[bold yellow]📈 Consistency & Stability Analysis[/bold yellow]")
        consistency_tables = create_consistency_analysis_tables(analyses)
        for table in consistency_tables:
            console.print("\n")
            console.print(table)

    if rankings["heuristic"]:
        winner_filename = rankings["heuristic"][0][0]
        winner_analysis = next(
            (a for a in analyses if a["filename"] == winner_filename), None
        )
        stability_info = ""
        if winner_analysis:
            winner_name = format_dataset_name(winner_analysis)
            stability_score = winner_analysis["consistency"]["stability_scores"][
                "overall"
            ]
            stability_info = f"\nStability Score: [bold cyan]{stability_score:.1f}/100[/bold cyan]"
        else:
            winner_name = winner_filename.replace(".json", "").replace("_", " ").title()
        console.print("\n")
        console.print(
            Panel(
                f"🏆 Overall Winner: [bold green]{winner_name}[/bold green]\n"
                f"Performance Score: [bold yellow]{rankings['heuristic'][0][1]:.2f} points[/bold yellow]{stability_info}",
                title="🎉 Champion Dataset",
                border_style="gold1",
            )
        )
