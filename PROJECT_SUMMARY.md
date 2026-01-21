# DDoptim Project Summary

## Overview
**DDoptim** is a research and prototyping tool for automated buffer positioning in supply chains using **DDMRP (Demand Driven Material Requirements Planning)** methodology.

## Primary Case Study: Weber Pignons
- French bicycle assembly company (Grenoble) serving SUPERVELO brand
- ~1000 bikes/month (1500 in summer)
- Challenge: Manual planning with spreadsheets, "firefighting" mode, high inventory
- Network: Assembly workshop + Machining workshop, local and international suppliers

### Current Issues:
- Delivery delays managed through expediting
- High WIP and component inventory
- Priority orders disrupting machining efficiency  
- Risk of insufficient working capital with growth

## Project Objectives
1. **Automate buffer positioning** using algorithmic recommendations
2. **Support manual decisions** by allowing users to fix/override buffer positions
3. **Compare scenarios** with different assumptions (demand, lead times, etc.)
4. **Evaluate performance** using metrics aligned with optimization objectives
5. Enable **what-if analysis** to understand trade-offs

## Three-Tier Optimization Framework

### Tier 1: Hard Constraints (MUST SATISFY)
1. **Customer Tolerance Time**: DLT from buffer to customer ≤ Customer Tolerance
2. **Sales Order Visibility Horizon**: Combined with tolerance for extended DLT

### Tier 2: Mandatory Buffers + Optimization
- **External Variability** (Criterion #4): User-specified mandatory buffers for high-variability positions
- **Critical Operation Protection** (Criterion #6): User-specified buffers for bottlenecks
- **Inventory Leverage** (Criterion #5): **PRIMARY OPTIMIZATION OBJECTIVE** - Minimize total inventory value

### Tier 3: Scenario Analysis
- **Market Potential Lead Time** (Criterion #3): User defines target scenarios for market opportunities
- Compare inventory investment vs. revenue opportunity

## Key Technical Decisions

### Buffer Profiles (Weber Pignons Defaults)
| Profile | Type | Variability | DLT Thresholds (C/M/L) | Example Items |
|---------|------|-------------|------------------------|---------------|
| F | Fabriqués (Finished) | Low (0.25) | 1 / 3 / 7 days | Bikes |
| I | Intermédiaires (Semi-finished) | Low (0.25) | 1 / 3 / 7 days | Wheels, Frames |
| U | Usinés (Machined) | Medium (0.5) | 1 / 5 / 21 days | Plateau, Pignon, Chain |
| AL | Achetés Local | Medium (0.5) | 1 / 3 / 7 days | Brakes, Pedals |
| AI | Achetés International | High (0.7) | 1 / 5 / 21 days | Spokes, Tires, Rims |

### Buffer Sizing Formula
```
Yellow = ADU × DLT
Green = MAX(Yellow × Lead_Time_Factor, MOQ, ADU × Order_Cycle)
Red = Green_Delay + (Green_Delay × Variability_Factor)
Average_Stock = (Red + Yellow) + (Green / 2)
Inventory_Value = ROUND(Average_Stock) × Unit_Cost
```

### Network Structure
- **DAG (Directed Acyclic Graph)** with NetworkX
- **Node types**: finished_product, intermediate, machined, purchased_local, purchased_international
- **BOM relationships**: Parent → Child with quantity
- **Buffer status**: no_buffer, user_fixed, user_forbidden, algorithm_recommended

## Data Requirements (All Mandatory for MVP)
- Node ID / Name
- Node type
- Lead time (days, must be > 0)
- Buffer profile assignment
- MOQ and order cycle
- Unit cost
- BOM relationships (parents and quantities)
- For finished goods: Customer tolerance time, ADU

## Success Metrics
**Primary**: Total inventory value (minimize while satisfying constraints)

**Constraint**: Customer lead time coverage (100% of products meet tolerance)

**Service**: Lead time compression, DLT distribution

**Inventory**: Inventory turns, buffer count, positioning distribution

## Development Phases

### ✅ Phase 2: Core Implementation (COMPLETE)
- BufferProfile data structure
- NetworkNode data structure  
- Network graph management
- Full validation and serialization

### 🔄 Phase 2: Core Implementation (IN PROGRESS)
- [ ] ADU propagation through BOM
- [ ] DLT calculation from buffers to customers
- [ ] Buffer sizing calculations
- [ ] Scenario management system

### Phase 3: Optimization Algorithm
- [ ] Three-tier prioritization framework
- [ ] Customer tolerance constraint satisfaction
- [ ] Mandatory buffer handling
- [ ] Inventory minimization algorithm
- [ ] Performance metrics calculation

### Phase 4: Visualization & Analysis
- [ ] Network diagrams with buffer highlights
- [ ] Scenario comparison dashboards
- [ ] Trade-off analysis charts
- [ ] Report generation

### Phase 5: Testing & Refinement
- [ ] Weber Pignons case study validation
- [ ] Scenario comparison testing
- [ ] Algorithm vs. expert comparison

## Reference Files
- Full requirements: See detailed DDMRP requirements document
- Case study: Weber Pignons presentation (French)
- Calculations: Weber Pignons Excel workbook with buffer sizing examples

## Technology Stack
- **Language**: Python 3.7+
- **Core**: NetworkX for graph operations
- **Future**: matplotlib/plotly for visualization

## Next Steps
1. Implement ADU propagation through BOM
2. Create Weber Pignons example network as JSON
3. Implement DLT calculation
4. Implement DDMRP buffer sizing
5. Start optimization algorithm
