"""
Core analysis functions for speed test data.
"""
import statistics
import os
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from rich.progress import track


def extract_metrics(data: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    """Extract download, upload, and latency metrics from the data."""
    metrics = {"download": [], "upload": [], "latency": []}
    for entry in track(data, description="Processing speed test data..."):
        try:
            metrics["download"].append(entry["download"]["mbps"])
            metrics["upload"].append(entry["upload"]["mbps"])
            metrics["latency"].append(entry["ping"]["latency"])
        except KeyError:
            continue
    return metrics


def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """Calculate min, median, max for a list of values."""
    if not values:
        return {"min": 0, "median": 0, "max": 0}
    return {
        "min": min(values),
        "median": statistics.median(values),
        "max": max(values),
    }


def get_directional_info(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract directional and tilt information."""
    if not data:
        return {}
    directions = [entry.get("direction_degrees", 0) for entry in data]
    tilts = [entry.get("tilt", 0) for entry in data]
    return {
        "direction_degrees": list(set(directions)),
        "tilt_degrees": list(set(tilts)),
        "primary_direction": statistics.mode(directions) if directions else 0,
        "primary_tilt": statistics.mode(tilts) if tilts else 0,
    }


def analyze_file_silent(
    json_file: str, data: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Analyze a single file's data and return results without printing."""
    if not data:
        return None

    metrics = extract_metrics(data)
    directional_info = get_directional_info(data)
    download_stats = calculate_statistics(metrics["download"])
    upload_stats = calculate_statistics(metrics["upload"])
    latency_stats = calculate_statistics(metrics["latency"])
    avg_download = statistics.mean(metrics["download"]) if metrics["download"] else 0
    avg_upload = statistics.mean(metrics["upload"]) if metrics["upload"] else 0
    avg_latency = statistics.mean(metrics["latency"]) if metrics["latency"] else 0

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
    return (avg_download + avg_upload) / avg_latency


def rank_datasets(
    analyses: List[Dict[str, Any]]
) -> Dict[str, List[Tuple[str, float]]]:
    """Rank datasets by multiple criteria."""
    rankings = {}
    heuristic_scores = [
        (a["filename"], calculate_heuristic_score(a)) for a in analyses
    ]
    rankings["heuristic"] = sorted(heuristic_scores, key=lambda x: x[1], reverse=True)
    avg_download = [(a["filename"], a["averages"]["download"]) for a in analyses]
    avg_upload = [(a["filename"], a["averages"]["upload"]) for a in analyses]
    avg_latency = [(a["filename"], a["averages"]["latency"]) for a in analyses]
    rankings["avg_download"] = sorted(avg_download, key=lambda x: x[1], reverse=True)
    rankings["avg_upload"] = sorted(avg_upload, key=lambda x: x[1], reverse=True)
    rankings["avg_latency"] = sorted(avg_latency, key=lambda x: x[1])
    median_download = [(a["filename"], a["download_stats"]["median"]) for a in analyses]
    median_upload = [(a["filename"], a["upload_stats"]["median"]) for a in analyses]
    median_latency = [(a["filename"], a["latency_stats"]["median"]) for a in analyses]
    rankings["median_download"] = sorted(
        median_download, key=lambda x: x[1], reverse=True
    )
    rankings["median_upload"] = sorted(
        median_upload, key=lambda x: x[1], reverse=True
    )
    rankings["median_latency"] = sorted(median_latency, key=lambda x: x[1])
    max_download = [(a["filename"], a["download_stats"]["max"]) for a in analyses]
    max_upload = [(a["filename"], a["upload_stats"]["max"]) for a in analyses]
    rankings["max_download"] = sorted(max_download, key=lambda x: x[1], reverse=True)
    rankings["max_upload"] = sorted(max_upload, key=lambda x: x[1], reverse=True)
    min_download = [(a["filename"], a["download_stats"]["min"]) for a in analyses]
    min_upload = [(a["filename"], a["upload_stats"]["min"]) for a in analyses]
    rankings["min_download"] = sorted(min_download, key=lambda x: x[1], reverse=True)
    rankings["min_upload"] = sorted(min_upload, key=lambda x: x[1], reverse=True)
    return rankings


def calculate_consistency_metrics(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate consistency and stability metrics for a single dataset."""
    metrics = analysis["metrics"]
    download_std = (
        statistics.stdev(metrics["download"]) if len(metrics["download"]) > 1 else 0
    )
    upload_std = (
        statistics.stdev(metrics["upload"]) if len(metrics["upload"]) > 1 else 0
    )
    latency_std = (
        statistics.stdev(metrics["latency"]) if len(metrics["latency"]) > 1 else 0
    )
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
    download_stability = max(0, 100 - (download_cv * 100))
    upload_stability = max(0, 100 - (upload_cv * 100))
    latency_stability = max(0, 100 - (latency_cv * 100))
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
