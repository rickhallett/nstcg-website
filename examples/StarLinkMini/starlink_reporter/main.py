"""Main entry point for the Starlink Reporter application."""

import argparse
import os
import statistics

from rich.console import Console
from rich.panel import Panel

from . import analysis, data_loader
from .config import get_config
from .reporting import console_reporter, html_reporter, plotter

console = Console()


def main():
    """Main analysis function."""
    parser = argparse.ArgumentParser(
        description="Analyze Starlink speed test data from JSON files with optional time series plotting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    file_group = parser.add_mutually_exclusive_group(required=True)
    file_group.add_argument(
        "-f", "--file", help="Path to the JSON file containing speed test data"
    )
    file_group.add_argument(
        "-a",
        "--all",
        action="store_true",
        help="Analyze all JSON files in the current directory and provide comparative rankings",
    )
    parser.add_argument(
        "--plots", action="store_true", help="Show time series plots (requires plotext)"
    )
    parser.add_argument(
        "--consistency",
        action="store_true",
        help="Perform consistency and stability analysis",
    )
    parser.add_argument(
        "--report", action="store_true", help="Generate comprehensive HTML report"
    )
    parser.add_argument(
        "--consistency-report",
        action="store_true",
        help="Generate dedicated HTML consistency analysis report",
    )
    args = parser.parse_args()
    config = get_config()

    console.print(
        Panel.fit(
            "[bold blue]Starlink Speed Test Analysis[/bold blue]\n[dim]Analyzing internet performance data[/dim]",
            border_style="blue",
        )
    )

    if args.all:
        console.print(
            f"\n[bold]🔍 Scanning for JSON files in {config.data_directory}...[/bold]"
        )
        json_files = data_loader.find_json_files(config.data_directory)
        if not json_files:
            console.print(
                f"[red]No JSON files found in {config.data_directory}. Exiting.[/red]"
            )
            return

        console.print(f"[green]✓ Found {len(json_files)} JSON files[/green]")
        valid_analyses = []
        invalid_files = []
        with console.status("[bold green]Analyzing datasets...") as status:
            for json_file in json_files:
                status.update(f"[bold green]Analyzing {os.path.basename(json_file)}...")
                data = data_loader.load_speed_data(json_file)
                if data and data_loader.validate_schema(data):
                    analysis_result = analysis.analyze_file_silent(json_file, data)
                    if analysis_result:
                        valid_analyses.append(analysis_result)
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

        for item in valid_analyses:
            item["consistency"] = analysis.calculate_consistency_metrics(item)

        rankings = analysis.rank_datasets(valid_analyses)
        console_reporter.present_comparative_analysis(
            valid_analyses, rankings, args.consistency
        )

        if args.plots:
            time_series_data = plotter.extract_time_series_data(valid_analyses)
            plotter.create_time_series_plots(time_series_data, valid_analyses)

        if args.report:
            console.print("\n")
            console.print(
                "[bold green]📄 Generating HTML report for comparative analysis...[/bold green]"
            )
            with console.status(
                "[bold green]Creating comprehensive analysis report..."
            ):
                report_file = html_reporter.generate_html_report(
                    valid_analyses, rankings, config.reports_directory
                )
            console.print(
                Panel(
                    f"[bold green]✅ Comprehensive analysis report generated![/bold green]\n"
                    f"📄 File: [bold]{report_file}[/bold]\n"
                    f"🌐 [dim]Open this file in your web browser to view the report[/dim]",
                    title="Report Ready",
                    style="bold green",
                )
            )

        if args.consistency_report:
            console.print("\n")
            console.print(
                "[bold green]📄 Generating HTML report for consistency analysis...[/bold green]"
            )
            with console.status("[bold green]Creating consistency analysis report..."):
                report_file = html_reporter.generate_consistency_html_report(
                    valid_analyses, config.reports_directory
                )
            console.print(
                Panel(
                    f"[bold green]✅ Consistency analysis report generated![/bold green]\n"
                    f"📄 File: [bold]{report_file}[/bold]\n"
                    f"🌐 [dim]Open this file in your web browser to view the report[/dim]",
                    title="Report Ready",
                    style="bold green",
                )
            )

    else:
        console.print(f"\n[bold]Loading speed test data from {args.file}...[/bold]")
        data = data_loader.load_speed_data(args.file)
        if not data:
            console.print("[red]No data to analyze. Exiting.[/red]")
            return

        console.print(f"[green]✓ Loaded {len(data)} speed test records[/green]")
        metrics = analysis.extract_metrics(data)
        directional_info = analysis.get_directional_info(data)
        console.print("\n")
        summary_panel = console_reporter.create_summary_panel(data, metrics)
        console.print(summary_panel)
        console.print("\n")
        stats_table = console_reporter.create_statistics_table(metrics)
        console.print(stats_table)
        console.print("\n")
        directional_panel = console_reporter.create_directional_panel(directional_info)
        console.print(directional_panel)

        if args.consistency:
            console.print("\n")
            console.print(
                "[bold yellow]📈 Consistency & Stability Analysis[/bold yellow]"
            )
            analysis_obj = {
                "filename": args.file,
                "metrics": metrics,
                "averages": {
                    "download": sum(metrics["download"]) / len(metrics["download"]),
                    "upload": sum(metrics["upload"]) / len(metrics["upload"]),
                    "latency": sum(metrics["latency"]) / len(metrics["latency"]),
                },
            }
            consistency = analysis.calculate_consistency_metrics(analysis_obj)
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

        if args.report:
            console.print("\n")
            console.print(
                "[bold green]📄 Generating HTML report for single dataset...[/bold green]"
            )
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
                report_file = html_reporter.generate_html_report(
                    [analysis_obj],
                    {},
                    config.reports_directory,
                    "single_dataset_report.html",
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

        if args.plots:
            console.print("\n")
            console.print("[bold]📈 Time Series Analysis[/bold]")
            if plotter.PLOTEXT_AVAILABLE:
                analysis_result = analysis.analyze_file_silent(args.file, data)
                if analysis_result:
                    time_series_data = plotter.extract_time_series_data(
                        [analysis_result]
                    )
                    plotter.create_time_series_plots(
                        time_series_data, [analysis_result]
                    )
            else:
                console.print(
                    "[yellow]⚠ plotext not available. Install with: pip install plotext[/yellow]"
                )


if __name__ == "__main__":
    main()
