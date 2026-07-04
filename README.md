# cultivated-meat-process-model

Process model for cultivated meat production, from media preparation through packaging.

## Structure

```
config/baseline.yaml          Scenario parameters
src/cm_process_model/         Core library
  streams.py                  Material streams
  flowsheet.py                Process assembly and simulation
  units/                      Unit operations
  integrations/               External model adapters
notebooks/01_baseline_model.ipynb   Exploratory analysis
tests/                        Pytest suite
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run tests

```bash
pytest
```

## Quick start

```python
from pathlib import Path
from cm_process_model import Flowsheet, load_config

config = load_config(Path("config/baseline.yaml"))
flowsheet = Flowsheet(config)
results = flowsheet.simulate()
print(f"Daily product: {flowsheet.daily_product_kg:.1f} kg")
```

## Process flow

Media prep → Seed train → Production bioreactor → Harvest → Formulation → Packaging

The bioreactor step uses `BioreactorAdapter` as a pluggable interface for external kinetics models.
