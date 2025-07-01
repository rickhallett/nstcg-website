# 🛰️ Starlink Speed Test Analysis Tool

Comprehensive analysis tool for Starlink internet speed test data with beautiful terminal visualizations, consistency analysis, and HTML report generation.

## ✨ Features

- **📊 Statistical Analysis**: Min/median/max calculations for download/upload speeds and latency
- **🎯 Performance Rankings**: Multi-criteria comparison across datasets with heuristic scoring
- **📈 Consistency Analysis**: Standard deviation and stability scoring to identify most reliable connections
- **📄 HTML Reports**: Professional web-based reports for sharing and archival
- **📍 Antenna Configuration**: Direction and tilt angle analysis and summaries
- **🎨 Rich Terminal UI**: Beautiful formatted tables, progress bars, and visual indicators
- **📈 Time Series Plotting**: ASCII charts showing performance trends over time
- **🔍 Schema Validation**: Automatic detection and validation of JSON data structure
- **⚡ Comparative Analysis**: Side-by-side ranking and performance comparison

## 🚀 Installation

### Prerequisites
- Python 3.7+
- pip

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Required Dependencies
- `rich>=13.0.0` - For beautiful terminal formatting
- `plotext>=5.0.0` - For ASCII time series charts

## 📝 Usage

### Single File Analysis
Analyze a single JSON speed test file:

```bash
python speed_analysis.py --file your_speedtest.json
```

**With consistency analysis:**
```bash
python speed_analysis.py --file your_speedtest.json --consistency
```

**With HTML report generation:**
```bash
python speed_analysis.py --file your_speedtest.json --report
```

**With time series plots:**
```bash
python speed_analysis.py --file your_speedtest.json --plots
```

**All features combined:**
```bash
python speed_analysis.py --file your_speedtest.json --consistency --report --plots
```

### Multi-File Comparative Analysis
Analyze all JSON files in the current directory:

```bash
python speed_analysis.py --all
```

**With consistency analysis:**
```bash
python speed_analysis.py --all --consistency
```

**With HTML report generation:**
```bash
python speed_analysis.py --all --report
```

**With time series plots:**
```bash
python speed_analysis.py --all --plots
```

**Complete analysis with all features:**
```bash
python speed_analysis.py --all --consistency --report --plots
```

## 🎯 New Features

### 📈 Consistency Analysis (`--consistency`)
The consistency analysis feature provides detailed stability metrics for your speed test data:

- **Standard Deviations**: Measures variability in download/upload speeds and latency (lower = more consistent)
- **Stability Scores**: 0-100 scale rating based on coefficient of variation (higher = more stable)
- **Overall Stability**: Weighted average of all metrics providing a single stability rating
- **Comparative Rankings**: When analyzing multiple datasets, see which connections are most reliable

**Single Dataset Example:**
```
📊 Standard Deviations (Lower = More Consistent)
• Download: 18.08 Mbps
• Upload: 9.62 Mbps  
• Latency: 4.22 ms

🎯 Stability Scores (Higher = More Stable)
• Download: 87.2/100
• Upload: 54.3/100
• Latency: 88.7/100
• Overall: 77.8/100
```

### 📄 HTML Report Generation (`--report`)
Generate comprehensive, professional HTML reports for sharing and documentation:

- **Summary Dashboard**: Key metrics overview with visual cards
- **Performance Rankings**: Multiple ranking categories with medal indicators
- **Consistency Analysis**: Detailed stability metrics and comparisons
- **Statistical Details**: Complete breakdown of all metrics
- **Professional Styling**: Clean, modern web design suitable for presentations
- **Automatic File Naming**: 
  - Multi-dataset: `starlink_analysis_report.html`
  - Single dataset: `single_dataset_report.html`

**Report Contents:**
- Executive summary with key insights
- Dataset comparison tables
- Performance ranking matrices  
- Consistency and stability analysis
- Champion dataset announcement
- Complete statistical breakdown

## 📊 Command Line Options

