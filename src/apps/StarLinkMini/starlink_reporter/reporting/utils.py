"""
Utility functions for reporting.
"""
from typing import Dict, Any


def format_dataset_name(analysis: Dict[str, Any], case: str = "title") -> str:
    """Formats the dataset name with directional info if available."""
    base_name_raw = analysis["filename"].replace(".json", "").replace("_", " ")
    base_name = base_name_raw.upper() if case == "upper" else base_name_raw.title()

    dir_info = analysis.get("directional_info", {})
    direction = dir_info.get("primary_direction")
    tilt = dir_info.get("primary_tilt")

    has_dir_info = (
        direction is not None and tilt is not None and (direction != 0 or tilt != 0)
    )

    if has_dir_info:
        return f"{base_name} ({direction}°/{tilt}°)"
    return base_name
