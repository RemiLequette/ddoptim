// UI Event Handlers - Detail Panel Renderer
(function() {
  // Show node details in panel with editable controls
  function showNodeDetails(nodeId) {
    console.log('ðŸ“‹ showNodeDetails called for nodeId:', nodeId);
    
    UIHandlers.setCurrentNodeId(nodeId);
    const panel = document.getElementById('node-detail-panel');
    const content = document.getElementById('detail-panel-content');
    const currentNetwork = window.currentNetwork;
    
    console.log('ðŸ” Panel element:', panel);
    console.log('ðŸ” Content element:', content);
    console.log('ðŸ” Current network:', currentNetwork);
    
    if (!panel) {
      console.error('âŒ Panel element not found!');
      return;
    }
    
    if (!content) {
      console.error('âŒ Content element not found!');
      return;
    }
    
    if (!currentNetwork || !currentNetwork.nodes) {
      console.error('âŒ No network loaded');
      return;
    }
    
    const node = currentNetwork.nodes.get ? currentNetwork.nodes.get(nodeId) : currentNetwork.nodes[nodeId];
    if (!node) {
      console.error('âŒ Node not found:', nodeId);
      return;
    }
    
    console.log('âœ“ Node found:', node.name);
    
    const profile = currentNetwork.profiles ? 
      (currentNetwork.profiles.get ? currentNetwork.profiles.get(node.bufferProfile) : currentNetwork.profiles[node.bufferProfile]) 
      : null;
    
    let html = '';
    
    // === BASIC INFORMATION ===
    html += '<div class="detail-section">';
    html += '<div class="detail-section-title">Basic Information</div>';
    
    html += '<div class="detail-field">';
    html += '<div class="detail-label">Name</div>';
    html += `<div class="detail-value highlight">${node.name}</div>`;
    html += '</div>';
    
    html += '<div class="detail-field">';
    html += '<div class="detail-label">Type</div>';
    html += `<div class="detail-value"><span class="type-badge ${node.type.replace('_', '-')}">${UIHandlers.formatType(node.type)}</span></div>`;
    html += '</div>';
    
    if (node.customerTolerance && node.independentADU > 0) {
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Customer Tolerance</div>';
      html += `<div class="detail-value">${node.customerTolerance} days</div>`;
      html += '</div>';
    }
    html += '</div>';
    
    // === USER-EDITABLE SCENARIO PARAMETERS ===
    html += '<div class="detail-section editable-section">';
    html += '<div class="detail-section-title">Scenario Parameters âœï¸</div>';
    
    // Independent ADU
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-independent-adu">Independent ADU</label>';
    html += '<div class="detail-input-group">';
    html += `<input type="number" id="edit-independent-adu" class="detail-input" value="${node.independentADU || 0}" min="0" step="1">`;
    html += '<span class="detail-input-unit">units/day</span>';
    html += '</div>';
    html += '<div class="detail-help">ðŸ’¡ Direct customer demand for this item</div>';
    html += '</div>';
    
    // Customer Lead Time (only shown if independentADU > 0)
    if (node.independentADU > 0) {
      html += '<div class="detail-field">';
      html += '<label class="detail-label" for="edit-customer-lead-time">Customer Tolerance</label>';
      html += '<div class="detail-input-group">';
      html += `<input type="number" id="edit-customer-lead-time" class="detail-input" value="${node.customerTolerance || 0}" min="0" step="1">`;
      html += '<span class="detail-input-unit">days</span>';
      html += '</div>';
      html += '<div class="detail-help">ðŸ“… Customer tolerance (maximum acceptable delivery time)</div>';
      html += '</div>';
    }
    
    // Lead Time
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-lead-time">Lead Time</label>';
    html += '<div class="detail-input-group">';
    html += `<input type="number" id="edit-lead-time" class="detail-input" value="${node.leadTime}" min="1" step="1">`;
    html += '<span class="detail-input-unit">days</span>';
    html += '</div>';
    html += '<div class="detail-help">âš ï¸ Changes CLT/DLT for entire network</div>';
    html += '</div>';
    
    // Buffer Profile
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-buffer-profile">Buffer Profile</label>';
    html += '<select id="edit-buffer-profile" class="detail-select">';
    const profiles = ['F', 'I', 'U', 'AL', 'AI'];
    const profileNames = {
      F: 'F - FabriquÃ©s (Finished)',
      I: 'I - IntermÃ©diaires (Semi-finished)',
      U: 'U - UsinÃ©s (Machined)',
      AL: 'AL - AchetÃ©s Local (Local suppliers)',
      AI: 'AI - AchetÃ©s International'
    };
    profiles.forEach(p => {
      const selected = p === node.bufferProfile ? 'selected' : '';
      html += `<option value="${p}" ${selected}>${profileNames[p]}</option>`;
    });
    html += '</select>';
    html += '<div class="detail-help">ðŸ“Š Determines variability and lead time factors</div>';
    html += '</div>';
    
    // MOQ
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-moq">MOQ (Minimum Order Quantity)</label>';
    html += '<div class="detail-input-group">';
    html += `<input type="number" id="edit-moq" class="detail-input" value="${node.moq || 0}" min="0" step="1">`;
    html += '<span class="detail-input-unit">units</span>';
    html += '</div>';
    html += '<div class="detail-help">ðŸ“¦ Minimum order quantity constraint</div>';
    html += '</div>';
    
    // Order Cycle
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-order-cycle">Order Cycle</label>';
    html += '<div class="detail-input-group">';
    html += `<input type="number" id="edit-order-cycle" class="detail-input" value="${node.orderCycle || 0}" min="0" step="1">`;
    html += '<span class="detail-input-unit">days</span>';
    html += '</div>';
    html += '<div class="detail-help">ðŸ”„ Desired ordering frequency (0 = no cycle constraint)</div>';
    html += '</div>';
    
    // Unit Cost
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-unit-cost">Unit Cost</label>';
    html += '<div class="detail-input-group">';
    html += `<input type="number" id="edit-unit-cost" class="detail-input" value="${node.unitCost || 0}" min="0" step="0.01">`;
    html += '<span class="detail-input-unit">â‚¬</span>';
    html += '</div>';
    html += '<div class="detail-help">ðŸ’° Cost per unit for inventory valuation</div>';
    html += '</div>';
    html += '</div>';
    
    // === BUFFER POSITIONING ===
    html += '<div class="detail-section editable-section">';
    html += '<div class="detail-section-title">Buffer Positioning âœï¸</div>';
    
    // Buffer Lock Checkbox
    const bufferLocked = node.bufferLocked || false;
    html += '<div class="detail-field">';
    html += '<label class="checkbox-label">';
    html += `<input type="checkbox" id="edit-buffer-locked" ${bufferLocked ? 'checked' : ''}>`;
    html += ' ðŸ”’ Lock buffer decision (prevent auto-positioning changes)';
    html += '</label>';
    html += '<div class="detail-help">âš¡ When locked, Auto-Position algorithm will preserve this buffer decision</div>';
    html += '</div>';
    
    // Has Buffer Checkbox
    const hasBuffer = node.hasBuffer || false;
    html += '<div class="detail-field">';
    html += '<label class="checkbox-label">';
    html += `<input type="checkbox" id="edit-has-buffer" ${hasBuffer ? 'checked' : ''}>`;
    html += ' Add Strategic Buffer';
    html += '</label>';
    html += '</div>';
    
    // Buffer Rationale
    html += '<div class="detail-field">';
    html += '<label class="detail-label" for="edit-buffer-rationale">Rationale</label>';
    html += `<textarea id="edit-buffer-rationale" class="detail-textarea" rows="3" placeholder="Optional notes">${node.bufferRationale || ''}</textarea>`;
    html += '</div>';
    html += '</div>';
    
    // === CALCULATED VALUES (Read-Only) ===
    html += '<div class="detail-section">';
    html += '<div class="detail-section-title">Calculated Values ðŸ”’</div>';
    
    if (node.calculatedADU !== undefined) {
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Calculated ADU</div>';
      html += `<div class="detail-value calculated">ðŸ”’ ${node.calculatedADU.toFixed(1)} units/day</div>`;
      html += '</div>';
    }
    
    if (node.clt !== undefined) {
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Cumulative Lead Time (CLT)</div>';
      html += `<div class="detail-value calculated">ðŸ”’ ${node.clt} days</div>`;
      html += '</div>';
    }
    
    if (node.dlt !== undefined) {
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Decoupled Lead Time (DLT)</div>';
      html += `<div class="detail-value calculated">ðŸ”’ ${node.dlt} days</div>`;
      html += '</div>';
      
      // Show buffer impact if CLT is available
      if (node.clt !== undefined && node.clt !== node.dlt) {
        const bufferImpact = node.clt - node.dlt;
        html += '<div class="detail-field">';
        html += '<div class="detail-label">Buffer Impact</div>';
        html += `<div class="detail-value calculated success">ðŸ”’ -${bufferImpact} days (${Math.round(bufferImpact/node.clt*100)}% reduction)</div>`;
        html += '</div>';
      }
      
      // Show LT Exceeding Tolerance if node has customer tolerance
      if (node.independentADU > 0 && node.customerTolerance && node.ltExceeding !== undefined) {
        if (node.ltExceeding > 0) {
          // Show in green bold when there is margin
          html += '<div class="detail-field">';
          html += '<div class="detail-label">LT Exceeding Tolerance</div>';
          html += `<div class="detail-value calculated" style="color: #10b981; font-weight: 600;">ðŸ”’ ${node.ltExceeding.toFixed(1)} days margin</div>`;
          html += '</div>';
        }
      }
    }
    html += '</div>';
    
    // === BUFFER SIZING (if buffered) ===
    if (node.hasBuffer && node.bufferSizing) {
      html += '<div class="detail-section buffer-sizing-section">';
      html += '<div class="detail-section-title">ðŸ“Š DDMRP Buffer Sizing</div>';
      
      const sizing = node.bufferSizing;
      
      // Graphical buffer visualization
      html += '<div class="buffer-visual">';
      
      // Calculate percentages for visual display
      const total = sizing.topOfGreen;
      const redPct = (sizing.red / total * 100).toFixed(1);
      const yellowPct = (sizing.yellow / total * 100).toFixed(1);
      const greenPct = (sizing.green / total * 100).toFixed(1);
      
      html += '<div class="buffer-bar">';
      html += `<div class="buffer-zone red" style="height: ${redPct}%" title="Red Zone: ${sizing.red} units">`;
      html += `<span class="zone-label">Red<br>${sizing.red}</span>`;
      html += '</div>';
      html += `<div class="buffer-zone yellow" style="height: ${yellowPct}%" title="Yellow Zone: ${sizing.yellow} units">`;
      html += `<span class="zone-label">Yellow<br>${sizing.yellow}</span>`;
      html += '</div>';
      html += `<div class="buffer-zone green" style="height: ${greenPct}%" title="Green Zone: ${sizing.green} units">`;
      html += `<span class="zone-label">Green<br>${sizing.green}</span>`;
      html += '</div>';
      html += '</div>';
      
      // Average stock marker
      const avgStockPct = (sizing.averageStock / total * 100).toFixed(1);
      html += `<div class="avg-stock-marker" style="bottom: ${avgStockPct}%" title="Average Stock: ${sizing.averageStock} units">`;
      html += '<span class="marker-label">â† Avg Stock</span>';
      html += '</div>';
      
      html += '</div>';
      
      // Buffer zone details
      html += '<div class="buffer-zones-grid">';
      
      // Red Zone
      html += '<div class="zone-detail red-zone">';
      html += '<div class="zone-header">ðŸ”´ Red Zone (Safety Stock)</div>';
      html += `<div class="zone-value">${sizing.red} units</div>`;
      html += '<div class="zone-breakdown">';
      html += `Base: ${sizing.redBase} units<br>`;
      html += `Security: ${sizing.redSecurity} units (Ã—${sizing.variabilityFactor})`;
      html += '</div>';
      html += '</div>';
      
      // Yellow Zone
      html += '<div class="zone-detail yellow-zone">';
      html += '<div class="zone-header">ðŸŸ¡ Yellow Zone (Lead Time Demand)</div>';
      html += `<div class="zone-value">${sizing.yellow} units</div>`;
      html += '<div class="zone-breakdown">';
      html += `ADU Ã— DLT = ${node.calculatedADU.toFixed(1)} Ã— ${node.dlt}`;
      html += '</div>';
      html += '</div>';
      
      // Green Zone
      html += '<div class="zone-detail green-zone">';
      html += '<div class="zone-header">ðŸŸ¢ Green Zone (Order Size)</div>';
      html += `<div class="zone-value">${sizing.green} units</div>`;
      html += '<div class="zone-breakdown">';
      html += `MAX(<br>`;
      html += `  Delay: ${sizing.greenDelay} (Ã—${sizing.leadTimeFactor})<br>`;
      html += `  MOQ: ${sizing.greenMOQ}<br>`;
      html += `  Cycle: ${sizing.greenCycle}<br>`;
      html += `)`;
      html += '</div>';
      html += '</div>';
      
      html += '</div>';
      
      // Buffer levels summary
      html += '<div class="buffer-levels">';
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Top of Red</div>';
      html += `<div class="detail-value">${sizing.topOfRed} units</div>`;
      html += '</div>';
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Top of Yellow</div>';
      html += `<div class="detail-value">${sizing.topOfYellow} units</div>`;
      html += '</div>';
      html += '<div class="detail-field">';
      html += '<div class="detail-label">Top of Green</div>';
      html += `<div class="detail-value">${sizing.topOfGreen} units</div>`;
      html += '</div>';
      html += '<div class="detail-field highlight-field">';
      html += '<div class="detail-label"><strong>Average Stock</strong></div>';
      html += `<div class="detail-value"><strong>${sizing.averageStock} units</strong></div>`;
      html += '</div>';
      html += '<div class="detail-field highlight-field">';
      html += '<div class="detail-label"><strong>Inventory Value</strong></div>';
      html += `<div class="detail-value"><strong>â‚¬${sizing.inventoryValue.toFixed(2)}</strong></div>`;
      html += '</div>';
      html += '</div>';
      
      html += '</div>';
    } else if (node.hasBuffer && !node.bufferSizing) {
      // Buffer is enabled but sizing not calculated
      html += '<div class="detail-section">';
      html += '<div class="detail-section-title">âš ï¸ Buffer Sizing Not Calculated</div>';
      html += '<div class="detail-help">Buffer sizing calculation failed. Check that ADU, DLT, and buffer profile are valid.</div>';
      html += '</div>';
    }
    
    console.log('ðŸ“‹ Setting panel content HTML...');
    content.innerHTML = html;
    
    console.log('ðŸ“‹ Attaching event listeners...');
    attachEventListeners();
    
    console.log('ðŸ“‹ Adding .open class to panel...');
    panel.classList.add('open');
    console.log('ðŸ“‹ Panel classes:', panel.className);
    
    console.log('âœ“ Detail panel opened successfully');
  }
  
  // Attach event listeners to editable controls
  function attachEventListeners() {
    const nodeId = UIHandlers.getCurrentNodeId();
    
    // Independent ADU
    const aduInput = document.getElementById('edit-independent-adu');
    if (aduInput) {
      aduInput.addEventListener('change', (e) => {
        window.UIHandlers_BasicParams.handleIndependentADUChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Customer Lead Time
    const customerToleranceInput = document.getElementById('edit-customer-lead-time');
    if (customerToleranceInput) {
      customerToleranceInput.addEventListener('change', (e) => {
        window.UIHandlers_CustomerLeadTime.handleCustomerLeadTimeChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Lead Time
    const leadTimeInput = document.getElementById('edit-lead-time');
    if (leadTimeInput) {
      leadTimeInput.addEventListener('change', (e) => {
        window.UIHandlers_BasicParams.handleLeadTimeChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Buffer Profile
    const profileSelect = document.getElementById('edit-buffer-profile');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        window.UIHandlers_BasicParams.handleBufferProfileChange(nodeId, e.target.value);
      });
    }
    
    // MOQ
    const moqInput = document.getElementById('edit-moq');
    if (moqInput) {
      moqInput.addEventListener('change', (e) => {
        window.UIHandlers_Constraints.handleMOQChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Order Cycle
    const orderCycleInput = document.getElementById('edit-order-cycle');
    if (orderCycleInput) {
      orderCycleInput.addEventListener('change', (e) => {
        window.UIHandlers_Constraints.handleOrderCycleChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Unit Cost
    const unitCostInput = document.getElementById('edit-unit-cost');
    if (unitCostInput) {
      unitCostInput.addEventListener('change', (e) => {
        window.UIHandlers_Constraints.handleUnitCostChange(nodeId, parseFloat(e.target.value));
      });
    }
    
    // Buffer Locked
    const bufferLockedCheckbox = document.getElementById('edit-buffer-locked');
    if (bufferLockedCheckbox) {
      bufferLockedCheckbox.addEventListener('change', (e) => {
        window.UIHandlers_BufferDecisions.handleBufferLockedChange(nodeId, e.target.checked);
      });
    }
    
    // Has Buffer
    const hasBufferCheckbox = document.getElementById('edit-has-buffer');
    if (hasBufferCheckbox) {
      hasBufferCheckbox.addEventListener('change', (e) => {
        window.UIHandlers_BufferDecisions.handleHasBufferToggle(nodeId, e.target.checked);
      });
    }
    
    // Buffer Rationale
    const rationaleTextarea = document.getElementById('edit-buffer-rationale');
    if (rationaleTextarea) {
      rationaleTextarea.addEventListener('blur', (e) => {
        window.UIHandlers_BufferDecisions.handleBufferRationaleChange(nodeId, e.target.value);
      });
    }
  }
  
  // Extend UIHandlers with showNodeDetails
  UIHandlers.showNodeDetails = showNodeDetails;
  console.log('âœ“ showNodeDetails registered on UIHandlers');
})();
