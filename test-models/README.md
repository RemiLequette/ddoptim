# DDOPTIM Test Model Library

This folder contains reusable JSON fixtures for automated algorithm tests.

## Directory Layout

- `test-models/rlt/`: fixtures focused on Required Lead Time propagation.
- `test-models/opt/`: fixtures focused on optimization phases and constraints.

## Fixture Format

Each fixture follows the project data model and can include:

- `metadata`: free metadata for traceability.
- `scenario`: optional test controls (for example `budgetMax`).
- `bufferProfiles`: optional profile overrides.
- `nodes`: network nodes with `children` relationships.

Only baseline node attributes are stored. Runtime values such as `dlt`, `calculatedADU`, and `bufferSizing` are computed by the test framework.

## Guidelines For New Models

- Keep fixtures small and deterministic.
- Prefer explicit IDs (`finished_good`, `component_a`) over opaque numbers.
- Include one behavior target per fixture (for example locked node infeasibility).
- Add a matching test under `tests/algorithms/` when adding a fixture.