| Flag | Short | Description |
|------|-------|-------------|
| `--file FILE` | `-f` | Analyze single JSON file |
| `--all` | `-a` | Analyze all JSON files in directory |
| `--plots` | | Show ASCII time series charts |
| `--consistency` | | Perform stability analysis |
| `--report` | | Generate HTML report |
| `--help` | `-h` | Show help message |

## 📋 Data Format

Your JSON files should contain an array of speed test objects with this structure:

```json
[
  {
    "timestamp": "2025-06-30T14:30:57.478Z",
    "download": { "mbps": 147.61 },
    "upload": { "mbps": 13.15 },
    "ping": { "latency": 36.989 },
    "direction": "300",
    "direction_degrees": 300,
    "tilt": 40
  }
]
```

### Required Fields
- `download.mbps`: Download speed in Mbps
- `upload.mbps`: Upload speed in Mbps  
- `ping.latency`: Latency in milliseconds
- `direction_degrees`: Antenna direction in degrees
- `tilt`: Antenna tilt angle in degrees

### Optional Fields
- `timestamp`: ISO format timestamp
- `direction`: String representation of direction

## 🎨 Output Examples

### Single File Analysis
```
📊 Speed Test Statistics
┌─────────────┬─────────┬────────┬─────────┬──────┐
│ Metric      │ Minimum │ Median │ Maximum │ Unit │
├─────────────┼─────────┼────────┼─────────┼──────┤
│ 🔽 Download │ 121.04  │ 147.61 │ 155.57  │ Mbps │
│ 🔼 Upload   │ 13.15   │ 18.29  │ 31.78   │ Mbps │
│ 📡 Latency  │ 33.26   │ 36.99  │ 41.69   │ ms   │
└─────────────┴─────────┴────────┴─────────┴──────┘
```

### Comparative Analysis
```
🎯 Overall Performance Score
┌────────┬──────────────────────┬──────────┐
│ Rank   │ Dataset              │    Value │
├────────┼──────────────────────┼──────────┤
│ 🥇     │ Chair-Garden         │ 6.36 pts │
│ 🥈     │ Sunbed               │ 4.35 pts │
│ 🥉     │ Table-Garden         │ 3.30 pts │
└────────┴──────────────────────┴──────────┘
```

### Consistency Analysis
```
🎯 Stability Scores (Higher = More Stable)
┌─────────────────┬──────────┬────────┬─────────┬─────────┐
│ Dataset         │ Download │ Upload │ Latency │ Overall │
├─────────────────┼──────────┼────────┼─────────┼─────────┤
│ 🥇 Sunbed       │     87.2 │   54.3 │    88.7 │    77.8 │
│ 🥈 Chair-Garden │     53.9 │   83.9 │    85.2 │    72.3 │
│ 🥉 Table-Garden │     56.1 │   58.9 │    83.2 │    65.1 │
└─────────────────┴──────────┴────────┴─────────┴─────────┘
```

## 🔧 Troubleshooting

### Missing Dependencies
If you get import errors:
```bash
pip install rich plotext
```

### No JSON Files Found
Ensure your JSON files are in the current directory when using `--all`

### Invalid JSON Format  
The tool validates JSON structure and will skip invalid files with warnings

### Chart Display Issues
If ASCII charts don't display properly, try a different terminal or disable with `--plots` flag

## 🎯 Performance Ratings

The tool provides automatic performance ratings based on download speeds:

- **🚀 Excellent**: > 100 Mbps
- **✅ Good**: 50-100 Mbps  
- **⚠️ Fair**: 25-50 Mbps
- **❌ Poor**: < 25 Mbps

## 📈 Scoring Algorithm

The heuristic performance score combines multiple factors:
```
Score = (Average Download + Average Upload) / Average Latency
```

This balances high throughput with low latency for optimal user experience.

## 🛠️ Development

### Project Structure
```
src/StarLinkMini/
├── speed_analysis.py      # Main analysis script
├── requirements.txt       # Python dependencies  
├── README.md             # This documentation
├── *.json               # Sample speed test data files
└── *.html              # Generated HTML reports
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

## 🆘 Support

For issues, questions, or feature requests, please check the troubleshooting section above or review the command help:

```bash
python speed_analysis.py --help
``` 