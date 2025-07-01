"""
Configuration for the Starlink Reporter application.
"""
from dataclasses import dataclass
import os


@dataclass
class AppConfig:
    """Application configuration."""

    log_directory: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "logs"
    )
    data_directory: str = os.path.dirname(os.path.dirname(__file__))
    reports_directory: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "reports"
    )


def get_config() -> AppConfig:
    """Get the application configuration."""
    return AppConfig()
