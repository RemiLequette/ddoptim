# DDoptim — Project Overview

**Project:** DDoptim — DDMRP Buffer Positioning Optimizer  
**Platform:** CommWise Web App (App ID: 13866)  
**URL:** https://commwise.b2wise.com/mcp-c3-ddoptim-buffer-positioning-optimizer  
**Version:** 3.1  
**Date:** February 27, 2026  
**Status:** In Development — Core MVP ~90% Complete

---

## 1. Purpose

DDoptim is an interactive web application for strategic DDMRP (Demand Driven Material Requirements Planning) buffer positioning in supply chain networks. It enables users to:

- Visualize supply chain networks with BOM relationships
- Manually position strategic buffers using DDMRP criteria
- Automatically position buffers using the RLT (Required Lead Time) algorithm
- Automatically optimize buffer positioning using the OPT (Inventory Minimization) algorithm
- Calculate buffer sizes using official DDMRP formulas
- Create, save, and compare scenarios with quantitative metrics
- Manage and customize buffer profiles (CRUD)
- Import real supply chain data from B2WISE DataMart
- Understand trade-offs between different buffer positioning strategies

## 2. Scope

**In Scope:**

- Interactive network visualization (D3.js hierarchical tree) ✅
- Manual buffer positioning (toggle, lock, profile, rationale) ✅
- Automated buffer positioning via RLT algorithm ✅
- Automated buffer optimization via OPT algorithm ✅
- Real-time DDMRP buffer sizing calculations ✅
- Scenario management (create, save, compare, diff engine) ✅
- Tabular view with Excel-style column filtering ✅
- Buffer profiles management view (CRUD: create, edit, rename, duplicate, delete) ✅
- Performance metrics dashboard ⚠️ (partially implemented)
- DataMart import from B2WISE (location selection, BOM + transfer links) ✅
- JSON export/import with full scenario persistence ✅
- Model library with predefined test networks (temporary, for development testing) ✅
- Multi-location network support (location field, transport links, color-by-location) ✅
- Shared node deduplication in network visualization ✅
- Network focus mode (ancestor/descendant filtering) ✅
- Collapse/expand subtrees in network visualization ✅

**Out of Scope (MVP):**

- Real-time data feeds from ERP systems
- Dynamic buffer management (operational execution)
- User authentication / multi-tenancy
- Sales Order Visibility Horizon (Criterion #2)
- Report generation / PDF export
- Sensitivity analysis

## 3. Data Sources

| Source | Purpose | Status |
|--------|---------|--------|
| Model Library | Predefined test networks for development | ✅ Temporary |
| JSON Import | Load custom network from file | ✅ |
| B2WISE DataMart | Import real production data (nodes, BOM, transfers) | ✅ |

**Note:** The Model Library contains simple test models (Simple Chain, Simple Assembly, Simple Distribution, Weber Pignons) used during development. It is a temporary feature — production use relies on DataMart import or JSON import.

## 4. Key Concepts

| Term | Definition |
|------|-----------|
| **ADU** | Average Daily Usage — demand rate per day |
| **CLT** | Cumulative Lead Time — longest path ignoring buffers |
| **DLT** | Decoupled Lead Time — from nearest upstream buffer |
| **RLT** | Required Lead Time — customer time requirement propagated downstream |
| **Buffer Profile** | Configuration (F, I, U, AL, AI) defining variability and lead time factors |
| **Customer Tolerance** | Maximum delivery lead time acceptable to the customer |
| **Scenario** | A named set of modifications (buffer decisions, ADU changes) applied on a baseline |

## 5. Implementation Status

### ✅ Fully Implemented

- Network data model with BOM + transport relationships
- Node attributes: product, location, description, type, leadTime, unitCost, etc.
- ADU propagation (top-down, independent + dependent)
- CLT calculation (bottom-up, longest path)
- DLT calculation (bottom-up, resets at buffers)
- Delivery Lead Time Calculator (customer-facing metrics)
- RLT auto-positioning algorithm with preview/cancel
- OPT inventory minimization algorithm (Phases 0–4, RLT seeding, budget constraint)
- Buffer lock mechanism
- D3.js network visualization with dynamic legend, color-by-type/location
- Shared node deduplication with secondary links
- Collapse/expand subtrees, focus mode
- Detail panel with real-time recalculation
- Tabular view with sorting + Excel-style column filtering + filter presets
- Scenario management (baseline, create, save, load, rename, delete)
- Scenario diff engine (auto-detect changes vs baseline)
- Scenario comparison chart (D3.js bar chart)
- JSON export/import with scenario persistence
- DataMart import (location selection, nodes, BOM, inter-warehouse transfers)
- DDMRP buffer sizing (Yellow/Green/Red zones, inventory value, triggered on all UI events)
- Buffer profiles management view (list, edit form, CRUD, usage tracking, rename with node update)

### ⚠️ Partially Implemented

- Metrics dashboard (4 KPIs displayed, needs coverage % and inventory by level)
- OPT UI — `toleranceMandatory` not yet in detail panel / tooltip / table column

### ❌ Not Yet Implemented

- Complete metrics engine (coverage %, inventory by level)
- Help system (in-app documentation)
- CSV/Excel export for scenario comparison

## 6. Priority Action Items

### 🔴 Critical (for functional MVP)

1. **Metrics Engine Completion** — Coverage %, inventory by level

### 🟡 Important (for complete MVP)

2. **toleranceMandatory UI** — detail panel checkbox, tooltip, table column, scenario tracking
3. **Help System** — In-app documentation via META 500+ blocks

### 🟢 Nice to Have

4. **Report Export** — CSV/Excel scenario comparison
5. **Sales Order Visibility Horizon** — Extend RLT to use tolerance + visibility

## 7. Technology Stack

| Component | Technology |
|-----------|-----------|
| Platform | CommWise Web App |
| Visualization | D3.js v7.8.5 (loaded from CDN) |
| Data Queries | AWS Athena via CommWise secure proxy |
| Storage | Browser memory (no localStorage persistence) |
| Export/Import | JSON file download/upload |

## 8. Development History

| Date | Milestone |
|------|-----------|
| Jan 21, 2026 | Requirements document v1.0 |
| Jan 27, 2026 | Design document v1.0, CommWise app created |
| Feb 5-6, 2026 | Core algorithms, visualization, JSON export/import |
| Feb 9-12, 2026 | RLT algorithm, buffer lock, metrics, terminology alignment |
| Feb 13, 2026 | Tabular view Phase 1 (sort, columns, row selection) |
| Feb 16, 2026 | Scenario management (CRUD, diff engine, comparison chart) |
| Feb 16, 2026 | Column filtering (Excel-style dropdowns, filter presets) |
| Feb 17-18, 2026 | Scenario view (table layout, split panel, modifications detail) |
| Feb 18, 2026 | Collapse/expand nodes, diagnostic cleanup |
| Feb 19, 2026 | Data model restructure (product/location fields, dynamic legend) |
| Feb 19, 2026 | Focus mode, location toggle, transport link display |
| Feb 20, 2026 | DataMart import (location selection, BOM + transfer links) |
| Feb 20, 2026 | Shared node deduplication, description field, ADU mapping fix |
| Feb 26, 2026 | Responsive layout (two-line controls bar), color-by toggle, link type legend |
| Feb 26, 2026 | OPT algorithm (Phases 0–4, RLT seeding, budget, toleranceMandatory) |
| Feb 27, 2026 | Buffer profiles management view (CRUD, usage tracking, rename propagation) |

---

**Document Version:** 3.1  
**Last Updated:** February 27, 2026
