/**
 * OPT Engine â€” Core Utilities & Phase 0 (Feasibility Check)
 *
 * Lexicographic objective:
 *   f0 = sum MAX(0, DLT[i] - tolerance[i])  for toleranceMandatory nodes
 *   f1 = sum MAX(0, DLT[i] - tolerance[i])  for ALL demand nodes
 *   f2 = sum inventoryValue[i]               for all buffered nodes
 *
 * Fixed constraints:
 *   - bufferLocked nodes: hasBuffer cannot change
 *   - budgetMax: total inventoryValue <= budgetMax (when not null)
 */
(function() {
    'use strict';

    console.log('[OPT Core] Loading...');

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // NETWORK DEEP COPY
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Deep-copy relevant node attributes for simulation.
     * Returns a Map<nodeId, {hasBuffer, dlt, bufferSizing}>.
     * Only copies what OPT reads/writes to keep memory light.
     */
    function snapshotNetwork(nodes) {
        const snap = new Map();
        // Works for both Map and Array
        nodes.forEach(node => {
            snap.set(node.id, {
                hasBuffer: node.hasBuffer,
                dlt: node.dlt,
                bufferSizing: node.bufferSizing ? { ...node.bufferSizing } : null
            });
        });
        return snap;
    }

    /**
     * Restore snapshot into live network nodes.
     */
    function restoreSnapshot(nodes, snap) {
        nodes.forEach(node => {
            const saved = snap.get(node.id);
            if (!saved) return;
            node.hasBuffer    = saved.hasBuffer;
            node.dlt          = saved.dlt;
            node.bufferSizing = saved.bufferSizing ? { ...saved.bufferSizing } : null;
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // FULL NETWORK RECALCULATION
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Recalculate DLT and buffer sizing for the entire network.
     * Calls existing DDOptim engines (DLT calculator, buffer sizing).
     * This is the "recalc" primitive used throughout OPT phases.
     */
    function fullRecalc(network) {
        const nodes = network.nodes;
        // DLT depends on hasBuffer â€” recalculate bottom-up
        if (window.DLTCalculator && typeof window.DLTCalculator.calculateDLT === 'function') {
            window.DLTCalculator.calculateDLT(nodes);
        }
        // Buffer sizing depends on DLT and calculatedADU â€” recalculate per buffered node
        if (typeof window.calculateBufferSizing === 'function') {
            nodes.forEach(node => {
                window.calculateBufferSizing(node);
            });
        }
        // Delivery lead time metrics (missingCustomerLeadTime, ltExceeding)
        if (window.DeliveryLeadTimeCalculator &&
            typeof window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime === 'function') {
            window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime(nodes);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // OBJECTIVE FUNCTIONS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Compute f0: sum of DLT overruns for toleranceMandatory demand nodes.
     */
    function computeF0(nodes) {
        let f0 = 0;
        nodes.forEach(node => {
            if (node.toleranceMandatory && node.independentADU > 0) {
                // deliveryLeadTime = 0 if buffered, else DLT (matches SCRIPT 620 / missingCustomerLeadTime)
                const deliveryLT = node.hasBuffer ? 0 : (node.dlt || 0);
                const overrun = Math.max(0, deliveryLT - (node.customerTolerance || 0));
                f0 += overrun;
            }
        });
        return f0;
    }

    /**
     * Compute f1: sum of delivery lead time overruns for ALL demand nodes.
     * Uses deliveryLeadTime = 0 if buffered, DLT otherwise (same as missingCustomerLeadTime).
     */
    function computeF1(nodes) {
        let f1 = 0;
        nodes.forEach(node => {
            if (node.independentADU > 0) {
                const deliveryLT = node.hasBuffer ? 0 : (node.dlt || 0);
                const overrun = Math.max(0, deliveryLT - (node.customerTolerance || 0));
                f1 += overrun;
            }
        });
        return f1;
    }

    /**
     * Compute f2: total inventory value of buffered nodes.
     */
    function computeF2(nodes) {
        let f2 = 0;
        nodes.forEach(node => {
            if (node.hasBuffer && node.bufferSizing) {
                f2 += node.bufferSizing.inventoryValue || 0;
            }
        });
        return f2;
    }

    /**
     * Compute all three objectives at once.
     */
    function computeObjectives(nodes) {
        return {
            f0: computeF0(nodes),
            f1: computeF1(nodes),
            f2: computeF2(nodes)
        };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CANDIDATE HELPERS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Returns array of non-locked, non-buffered candidate nodes (can be added).
     */
    function getAddCandidates(nodes) {
        const candidates = [];
        nodes.forEach(node => {
            if (!node.bufferLocked && !node.hasBuffer) {
                candidates.push(node);
            }
        });
        return candidates;
    }

    /**
     * Returns array of non-locked, buffered candidate nodes (can be removed).
     */
    function getRemoveCandidates(nodes) {
        const candidates = [];
        nodes.forEach(node => {
            if (!node.bufferLocked && node.hasBuffer) {
                candidates.push(node);
            }
        });
        return candidates;
    }

    /**
     * Check if adding a buffer would exceed budgetMax.
     * Call AFTER simulating the addition (inventoryValue already updated).
     */
    function isBudgetRespected(nodes, budgetMax) {
        if (budgetMax === null || budgetMax === undefined) return true;
        return computeF2(nodes) <= budgetMax;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 0 â€” FEASIBILITY CHECK
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 0a â€” Structural feasibility.
     * Tests the best-case scenario: all non-locked nodes buffered.
     * If a toleranceMandatory node still has DLT > tolerance, it's
     * infeasible due to locked buffers blocking upstream.
     *
     * Returns: { feasible: bool, infeasibleNodes: [...] }
     */
    function checkStructuralFeasibility(network) {
        const nodes = network.nodes;
        const snap = snapshotNetwork(nodes);

        // Buffer everything not locked
        nodes.forEach(node => {
            if (!node.bufferLocked) node.hasBuffer = true;
        });
        fullRecalc(network);

        const infeasibleNodes = [];
        nodes.forEach(node => {
            if (node.toleranceMandatory && node.independentADU > 0) {
                // deliveryLeadTime = 0 if buffered, DLT otherwise (consistent with computeF0/SCRIPT 620)
                const deliveryLT = node.hasBuffer ? 0 : (node.dlt || 0);
                const tol = node.customerTolerance || 0;
                if (deliveryLT > tol) {
                    // Find which locked buffers (hasBuffer=false) are upstream
                    const blockingNodes = findBlockingLockedNodes(nodes, node.id, network);
                    infeasibleNodes.push({
                        nodeId: node.id,
                        product: node.product || node.id,
                        location: node.location || '',
                        minDlt: dlt,
                        tolerance: tol,
                        cause: 'locked_buffer',
                        blockingNodes
                    });
                }
            }
        });

        restoreSnapshot(nodes, snap);
        return {
            feasible: infeasibleNodes.length === 0,
            infeasibleNodes
        };
    }

    /**
     * Find upstream nodes with bufferLocked=true AND hasBuffer=false
     * that are blocking a given node from achieving a lower DLT.
     */
    function findBlockingLockedNodes(nodes, targetNodeId, network) {
        const blocking = [];
        // Walk ancestors of targetNodeId using parent index
        const visited = new Set();
        const queue = [targetNodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);
            const node = nodes.get(current);
            if (!node) continue;
            // If this ancestor is locked with hasBuffer=false, it's a blocker
            if (node.bufferLocked && !node.hasBuffer && current !== targetNodeId) {
                blocking.push({ nodeId: current, product: node.product || current });
            }
            // Add children to walk further downstream (toward raw materials)
            if (node.children) {
                node.children.forEach(child => {
                    if (!visited.has(child.id)) queue.push(child.id);
                });
            }
        }
        return blocking;
    }

    /**
     * Phase 0b â€” Budget feasibility.
     * Runs an unconstrained internal OPT (Phases 1-2 only, no budget limit)
     * to find the minimum cost to achieve full mandatory coverage.
     * If that cost > budgetMax, it's infeasible.
     *
     * Returns: { feasible: bool, requiredBudget: number, availableBudget: number }
     */
    function checkBudgetFeasibility(network, budgetMax) {
        if (budgetMax === null || budgetMax === undefined) {
            return { feasible: true, requiredBudget: null, availableBudget: null };
        }

        // We need a minimal cost check â€” delegate to OPT phases once loaded
        // This is called from runFeasibilityCheck which is called AFTER all phases loaded
        const optPhases = window.DDOptim && window.DDOptim.optPhases;
        if (!optPhases) {
            console.warn('[OPT Phase 0] optPhases not yet loaded â€” skipping budget check');
            return { feasible: true, requiredBudget: null, availableBudget: null };
        }

        const snap = snapshotNetwork(network.nodes);
        // Run phases 1+2 without budget to find minimum cost
        optPhases.runPhase1(network);
        optPhases.runPhase2a(network, null); // no budget
        const minF2 = computeF2(network.nodes);
        restoreSnapshot(network.nodes, snap);
        fullRecalc(network); // restore calculated values

        return {
            feasible: minF2 <= budgetMax,
            requiredBudget: minF2,
            availableBudget: budgetMax
        };
    }

    /**
     * Main Phase 0 entry point.
     * Returns { feasible: bool, report: { structural, budget } }
     */
    function runFeasibilityCheck(network, budgetMax) {
        console.log('[OPT Phase 0] Running feasibility check...');

        const structural = checkStructuralFeasibility(network);
        if (!structural.feasible) {
            console.warn('[OPT Phase 0] Structural infeasibility detected:', structural.infeasibleNodes.length, 'node(s)');
            return {
                feasible: false,
                report: { structural, budget: null }
            };
        }

        const budget = checkBudgetFeasibility(network, budgetMax);
        if (!budget.feasible) {
            console.warn('[OPT Phase 0] Budget infeasibility detected. Required:', budget.requiredBudget, '> Available:', budget.availableBudget);
            return {
                feasible: false,
                report: { structural, budget }
            };
        }

        console.log('[OPT Phase 0] âœ“ All feasibility checks passed');
        return {
            feasible: true,
            report: { structural, budget }
        };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EXPORT
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    window.DDOptim = window.DDOptim || {};
    window.DDOptim.optCore = {
        snapshotNetwork,
        restoreSnapshot,
        fullRecalc,
        computeF0,
        computeF1,
        computeF2,
        computeObjectives,
        getAddCandidates,
        getRemoveCandidates,
        isBudgetRespected,
        runFeasibilityCheck
    };

    console.log('[OPT Core] âœ“ Loaded');
})();