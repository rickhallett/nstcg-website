# StarLink Optimiser

A service to monitor and optimise your StarLink connection.

## Installation

```bash
bun install
```

## Usage

### Start the service

```bash
bun run start <configFile>
```

### Stop the service

```bash
bun run stop
```

### Get the status of the service

```bash
bun run status
```

### Generate a new config file

```bash
bun run generate-config <testName>
```

## Configuration

The configuration is done via a YAML file. Here is an example:

```yaml
testName: development
frequency: 60000
output: csv
logging: true
logFile: starlink-optimiser.log
port: 3000
```
