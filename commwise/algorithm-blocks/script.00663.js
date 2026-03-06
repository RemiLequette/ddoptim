/**
 * OPT Engine â€” Orchestrator
 *
 * Public API: window.DDOptim.OPT.run(options)
 *
 * options: {
 *   network:   object    â€” current DDOptim network (nodes Map, profiles, etc.)
 *   budgetMax: number|null â€” max total inventory value (null = unlimited)
 * }
 *
 * Returns: {
 *   feasible:   bool,
 *   feasibilityReport: { structural, budget } | null,
 *   before:     { f0, f1, f2 },
 *   after:      { f0, f1, f2 },
 *   changes:    { added: [...], removed: [...], swaps: [...] },
 *   log:        string[]
 * }
 */
(function() {
    'use strict';

    console.log('[OPT Orchestrator] Loading...');

    /**
     * Run the full OPT algorithm.
     * The live network is modified in-place during execution.
     * On infeasibility, the network is restored to its pre-run state.
     * On success, the network reflects the optimized buffer positioning.
     */
    function run(options) {
        const { network, budgetMax = null } = options;

        if (!network || !network.nodes) {
            console.error('[OPT] No network provided');
            return { feasible: false, error: 'No network loaded' };
        }

        const core   = window.DDOptim.optCore;
        const phases = window.DDOptim.optPhases;

        if (!core || !phases) {
            console.error('[OPT] Core or phases modules not loaded');
            return { feasible: false, error: 'OPT engine modules not loaded' };
        }

        const log = [];
        const push = (msg) => { log.push(msg); console.log('[OPT]', msg); };

        // Snapshot to restore on infeasibility
        const preRunSnapshot = core.snapshotNetwork(network.nodes);
        const before = core.computeObjectives(network.nodes);

        push(`Starting OPT. Budget: ${budgetMax !== null ? 'â‚¬' + budgetMax.toFixed(2) : 'unlimited'}`);
        push(`Before â€” f0: ${before.f0.toFixed(1)}, f1: ${before.f1.toFixed(1)}, f2: â‚¬${before.f2.toFixed(2)}`);

        // â”€â”€â”€ Phase 0: Feasibility â”€â”€â”€
        push('Phase 0: Feasibility check...');
        const feasResult = core.runFeasibilityCheck(network, budgetMax);
        if (!feasResult.feasible) {
            push('Phase 0: INFEASIBLE â€” aborting.');
            core.restoreSnapshot(network.nodes, preRunSnapshot);
            core.fullRecalc(network);
            return {
                feasible: false,
                feasibilityReport: feasResult.report,
                before,
                after: null,
                changes: null,
                log
            };
        }
        push('Phase 0: âœ“ Feasible.');

        // Collect buffer changes vs pre-run state for the final report
        const preRunBuffers = new Set();
        network.nodes.forEach(node => {
            if (node.hasBuffer) preRunBuffers.add(node.id);
        });

        // â”€â”€â”€ Phase 1: Initialize â”€â”€â”€
        push('Phase 1: Initializing from zero buffers...');
        const p1 = phases.runPhase1(network);
        push(`Phase 1: âœ“ ${p1.buffersPreserved} locked buffer(s) preserved.`);

        // â”€â”€â”€ Phase 2a: Mandatory coverage â”€â”€â”€
        push('Phase 2a: Greedy coverage (mandatory nodes)...');
        const p2a = phases.runPhase2a(network, budgetMax);
        push(`Phase 2a: âœ“ Added ${p2a.buffersAdded.length} buffer(s). Final f0: ${p2a.finalF0.toFixed(1)}`);

        // â”€â”€â”€ Phase 2b: All demand node coverage â”€â”€â”€
        push('Phase 2b: Greedy coverage (all demand nodes)...');
        const p2b = phases.runPhase2b(network, budgetMax);
        push(`Phase 2b: âœ“ Added ${p2b.buffersAdded.length} buffer(s). Final f1: ${p2b.finalF1.toFixed(1)}`);

        // Lock f0 and f1 for reduction phases
        const lockedF0 = core.computeF0(network.nodes);
        const lockedF1 = core.computeF1(network.nodes);

        // â”€â”€â”€ Phase 3: Greedy reduction â”€â”€â”€
        push('Phase 3: Greedy inventory reduction...');
        const p3 = phases.runPhase3(network, lockedF0, lockedF1);
        push(`Phase 3: âœ“ Removed ${p3.buffersRemoved.length} buffer(s). f2 reduced by â‚¬${p3.f2Reduction.toFixed(2)}`);

        // â”€â”€â”€ Phase 4: Swap search â”€â”€â”€
        push('Phase 4: Swap search...');
        const p4 = phases.runPhase4(network, lockedF0, lockedF1, budgetMax);
        push(`Phase 4: âœ“ ${p4.swapsApplied.length} swap(s) applied.`);

        // â”€â”€â”€ Compute final objectives â”€â”€â”€
        const after = core.computeObjectives(network.nodes);
        push(`After  â€” f0: ${after.f0.toFixed(1)}, f1: ${after.f1.toFixed(1)}, f2: â‚¬${after.f2.toFixed(2)}`);
        push(`f2 improvement: â‚¬${(before.f2 - after.f2).toFixed(2)} (${before.f2 > 0 ? ((before.f2 - after.f2) / before.f2 * 100).toFixed(1) : 0}%)`);

        // â”€â”€â”€ Build change list vs pre-run state â”€â”€â”€
        const added   = [];
        const removed = [];
        network.nodes.forEach(node => {
            const wasBuffered = preRunBuffers.has(node.id);
            const isBuffered  = node.hasBuffer;
            if (!wasBuffered && isBuffered) {
                added.push({
                    nodeId: node.id,
                    product: node.product || node.id,
                    location: node.location || '',
                    inventoryValue: node.bufferSizing ? (node.bufferSizing.inventoryValue || 0) : 0
                });
            } else if (wasBuffered && !isBuffered) {
                removed.push({
                    nodeId: node.id,
                    product: node.product || node.id,
                    location: node.location || ''
                });
            }
        });

        push(`Net change: +${added.length} buffers added, -${removed.length} buffers removed.`);

        return {
            feasible: true,
            feasibilityReport: feasResult.report,
            before,
            after,
            changes: {
                added,
                removed,
                swaps: p4.swapsApplied,
                phase2aBuffers: p2a.buffersAdded,
                phase2bBuffers: p2b.buffersAdded,
                phase3Removals: p3.buffersRemoved
            },
            log
        };
    }

    // â”€â”€â”€ Export â”€â”€â”€
    window.DDOptim = window.DDOptim || {};
    window.DDOptim.OPT = { run };

    console.log('[OPT Orchestrator] âœ“ Loaded. API: window.DDOptim.OPT.run(options)');
})();