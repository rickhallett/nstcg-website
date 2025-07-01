"""
Handles loading and validation of speed test data.
"""
import json
import glob
import os
from typing import List, Dict, Any, Optional

from rich.console import Console

console = Console()


def find_json_files(directory: str) -> List[str]:
    """Find all JSON files in the specified directory."""
    pattern = os.path.join(directory, "*.json")
    json_files = glob.glob(pattern)
    return sorted(json_files)


def load_speed_data(json_file: str) -> Optional[List[Dict[str, Any]]]:
    """Load speed test data from a JSON file."""
    try:
        with open(json_file, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        console.print(f"[red]Error: {json_file} not found![/red]")
        return None
    except json.JSONDecodeError:
        console.print(f"[red]Error: Invalid JSON in {json_file}![/red]")
        return None


def validate_schema(data: List[Dict[str, Any]]) -> bool:
    """Validate that the data matches the expected speed test schema."""
    if not data or not isinstance(data, list):
        return False

    required_fields = ["download", "upload", "ping"]
    sample = data[0]

    try:
        if not all(field in sample for field in required_fields):
            return False
        if not (
            "mbps" in sample["download"]
            and "mbps" in sample["upload"]
            and "latency" in sample["ping"]
        ):
            return False
        float(sample["download"]["mbps"])
        float(sample["upload"]["mbps"])
        float(sample["ping"]["latency"])
        return True
    except (KeyError, ValueError, TypeError):
        return False
