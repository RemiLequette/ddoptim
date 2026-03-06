/**
 * OPT Engine â€” Phase 1 & Phase 2 (Greedy Coverage)
 *
 * Phase 1: seed from RLT solution (not zero buffers).
 *   Rationale: starting from zero can trap OPT in expensive local optima on
 *   convergent networks (e.g. Weber Pignons: OPT buffers the finished product
 *   at DLT=39 days instead of buffering 7 cheaper components like RLT does,
 *   because the 1->7 swap is never explored in Phase 4).
 *   Seeding from RLT gives OPT a high-quality starting point; Phase 3
 *   (removal) and Phase 4 (swaps) then refine it toward lower inventory.
 *
 * Phase 2a: add buffers to minimize f0 (mandatory node overruns)
 * Phase 2b: add buffers to minimize f1 (all demand node overruns)
 */
(function() {
    'use strict';

    console.log('[OPT Phases 1-2] Loading...');

    // Helper: node count works for both Map and Array
    function nodeCount(nodes) {
        return nodes instanceof Map ? nodes.size : nodes.length;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 1 â€” INITIALIZE SOLUTION FROM RLT SEED
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 1: seed buffer positions from RLT algorithm.
     *
     * Workflow:
     *   1. Snapshot current network state
     *   2. Run RLT internally (read-only side effect on hasBuffer/requiredLeadTime)
     *   3. Capture RLT buffer decisions
     *   4. Restore original network state
     *   5. Apply RLT decisions as OPT starting point (respecting locked nodes)
     *   6. Full recalculate
     *
     * Falls back to zero-buffer initialization if RLT engine is unavailable.
     *
     * Returns: { buffersPreserved, seedSource, initialObjectives }
     */
    function runPhase1(network) {
        console.log('[OPT Phase 1] Initializing from RLT seed...');
        const core = window.DDOptim.optCore;
        const nodes = network.nodes;

        // â”€â”€ Step 1: snapshot full node state (hasBuffer + requiredLeadTime) â”€â”€
        const fullSnap = new Map();
        nodes.forEach(node => {
            fullSnap.set(node.id, {
                hasBuffer: node.hasBuffer,
                bufferRationale: node.bufferRationale,
                requiredLeadTime: node.requiredLeadTime
            });
        });

        // â”€â”€ Step 2: attempt RLT seed â”€â”€
        let rltBufferIds = null;
        const rltEngine = window.RequiredLeadTimePropagation;

        if (rltEngine && typeof rltEngine.autoPositionBuffers === 'function') {
            try {
                // Run RLT silently (no UI side effects â€” RLT reads/writes
                // node.hasBuffer and node.requiredLeadTime in-place)
                const rltResult = rltEngine.autoPositionBuffers({
                    respectLockedBuffers: true,
                    logIterations: false
                });

                if (rltResult.success || rltResult.buffersSet) {
                    // Capture which nodes RLT decided to buffer
                    rltBufferIds = new Set();
                    nodes.forEach(node => {
                        if (node.hasBuffer) rltBufferIds.add(node.id);
                    });
                    console.log('[OPT Phase 1] RLT seed captured:', rltBufferIds.size, 'buffers');
                }
            } catch (e) {
                console.warn('[OPT Phase 1] RLT seed failed, falling back to zero:', e.message);
            }
        } else {
            console.warn('[OPT Phase 1] RLT engine not available â€” falling back to zero buffers');
        }

        // â”€â”€ Step 3: restore original network state â”€â”€
        nodes.forEach(node => {
            const saved = fullSnap.get(node.id);
            if (!saved) return;
            node.hasBuffer        = saved.hasBuffer;
            node.bufferRationale  = saved.bufferRationale;
            node.requiredLeadTime = saved.requiredLeadTime;
        });

        // â”€â”€ Step 4: apply starting position â”€â”€
        let buffersPreserved = 0;
        let seedSource;

        if (rltBufferIds) {
            // Seed from RLT
            seedSource = 'rlt';
            nodes.forEach(node => {
                if (node.bufferLocked) {
                    if (node.hasBuffer) buffersPreserved++;
                    // leave locked nodes unchanged
                } else {
                    node.hasBuffer = rltBufferIds.has(node.id);
                }
            });
        } else {
            // Fallback: zero buffers
            seedSource = 'zero';
            nodes.forEach(node => {
                if (node.bufferLocked) {
                    if (node.hasBuffer) buffersPreserved++;
                } else {
                    node.hasBuffer = false;
                }
            });
        }

        // â”€â”€ Step 5: full recalculate from new starting point â”€â”€
        core.fullRecalc(network);
        const obj = core.computeObjectives(nodes);

        console.log('[OPT Phase 1] âœ“ Done. Seed:', seedSource,
            '| Locked buffers preserved:', buffersPreserved);
        console.log('[OPT Phase 1] Initial objectives: f0=', obj.f0.toFixed(1),
            'f1=', obj.f1.toFixed(1), 'f2=', obj.f2.toFixed(2));

        return {
            buffersPreserved,
            seedSource,
            initialObjectives: obj
        };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 2 INTERNALS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * One greedy step: try adding each candidate buffer, pick the one
     * that maximally reduces the target objective (f0 or f1).
     * Tie-break: lowest inventoryValue of the added buffer.
     *
     * @param {Map} nodes
     * @param {object} network
     * @param {'f0'|'f1'} targetFn - which objective to minimize
     * @param {number|null} budgetMax
     * @param {number} currentF0 - current f0 (must not degrade in Phase 2b)
     * @returns {object|null} best candidate node, or null if no improvement found
     */
    function greedyStep(nodes, network, targetFn, budgetMax, currentF0) {
        const core = window.DDOptim.optCore;
        const candidates = core.getAddCandidates(nodes);

        let bestNode   = null;
        let bestDelta  = 0;   // improvement in target fn (positive = better)
        let bestCost   = Infinity;

        const currentTarget = targetFn === 'f0' ? core.computeF0(nodes) : core.computeF1(nodes);

        for (const candidate of candidates) {
            // Simulate adding buffer
            candidate.hasBuffer = true;
            core.fullRecalc(network);

            // Check budget constraint
            if (!core.isBudgetRespected(nodes, budgetMax)) {
                candidate.hasBuffer = false;
                core.fullRecalc(network);
                continue;
            }

            // In Phase 2b: must not degrade f0
            if (targetFn === 'f1') {
                const newF0 = core.computeF0(nodes);
                if (newF0 > currentF0) {
                    candidate.hasBuffer = false;
                    core.fullRecalc(network);
                    continue;
                }
            }

            const newTarget = targetFn === 'f0' ? core.computeF0(nodes) : core.computeF1(nodes);
            const delta = currentTarget - newTarget; // improvement
            const cost  = candidate.bufferSizing ? (candidate.bufferSizing.inventoryValue || 0) : 0;

            if (delta > bestDelta || (delta === bestDelta && delta > 0 && cost < bestCost)) {
                bestDelta = delta;
                bestCost  = cost;
                bestNode  = candidate;
            }

            // Undo simulation
            candidate.hasBuffer = false;
            core.fullRecalc(network);
        }

        return bestNode;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 2a â€” GREEDY COVERAGE: MANDATORY NODES
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 2a: greedily add buffers until f0 = 0 or no further improvement.
     * Minimizes overruns for toleranceMandatory demand nodes.
     *
     * Returns: { buffersAdded: [{nodeId, product, inventoryValue}], finalF0: number }
     */
    function runPhase2a(network, budgetMax) {
        console.log('[OPT Phase 2a] Greedy coverage â€” mandatory nodes (f0)...');
        const core  = window.DDOptim.optCore;
        const nodes = network.nodes;

        const buffersAdded = [];
        let iterations = 0;
        const MAX_ITER = nodeCount(nodes) + 1;

        while (core.computeF0(nodes) > 0 && iterations < MAX_ITER) {
            iterations++;
            const best = greedyStep(nodes, network, 'f0', budgetMax, Infinity);
            if (!best) {
                console.log('[OPT Phase 2a] No more improvement possible at iteration', iterations);
                break;
            }
            best.hasBuffer = true;
            core.fullRecalc(network);
            buffersAdded.push({
                nodeId: best.id,
                product: best.product || best.id,
                location: best.location || '',
                inventoryValue: best.bufferSizing ? (best.bufferSizing.inventoryValue || 0) : 0,
                phase: '2a'
            });
            console.log('[OPT Phase 2a] Added buffer:', best.product || best.id, '(iteration', iterations + ')');
        }

        const finalF0 = core.computeF0(nodes);
        console.log('[OPT Phase 2a] âœ“ Done. Buffers added:', buffersAdded.length, '| Final f0:', finalF0.toFixed(1));
        return { buffersAdded, finalF0 };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 2b â€” GREEDY COVERAGE: ALL DEMAND NODES
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 2b: greedily add buffers until f1 = 0 or no further improvement.
     * f0 must remain stable (not degrade) throughout.
     *
     * Returns: { buffersAdded: [...], finalF1: number }
     */
    function runPhase2b(network, budgetMax) {
        console.log('[OPT Phase 2b] Greedy coverage â€” all demand nodes (f1)...');
        const core  = window.DDOptim.optCore;
        const nodes = network.nodes;

        const buffersAdded = [];
        let iterations = 0;
        const MAX_ITER = nodeCount(nodes) + 1;
        const lockedF0 = core.computeF0(nodes);

        while (core.computeF1(nodes) > 0 && iterations < MAX_ITER) {
            iterations++;
            const best = greedyStep(nodes, network, 'f1', budgetMax, lockedF0);
            if (!best) {
                console.log('[OPT Phase 2b] No more improvement possible at iteration', iterations);
                break;
            }
            best.hasBuffer = true;
            core.fullRecalc(network);
            buffersAdded.push({
                nodeId: best.id,
                product: best.product || best.id,
                location: best.location || '',
                inventoryValue: best.bufferSizing ? (best.bufferSizing.inventoryValue || 0) : 0,
                phase: '2b'
            });
            console.log('[OPT Phase 2b] Added buffer:', best.product || best.id, '(iteration', iterations + ')');
        }

        const finalF1 = core.computeF1(nodes);
        console.log('[OPT Phase 2b] âœ“ Done. Buffers added:', buffersAdded.length, '| Final f1:', finalF1.toFixed(1));
        return { buffersAdded, finalF1 };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EXPORT
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    window.DDOptim = window.DDOptim || {};
    window.DDOptim.optPhases = window.DDOptim.optPhases || {};
    Object.assign(window.DDOptim.optPhases, {
        runPhase1,
        runPhase2a,
        runPhase2b
    });

    console.log('[OPT Phases 1-2] âœ“ Loaded');
})();