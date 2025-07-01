"""
Hangles time series plotting using plotext.
"""
from datetime import datetime
from typing import List, Dict, Any

from rich.console import Console

from .utils import format_dataset_name

try:
    import plotext as plt

    PLOTEXT_AVAILABLE = True
except ImportError:
    PLOTEXT_AVAILABLE = False

console = Console()


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
            num_points = len(metrics["download"])
            timestamps = list(range(num_points))
        else:
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


def create_time_series_plots(
    time_series_data: Dict[str, Dict[str, List]], analyses: List[Dict[str, Any]]
):
    """Create time series plots for each metric using plotext."""
    if not PLOTEXT_AVAILABLE:
        console.print(
            "[yellow]⚠ plotext not available. Install with: pip install plotext[/yellow]"
        )
        return

    if not time_series_data:
        return

    colors = ["red", "green", "blue", "yellow", "magenta", "cyan", "white"]
    console.print("\n")
    console.print("[bold]📈 Time Series Analysis[/bold]")
    console.print("Showing performance trends over time for each dataset\n")

    has_real_timestamps = any(
        isinstance(data["timestamps"][0], float)
        for data in time_series_data.values()
        if data["timestamps"]
    )
    x_label = "Time (minutes)" if has_real_timestamps else "Test Sequence"

    all_download_speeds = []
    all_upload_speeds = []
    all_latencies = []
    for data in time_series_data.values():
        all_download_speeds.extend(data["download_speeds"])
        all_upload_speeds.extend(data["upload_speeds"])
        all_latencies.extend(data["latencies"])

    download_padding = (max(all_download_speeds) - min(all_download_speeds)) * 0.1
    upload_padding = (max(all_upload_speeds) - min(all_upload_speeds)) * 0.1
    latency_padding = (max(all_latencies) - min(all_latencies)) * 0.1
    download_min = max(0, min(all_download_speeds) - download_padding)
    download_max = max(all_download_speeds) + download_padding
    upload_min = max(0, min(all_upload_speeds) - upload_padding)
    upload_max = max(all_upload_speeds) + upload_padding
    latency_min = max(0, min(all_latencies) - latency_padding)
    latency_max = max(all_latencies) + latency_padding

    plot_width = 80
    plot_height = 20

    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("📊 Download Speeds Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Download Speed (Mbps)")
    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        analysis = next((a for a in analyses if a["filename"] == filename), None)
        label = (
            format_dataset_name(analysis)
            if analysis
            else filename.replace(".json", "").replace("_", " ").title()
        )
        plt.plot(
            data["timestamps"],
            data["download_speeds"],
            label=label,
            color=color,
            marker="braille",
        )
    plt.ylim(download_min, download_max)
    plt.show()

    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("📈 Upload Speeds Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Upload Speed (Mbps)")
    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        analysis = next((a for a in analyses if a["filename"] == filename), None)
        label = (
            format_dataset_name(analysis)
            if analysis
            else filename.replace(".json", "").replace("_", " ").title()
        )
        plt.plot(
            data["timestamps"],
            data["upload_speeds"],
            label=label,
            color=color,
            marker="braille",
        )
    plt.ylim(upload_min, upload_max)
    plt.show()

    plt.clf()
    plt.plotsize(plot_width, plot_height)
    plt.title("⚡ Latency Over Time")
    plt.xlabel(x_label)
    plt.ylabel("Latency (ms)")
    for idx, (filename, data) in enumerate(time_series_data.items()):
        color = colors[idx % len(colors)]
        analysis = next((a for a in analyses if a["filename"] == filename), None)
        label = (
            format_dataset_name(analysis)
            if analysis
            else filename.replace(".json", "").replace("_", " ").title()
        )
        plt.plot(
            data["timestamps"],
            data["latencies"],
            label=label,
            color=color,
            marker="braille",
        )
    plt.ylim(latency_min, latency_max)
    plt.show()
