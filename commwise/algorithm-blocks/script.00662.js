/**
 * OPT Engine â€” Phase 3 (Greedy Reduction) & Phase 4 (Swap Search)
 *
 * Phase 3: remove buffered non-locked nodes (most expensive first)
 *          if f0 and f1 remain stable after removal.
 * Phase 4: for each expensive buffer B, try replacing with:
 *          - 1 upstream ancestor (1â†’1 swap)
 *          - 2 upstream ancestors (1â†’2 swap)
 *          Accept if f0/f1 stable, budget respected, and f2 decreases.
 */
(function() {
    'use strict';

    console.log('[OPT Phases 3-4] Loading...');

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 3 â€” GREEDY INVENTORY REDUCTION
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 3: remove buffered non-locked nodes if doing so doesn't
     * degrade f0 or f1. Process from most expensive to least expensive.
     *
     * Returns: { buffersRemoved: [{nodeId, product, savedValue}], f2Reduction: number }
     */
    function runPhase3(network, lockedF0, lockedF1) {
        console.log('[OPT Phase 3] Greedy reduction (minimize f2)...');
        const core  = window.DDOptim.optCore;
        const nodes = network.nodes;

        const buffersRemoved = [];
        const f2Before = core.computeF2(nodes);

        // Get removable candidates sorted most expensive first
        let candidates = core.getRemoveCandidates(nodes)
            .sort((a, b) => {
                const va = a.bufferSizing ? (a.bufferSizing.inventoryValue || 0) : 0;
                const vb = b.bufferSizing ? (b.bufferSizing.inventoryValue || 0) : 0;
                return vb - va; // descending
            });

        // Process each candidate (iterate over snapshot, not live list)
        for (const candidate of candidates) {
            // Skip if already removed or re-locked during loop
            if (!candidate.hasBuffer || candidate.bufferLocked) continue;

            // Simulate removal
            candidate.hasBuffer = false;
            core.fullRecalc(network);

            const newF0 = core.computeF0(nodes);
            const newF1 = core.computeF1(nodes);
            const newF2 = core.computeF2(nodes);

            const coverageStable = newF0 <= lockedF0 && newF1 <= lockedF1;
            const f2Improved     = newF2 < (f2Before - buffersRemoved.reduce((s, r) => s + r.savedValue, 0));

            if (coverageStable) {
                // Accept removal
                const saved = candidate.bufferSizing ? (candidate.bufferSizing.inventoryValue || 0) : 0;
                buffersRemoved.push({
                    nodeId: candidate.id,
                    product: candidate.product || candidate.id,
                    location: candidate.location || '',
                    savedValue: saved,
                    phase: '3'
                });
                console.log('[OPT Phase 3] Removed buffer:', candidate.product || candidate.id, '(saved:', saved.toFixed(2) + ')');
            } else {
                // Reject â€” restore
                candidate.hasBuffer = true;
                core.fullRecalc(network);
            }
        }

        const f2After   = core.computeF2(nodes);
        const f2Reduction = f2Before - f2After;
        console.log('[OPT Phase 3] âœ“ Done. Removed:', buffersRemoved.length, '| f2 reduction:', f2Reduction.toFixed(2));
        return { buffersRemoved, f2Reduction };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 4 INTERNALS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get all upstream ancestor node IDs of a given node.
     * "Upstream" = children in the BOM tree (toward raw materials).
     */
    function getUpstreamAncestors(nodes, nodeId) {
        const ancestors = [];
        const visited   = new Set();
        const queue     = [];

        // Start from direct children
        const startNode = nodes.get(nodeId);
        if (!startNode || !startNode.children) return ancestors;
        startNode.children.forEach(c => queue.push(c.id));

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            const node = nodes.get(current);
            if (!node) continue;
            ancestors.push(node);

            if (node.children) {
                node.children.forEach(c => {
                    if (!visited.has(c.id)) queue.push(c.id);
                });
            }
        }
        return ancestors;
    }

    /**
     * Evaluate a swap: remove buffer B, add upstream node(s) U.
     * Returns { netDeltaF2, valid } where valid means constraints respected.
     */
    function evaluateSwap(network, nodeB, upstreamNodes, lockedF0, lockedF1, budgetMax) {
        const core  = window.DDOptim.optCore;
        const nodes = network.nodes;

        const f2Before = core.computeF2(nodes);

        // Apply swap
        nodeB.hasBuffer = false;
        upstreamNodes.forEach(u => { u.hasBuffer = true; });
        core.fullRecalc(network);

        const newF0 = core.computeF0(nodes);
        const newF1 = core.computeF1(nodes);
        const newF2 = core.computeF2(nodes);

        const valid = newF0 <= lockedF0
                   && newF1 <= lockedF1
                   && core.isBudgetRespected(nodes, budgetMax)
                   && newF2 < f2Before;

        const netDeltaF2 = f2Before - newF2; // positive = improvement

        // Undo
        nodeB.hasBuffer = true;
        upstreamNodes.forEach(u => { u.hasBuffer = false; });
        core.fullRecalc(network);

        return { netDeltaF2, valid };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 4 â€” SWAP SEARCH
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Phase 4: swap search.
     * For each expensive buffered non-locked node B, try 1â†’1 and 1â†’2
     * substitutions with upstream ancestors. Accept the best valid swap
     * that reduces f2. Restart outer loop after each accepted swap.
     *
     * Returns: { swapsApplied: [{removed, added, deltaF2}] }
     */
    function runPhase4(network, lockedF0, lockedF1, budgetMax) {
        console.log('[OPT Phase 4] Swap search...');
        const core  = window.DDOptim.optCore;
        const nodes = network.nodes;

        const swapsApplied = [];
        let changed = true;

        while (changed) {
            changed = false;

            // Sort buffered non-locked nodes by cost descending
            const removable = core.getRemoveCandidates(nodes)
                .sort((a, b) => {
                    const va = a.bufferSizing ? (a.bufferSizing.inventoryValue || 0) : 0;
                    const vb = b.bufferSizing ? (b.bufferSizing.inventoryValue || 0) : 0;
                    return vb - va;
                });

            let bestSwap = null;

            for (const nodeB of removable) {
                const upstream = getUpstreamAncestors(nodes, nodeB.id)
                    .filter(u => !u.bufferLocked && !u.hasBuffer);

                // 1â†’1 swaps
                for (const u of upstream) {
                    const result = evaluateSwap(network, nodeB, [u], lockedF0, lockedF1, budgetMax);
                    if (result.valid && result.netDeltaF2 > 0) {
                        if (!bestSwap || result.netDeltaF2 > bestSwap.netDeltaF2) {
                            bestSwap = {
                                nodeB,
                                upstreamNodes: [u],
                                netDeltaF2: result.netDeltaF2
                            };
                        }
                    }
                }

                // 1â†’2 swaps (limit to first 15 upstream to keep complexity manageable)
                const upstreamLimited = upstream.slice(0, 15);
                for (let i = 0; i < upstreamLimited.length; i++) {
                    for (let j = i + 1; j < upstreamLimited.length; j++) {
                        const u1 = upstreamLimited[i];
                        const u2 = upstreamLimited[j];
                        const result = evaluateSwap(network, nodeB, [u1, u2], lockedF0, lockedF1, budgetMax);
                        if (result.valid && result.netDeltaF2 > 0) {
                            if (!bestSwap || result.netDeltaF2 > bestSwap.netDeltaF2) {
                                bestSwap = {
                                    nodeB,
                                    upstreamNodes: [u1, u2],
                                    netDeltaF2: result.netDeltaF2
                                };
                            }
                        }
                    }
                }
            }

            if (bestSwap) {
                // Apply best swap
                bestSwap.nodeB.hasBuffer = false;
                bestSwap.upstreamNodes.forEach(u => { u.hasBuffer = true; });
                core.fullRecalc(network);
                changed = true;

                swapsApplied.push({
                    removed: {
                        nodeId: bestSwap.nodeB.id,
                        product: bestSwap.nodeB.product || bestSwap.nodeB.id
                    },
                    added: bestSwap.upstreamNodes.map(u => ({
                        nodeId: u.id,
                        product: u.product || u.id
                    })),
                    deltaF2: bestSwap.netDeltaF2,
                    phase: '4'
                });
                console.log('[OPT Phase 4] Swap applied: removed', bestSwap.nodeB.product || bestSwap.nodeB.id,
                    '-> added', bestSwap.upstreamNodes.map(u => u.product || u.id).join(' + '),
                    '| Î”f2:', bestSwap.netDeltaF2.toFixed(2));
            }
        }

        console.log('[OPT Phase 4] âœ“ Done. Swaps applied:', swapsApplied.length);
        return { swapsApplied };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EXPORT
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    window.DDOptim = window.DDOptim || {};
    window.DDOptim.optPhases = window.DDOptim.optPhases || {};
    Object.assign(window.DDOptim.optPhases, {
        runPhase3,
        runPhase4
    });

    console.log('[OPT Phases 3-4] âœ“ Loaded');
})();