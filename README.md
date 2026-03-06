# DDOPTIM Automated Algorithm Test Framework

This repository is now focused on **automated testing of DDOPTIM optimization algorithms**.

The priority is to validate algorithm behavior (RLT and OPT), not UI rendering.

## Scope

- Run deterministic algorithm tests in Node.js.
- Maintain a reusable library of JSON test models.
- Pull only the CommWise block files required for algorithm verification.
- Keep UI-related blocks outside the core test loop.

## Quick Start

```bash
npm install
copy config\commwise.example.json config\commwise.json
```

Optional for algorithm-only pull customization:

```bash
copy config\algorithm-sync.example.json config\algorithm-sync.json
```

## Core Workflow

1. Place the latest full CommWise export in `commwise/live/app-<appId>-full.txt`.
2. Pull algorithm-only blocks:

   ```bash
   npm run sync:pull:algorithms
   ```

3. Run algorithm tests:

   ```bash
   npm run test:algorithms
   ```

4. Add or update JSON fixtures in `test-models/` and extend tests in `tests/algorithms/`.

## Project Layout

- `src/algorithms/`: pure algorithm modules for test execution.
- `tests/algorithms/`: Vitest suites targeting RLT and OPT behavior.
- `test-models/`: JSON fixture library for reusable test scenarios.
- `scripts/sync-pull-algorithms.js`: selective CommWise pull for algorithm-relevant blocks only.
- `config/algorithm-sync.example.json`: required block list and output path template.
- `commwise/algorithm-blocks/`: generated output folder for algorithm-only mirrors.

## JSON Test Model Example

```json
{
  "metadata": {
    "name": "Mandatory Budget Test"
  },
  "scenario": {
    "budgetMax": 5000
  },
  "nodes": [
    {
      "id": "finished_good",
      "independentADU": 10,
      "customerTolerance": 2,
      "toleranceMandatory": true,
      "leadTime": 6,
      "unitCost": 90,
      "bufferProfile": "F",
      "children": [{ "id": "component", "quantity": 1 }]
    },
    {
      "id": "component",
      "leadTime": 2,
      "unitCost": 12,
      "bufferProfile": "I",
      "children": []
    }
  ]
}
```

## Commands

- `npm run sync:pull`: alias of algorithm-only sync.
- `npm run test`: run all tests.
- `npm run test:algorithms`: run algorithm-focused tests only.
- `npm run sync:pull:algorithms`: sync only required algorithm blocks from a full CommWise export.

## Notes

- Algorithm tests are designed to execute without browser globals or UI containers.
