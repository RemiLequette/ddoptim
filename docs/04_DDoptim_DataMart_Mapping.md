# DDoptim — DataMart Mapping

**Version:** 3.0  
**Date:** February 26, 2026  
**Status:** Implemented

---

## 1. Overview

This document defines the mapping between the B2WISE DataMart (AWS Athena/Presto) and the DDoptim data model. The import pipeline fetches nodes from `vvwarehouseparts`, BOM relationships from `vvbillofmaterials`, and inter-warehouse transfer links derived from supplier codes.

**⚠️ All DataMart queries filter on the latest snapshot:**

```sql
wimportdateid = (SELECT MAX(wimportdateid) FROM vvwarehouseparts)
```

---

## 2. Node Mapping (vvwarehouseparts)

Each node corresponds to one warehouse part identified by **wwarehousepartid** (numeric surrogate key, unique per part-warehouse combination).

| DDoptim Field     | DataMart Field                           | Notes                                           |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| **id**            | wwarehousepartid                         | Cast to VARCHAR. No composite key needed.       |
| product           | partcode                                 | Display name / part code                        |
| description       | partdescription                          | Human-readable description                      |
| location          | warehousecode                            | Warehouse/site identifier                       |
| type              | itemtypecode                             | Used directly, no transformation                |
| leadTime          | supplierleadtimedaysdefault              | Used for all nodes (purchased and manufactured) |
| independentADU    | adusales                                 | Customer demand. 0 for pure intermediates.      |
| unitCost          | unitcoststandard                         | Fallback: annualsalesvalue / annualsalesunits   |
| bufferProfile     | bufferprofile or partbufferprofileprefix | Full code first, prefix as fallback             |
| moq               | minimumorderquantity                     | Direct mapping                                  |
| orderCycle        | desiredordercycledaysactual              | Direct mapping                                  |
| hasBuffer         | planningmodename                         | `LIKE '%DDMRP%'` → hasBuffer=true               |
| customerTolerance | *(not in DataMart)*                      | Set manually in DDoptim per finished product    |

### Fields NOT to Import

These are DDoptim outputs — importing them would bypass DDoptim's own calculations:

| DataMart Field                 | DDoptim Field  | Why Exclude                                         |
| ------------------------------ | -------------- | --------------------------------------------------- |
| dlt, clt                       | dlt, clt       | DDoptim recomputes from network structure           |
| adubom                         | calculatedADU  | DDoptim propagates from independentADU              |
| yellowzone, greenzone, redzone | bufferSizing.* | DDoptim computes from ADU × DLT formulas            |
| netflow, bufferpenetration     | *(runtime)*    | Operational execution, not relevant for positioning |

---

## 3. BOM Relationships (vvbillofmaterials)

| DDoptim Field         | DataMart Field          | Notes                                  |
| --------------------- | ----------------------- | -------------------------------------- |
| children[].id (child) | wwarehousepartidchild   | Cast to VARCHAR                        |
| parent node ID        | wwarehousepartidparent  | Cast to VARCHAR                        |
| children[].quantity   | bomqty (or bomqtyfinal) | bomqtyfinal includes scrap adjustments |
| children[].linkType   | —                       | Always `"bom"` for BOM rows            |

**Filters applied:**

- `phantom != 'Y'` (exclude phantom items — unfold by connecting children to grandparent)
- `bomqty > 0`
- `enddate IS NULL OR enddate > current_date` (active BOM lines only)
- Latest snapshot: `wimportdateid = MAX(...)`

---

## 4. Inter-Warehouse Transfer Links

When `suppliercode` on a part matches a known `warehousecode`, the part is sourced from another warehouse rather than an external supplier. This creates a transport link.

| DDoptim Field       | Source                                                   | Notes                     |
| ------------------- | -------------------------------------------------------- | ------------------------- |
| child node ID       | wwarehousepartid of the destination part                 | The part being supplied   |
| parent node ID      | Resolved via JOIN: same partcode at source warehousecode | The source warehouse part |
| children[].quantity | 1 (default)                                              | Transfer is 1:1           |
| children[].linkType | —                                                        | Always `"transport"`      |

**Detection logic:** `suppliercode IS NOT NULL AND suppliercode IN (known warehousecodes)`

**Resolution:** JOIN vvwarehouseparts ON partcode = child.partcode AND warehousecode = child.suppliercode → retrieve source wwarehousepartid as parent.

---

## 5. Buffer Profiles

| DDoptim Field         | DataMart Field        | Notes                                                                         |
| --------------------- | --------------------- | ----------------------------------------------------------------------------- |
| profileCode           | bufferprofile         | DISTINCT values (e.g., 'F', 'I', 'F_BIKE')                                    |
| variabilityFactor     | demandvarfactoractual | Average per profile, or per-part value                                        |
| leadTimeFactor        | ltvarfactoractual     | Per-part actual factor. Use directly instead of deriving from DLT thresholds. |
| DLT thresholds (C, M) | *(not in DataMart)*   | B2WISE config parameters. Not needed if using ltvarfactoractual directly.     |

---

## 6. Import Pipeline

1. **Fetch warehouse locations** → display selection dialog (user chooses which warehouses)
2. **Fetch nodes** (vvwarehouseparts) → build nodes map keyed by wwarehousepartid (as string). Build auxiliary lookup: `warehousePartMap[partcode + '_' + warehousecode] = wwarehousepartid`
3. **Fetch BOM rows** (vvbillofmaterials) → build children arrays using wwarehousepartidparent/child directly
4. **Resolve transfer links** → using warehousePartMap, add transport children
5. **Post-process**: compute parent reverse index, validate DAG (no cycles)
6. **Calculate**: ADU propagation → CLT → DLT → delivery lead time metrics
7. **Manual step**: Set customerTolerance per finished product in DDoptim

---

## 7. Open Points

| #   | Topic                 | Recommendation                                                                 |
| --- | --------------------- | ------------------------------------------------------------------------------ |
| 1   | DLT Thresholds        | Use ltvarfactoractual directly (aggregate per profile). Thresholds not needed. |
| 2   | Customer Tolerance    | Not in DataMart. Must be set manually per product.                             |
| 3   | ADU field choice      | Use adusales for customer demand baseline.                                     |
| 4   | hasBuffer detection   | planningmodename LIKE '%DDMRP%' (observed: {GlobalPolicy_DDMRP})               |
| 5   | Phantom BOM items     | Unfold: connect children directly to grandparent, sum quantities.              |
| 6   | Multi-warehouse scope | User selects warehouses in import dialog. wwarehousepartid ensures uniqueness. |
| 7   | Unit cost currency    | Confirm currency and conversion needs for multi-currency B2WISE.               |

---

**Document Version:** 3.0  
**Last Updated:** February 26, 2026
