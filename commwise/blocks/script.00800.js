// Network Renderer Module
const NetworkRenderer = (function() {
  let svg, g, zoom, nodes, links;
  let simulation;
  let tooltip; // Custom tooltip div
  let currentTransform = null; // Store current zoom/pan state
  const nodeWidth = 120;
  const nodeHeight = 50;
  const badgeRadius = 18;
  
  // Helper: Get lead time value based on display mode
  function getLeadTimeDisplay(node) {
    const mode = window.leadTimeDisplayMode || 'decoupled';
    
    let leadTime;
    switch(mode) {
      case 'immediate':
        leadTime = node.leadTime; // Just this node's lead time
        break;
      case 'cumulative':
        leadTime = node.clt !== undefined ? node.clt : node.leadTime; // CLT if available
        break;
      case 'decoupled':
      default:
        leadTime = node.dlt !== undefined ? node.dlt : node.leadTime; // DLT if available
        break;
    }
    
    console.log(`ðŸ“Š Lead time for ${node.name}: mode=${mode}, leadTime=${node.leadTime}, CLT=${node.clt}, DLT=${node.dlt}, displaying=${leadTime}`);
    return leadTime;
  }
  
  // Helper: Create SVG for buffer zones visualization in tooltip
  function createBufferZonesSVG(node) {
    if (!node.hasBuffer || !node.bufferSizing) {
      return '';
    }
    
    const sizing = node.bufferSizing;
    const totalHeight = sizing.topOfGreen || 0;
    
    if (totalHeight === 0) {
      return '';
    }
    
    // DDMRP buffer zones stack from BOTTOM to TOP
    const red = sizing.red || 0;
    const yellow = sizing.yellow || 0;
    const green = sizing.green || 0;
    
    // Maximum bar height to fit in tooltip (with margin for title and labels)
    const MAX_BAR_HEIGHT = 150; // pixels
    
    // Scale zones proportionally to fit within max height
    const scale = Math.min(1, MAX_BAR_HEIGHT / totalHeight);
    const redHeight = Math.max(1, Math.round(red * scale));
    const yellowHeight = Math.max(1, Math.round(yellow * scale));
    const greenHeight = Math.max(1, Math.round(green * scale));
    
    // Calculate Y positions for bottom-to-top stacking
    const startY = 20;
    const totalBarHeight = redHeight + yellowHeight + greenHeight;
    const redY = startY + totalBarHeight - redHeight;
    const yellowY = redY - yellowHeight;
    const greenY = yellowY - greenHeight;
    
    // SVG height = title (20px) + bar height + bottom margin (10px)
    const svgHeight = 20 + totalBarHeight + 10;
    
    return `
      <svg width="140" height="${svgHeight}" style="margin: 8px 0;">
        <text x="70" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="#374151">Buffer Zones</text>
        <!-- Green zone (TOP) -->
        <rect x="20" y="${greenY}" width="80" height="${greenHeight}" fill="#d1fae5" stroke="#065f46" stroke-width="1"/>
        <text x="105" y="${greenY + greenHeight/2}" dominant-baseline="middle" font-size="10" fill="#065f46">G: ${green}</text>
        <!-- Yellow zone (MIDDLE) -->
        <rect x="20" y="${yellowY}" width="80" height="${yellowHeight}" fill="#fef3c7" stroke="#92400e" stroke-width="1"/>
        <text x="105" y="${yellowY + yellowHeight/2}" dominant-baseline="middle" font-size="10" fill="#92400e">Y: ${yellow}</text>
        <!-- Red zone (BOTTOM) -->
        <rect x="20" y="${redY}" width="80" height="${redHeight}" fill="#fee2e2" stroke="#991b1b" stroke-width="1"/>
        <text x="105" y="${redY + redHeight/2}" dominant-baseline="middle" font-size="10" fill="#991b1b">R: ${red}</text>
        <!-- Zone labels -->
        <text x="10" y="${greenY + greenHeight/2}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="#065f46" font-weight="600">G</text>
        <text x="10" y="${yellowY + yellowHeight/2}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="#92400e" font-weight="600">Y</text>
        <text x="10" y="${redY + redHeight/2}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="#991b1b" font-weight="600">R</text>
      </svg>
    `;
  }
  
  // Helper: Build comprehensive tooltip HTML with two-column layout
  function buildTooltipHTML(node) {
    if (!node) return '';
    
    const typeLabels = {
      'finished_product': 'Finished Product',
      'intermediate': 'Intermediate',
      'machined': 'Machined',
      'purchased_local': 'Purchased Local',
      'purchased_international': 'Purchased International'
    };
    
    // Build left column (node info)
    let leftColumn = `
      <div style="flex: 1; min-width: 240px;">
        <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
          ${node.name}
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">
          ${typeLabels[node.type] || node.type}
        </div>
    `;
    
    // Customer Tolerance Gap Alert (if any)
    if (node.missingCustomerLeadTime && node.missingCustomerLeadTime > 0) {
      leftColumn += `
        <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 6px; padding: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">!</div>
            <div style="font-size: 11px; font-weight: 600; color: #991b1b;">Customer Tolerance Gap</div>
          </div>
          <div style="font-size: 10px; color: #991b1b; margin-top: 4px; margin-left: 26px;">
            Gap: ${node.missingCustomerLeadTime.toFixed(1)} days<br/>
            Current DLT (${node.dlt}d) exceeds requirement (${node.customerTolerance || 0}d)
          </div>
        </div>
      `;
    }
    
    // Lead Times Section
    leftColumn += `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 4px;">Lead Times</div>
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">
          <div>Immediate: ${node.leadTime}d</div>
          <div>Cumulative (CLT): ${node.clt !== undefined ? node.clt + 'd' : 'N/A'}</div>
          <div>Decoupled (DLT): ${node.dlt !== undefined ? node.dlt + 'd' : 'N/A'}</div>
    `;
    
    if (node.customerTolerance !== undefined && node.customerTolerance !== null) {
      leftColumn += `<div>Customer Requirement: ${node.customerTolerance}d</div>`;
    }
    
    leftColumn += `
        </div>
      </div>
    `;
    
    // ADU Section
    leftColumn += `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 4px;">Average Daily Usage</div>
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">
    `;
    
    if (node.independentADU > 0) {
      leftColumn += `<div>Independent: ${node.independentADU.toFixed(1)} units/day</div>`;
    }
    
    if (node.calculatedADU !== undefined && node.calculatedADU !== null) {
      leftColumn += `<div>Total (Calculated): ${node.calculatedADU.toFixed(1)} units/day</div>`;
    }
    
    leftColumn += `
        </div>
      </div>
    `;
    
    // Constraints Section (if any)
    if ((node.moq && node.moq > 0) || (node.orderCycle && node.orderCycle > 0)) {
      leftColumn += `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 4px;">Constraints</div>
          <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">
      `;
      
      if (node.moq && node.moq > 0) {
        leftColumn += `<div>MOQ: ${node.moq} units</div>`;
      }
      
      if (node.orderCycle && node.orderCycle > 0) {
        leftColumn += `<div>Order Cycle: ${node.orderCycle} days</div>`;
      }
      
      leftColumn += `
          </div>
        </div>
      `;
    }
    
    // Unit Cost
    if (node.unitCost !== undefined && node.unitCost !== null) {
      leftColumn += `
        <div style="font-size: 10px; color: #6b7280;">
          Unit Cost: â‚¬${node.unitCost.toLocaleString()}
        </div>
      `;
    }
    
    leftColumn += `</div>`; // Close left column
    
    // Build right column (buffer info) - only if buffered
    let rightColumn = '';
    if (node.hasBuffer) {
      rightColumn = `
        <div style="flex: 0 0 180px; border-left: 2px solid #e5e7eb; padding-left: 12px; margin-left: 12px;">
          <div style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 8px;">Strategic Buffer</div>
          <div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 8px;">
            <div>Profile: ${node.bufferProfile || 'N/A'}</div>
      `;
      
      if (node.bufferSizing) {
        rightColumn += `
            <div>Avg Stock: ${Math.round(node.bufferSizing.averageStock || 0)} units</div>
            <div>Value: â‚¬${(node.bufferSizing.inventoryValue || 0).toLocaleString()}</div>
        `;
      }
      
      rightColumn += `</div>`;
      
      // Add buffer zones visualization
      rightColumn += createBufferZonesSVG(node);
      
      rightColumn += `</div>`; // Close right column
    }
    
    // Combine columns with flexbox layout
    const html = `
      <div style="font-family: 'Figtree', sans-serif; padding: 12px; display: flex; gap: 0; min-width: ${node.hasBuffer ? '500px' : '280px'}; max-width: 650px;">
        ${leftColumn}
        ${rightColumn}
      </div>
    `;
    
    return html;
  }
  
  // Initialize SVG and zoom behavior
  function init() {
    const container = d3.select('#network-svg');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    
    svg = container
      .attr('width', width)
      .attr('height', height);
    
    // Create main group for zooming/panning
    g = svg.append('g');
    
    // Setup zoom behavior
    zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        currentTransform = event.transform; // Store current transform
      });
    
    svg.call(zoom);
    
    // Zoom button handlers
    d3.select('#zoom-in').on('click', () => {
      svg.transition().call(zoom.scaleBy, 1.3);
    });
    
    d3.select('#zoom-out').on('click', () => {
      svg.transition().call(zoom.scaleBy, 0.7);
    });
    
    d3.select('#zoom-reset').on('click', () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity);
      currentTransform = null; // Reset stored transform
    });
    
    // Create tooltip div
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'ddoptim-tooltip');
  }
  
  // Convert network data to D3 hierarchy (TOP-DOWN: finished products at top)
  function prepareHierarchy(network) {
    // Find root nodes (finished products with no parents)
    const roots = Array.from(network.nodes.values())
      .filter(node => !node.parents || node.parents.length === 0);
    
    console.log('ðŸŒ³ Building hierarchy from root nodes (finished products):', roots.map(n => n.name));
    
    // Build tree structure DOWNWARD from finished products to components
    function buildTree(nodeId) {
      const node = network.nodes.get(nodeId);
      if (!node) return null;
      
      const children = [];
      // Find all nodes that this node uses as children (components in BOM)
      if (node.children && node.children.length > 0) {
        node.children.forEach(childRef => {
          const child = buildTree(childRef.id);  // âœ“ Use child.id (canonical format)
          if (child) {
            // Store quantity from parent's perspective
            child.quantity = childRef.quantity;
            children.push(child);
          }
        });
      }
      
      return {
        id: nodeId,
        data: node,
        children: children.length > 0 ? children : null
      };
    }
    
    // If multiple roots, create virtual root
    if (roots.length === 0) {
      console.warn('âš ï¸ No root nodes found (no finished products)');
      return { id: 'root', children: [] };
    } else if (roots.length === 1) {
      console.log('âœ“ Single root node (finished product):', roots[0].name);
      return buildTree(roots[0].id);
    } else {
      console.log('âœ“ Multiple root nodes (finished products), creating virtual root');
      return {
        id: 'virtual-root',
        children: roots.map(r => buildTree(r.id))
      };
    }
  }
  
  // Add buffer icon (trapezoid with red/yellow/green bands)
  function addBufferIcon(nodeGroup) {
    // Buffer icon positioned at top-right corner
    const bufferWidth = 30;
    const bufferHeight = 20;
    const bufferX = nodeWidth / 2 - bufferWidth - 5; // 5px from right edge
    const bufferY = -nodeHeight / 2 + 3; // 3px from top edge
    
    // Create group for buffer icon
    const bufferGroup = nodeGroup.append('g')
      .attr('class', 'buffer-icon')
      .attr('transform', `translate(${bufferX}, ${bufferY})`);
    
    // Trapezoid shape (wider at top, narrower at bottom)
    const topWidth = bufferWidth;
    const bottomWidth = bufferWidth * 0.7;
    const widthDiff = (topWidth - bottomWidth) / 2;
    
    // Each band is 1/3 of height
    const bandHeight = bufferHeight / 3;
    
    // Red zone (bottom)
    bufferGroup.append('path')
      .attr('d', `
        M ${widthDiff} ${bufferHeight}
        L 0 ${bufferHeight - bandHeight}
        L ${topWidth} ${bufferHeight - bandHeight}
        L ${topWidth - widthDiff} ${bufferHeight}
        Z
      `)
      .attr('fill', '#ef4444')
      .attr('stroke', '#991b1b')
      .attr('stroke-width', 0.5);
    
    // Yellow zone (middle)
    bufferGroup.append('path')
      .attr('d', `
        M 0 ${bufferHeight - bandHeight}
        L 0 ${bufferHeight - 2 * bandHeight}
        L ${topWidth} ${bufferHeight - 2 * bandHeight}
        L ${topWidth} ${bufferHeight - bandHeight}
        Z
      `)
      .attr('fill', '#fbbf24')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 0.5);
    
    // Green zone (top)
    bufferGroup.append('path')
      .attr('d', `
        M 0 ${bufferHeight - 2 * bandHeight}
        L 0 0
        L ${topWidth} 0
        L ${topWidth} ${bufferHeight - 2 * bandHeight}
        Z
      `)
      .attr('fill', '#10b981')
      .attr('stroke', '#065f46')
      .attr('stroke-width', 0.5);
  }
  
  // Add independent ADU badge (small rectangle OUTSIDE top-right corner)
  function addIndependentADUBadge(nodeGroup, node) {
    if (!node.independentADU || node.independentADU <= 0) {
      return; // Don't show badge if no independent ADU
    }
    
    // Position OUTSIDE node at top-right corner (similar to lead time badge)
    const badgeX = nodeWidth / 2; // Right edge of node (anchor point)
    const badgeY = -nodeHeight / 2; // Top edge of node
    
    // Create group for ADU badge
    const aduGroup = nodeGroup.append('g')
      .attr('class', 'adu-badge')
      .attr('transform', `translate(${badgeX}, ${badgeY})`);
    
    // Format ADU value (round to 1 decimal if needed)
    const aduText = node.independentADU % 1 === 0 
      ? node.independentADU.toString() 
      : node.independentADU.toFixed(1);
    
    // Measure text to size rectangle dynamically
    const fontSize = 10;
    const padding = 4;
    const estimatedWidth = aduText.length * (fontSize * 0.6) + padding * 2;
    const badgeHeight = 16;
    
    // Rectangle background (grows rightward from anchor point)
    aduGroup.append('rect')
      .attr('x', 0) // Start at anchor point, grow right
      .attr('y', 0)
      .attr('width', estimatedWidth)
      .attr('height', badgeHeight)
      .attr('rx', 3) // Rounded corners
      .attr('ry', 3)
      .attr('fill', '#3b82f6') // Blue background
      .attr('stroke', '#1e40af')
      .attr('stroke-width', 1);
    
    // ADU text
    aduGroup.append('text')
      .attr('class', 'adu-badge-text')
      .attr('x', estimatedWidth / 2) // Center in rectangle
      .attr('y', badgeHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', `${fontSize}px`)
      .style('font-weight', '600')
      .style('fill', 'white')
      .text(aduText);
  }
  
  // Add Customer Tolerance Gap alert badge (red circle at bottom-right)
  function addCustomerLeadTimeGapBadge(nodeGroup, node) {
    if (!node.missingCustomerLeadTime || node.missingCustomerLeadTime <= 0) {
      return; // Don't show badge if no gap
    }
    
    // Position OUTSIDE node at bottom-right corner
    const badgeX = nodeWidth / 2; // Right edge of node
    const badgeY = nodeHeight / 2; // Bottom edge of node
    const badgeSize = 20;
    
    // Create group for alert badge
    const alertGroup = nodeGroup.append('g')
      .attr('class', 'alert-badge')
      .attr('transform', `translate(${badgeX}, ${badgeY})`);
    
    // Red circle background
    alertGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', badgeSize / 2)
      .attr('fill', '#ef4444') // Red background
      .attr('stroke', '#991b1b')
      .attr('stroke-width', 2);
    
    // Alert icon (exclamation mark)
    alertGroup.append('text')
      .attr('class', 'alert-icon')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .style('fill', 'white')
      .text('!');
  }
  
  // Render network (with optional preserveView flag)
  function render(network, preserveView = false) {
    // Hide loading indicator
    d3.select('#network-loading').style('display', 'none');
    
    // Clear previous render
    g.selectAll('*').remove();
    
    // Prepare hierarchy
    const root = d3.hierarchy(prepareHierarchy(network));
    
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    
    // Create tree layout (TOP-TO-BOTTOM: finished products at top, components below)
    // INCREASED SEPARATION: More space between leaf nodes to prevent overlap
    const treeLayout = d3.tree()
      .size([width - 100, height - 100])
      .separation((a, b) => {
        // More spacing for leaf nodes (components at bottom level)
        if (!a.children && !b.children) {
          // Both are leaf nodes - give them extra space
          return a.parent === b.parent ? 2.0 : 2.5;
        }
        // Standard spacing for non-leaf nodes
        return a.parent === b.parent ? 1.0 : 1.5;
      });
    
    treeLayout(root);
    
    // Extract links and nodes
    const treeLinks = root.links();
    const treeNodes = root.descendants();
    
    // Draw links (VERTICAL: top-to-bottom flow)
    const linkSelection = g.selectAll('.link')
      .data(treeLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y));
    
    // Add BOM quantity labels on links
    const linkLabelSelection = g.selectAll('.link-label')
      .data(treeLinks)
      .enter()
      .append('g')
      .attr('class', 'link-label');
    
    // Position labels at midpoint of links
    linkLabelSelection.attr('transform', d => {
      const midX = (d.source.x + d.target.x) / 2;
      const midY = (d.source.y + d.target.y) / 2;
      return `translate(${midX}, ${midY})`;
    });
    
    // Add white background circle for readability
    linkLabelSelection.append('circle')
      .attr('r', 12)
      .attr('fill', 'white')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1.5);
    
    // Add quantity text
    linkLabelSelection.append('text')
      .attr('class', 'link-quantity')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(d => {
        // Get quantity from target node (child has quantity attribute)
        const quantity = d.target.data.quantity;
        return quantity !== undefined && quantity > 1 ? quantity : '';
      });
    
    // Draw nodes
    const nodeSelection = g.selectAll('.node')
      .data(treeNodes.filter(d => d.data.id !== 'virtual-root'))
      .enter()
      .append('g')
      .attr('class', d => {
        const node = d.data.data;
        if (!node) return 'node';
        let classes = ['node', node.type.replace('_', '-')];
        if (node.hasBuffer) classes.push('buffered');
        if (node.missingCustomerLeadTime && node.missingCustomerLeadTime > 0) classes.push('has-gap');
        return classes.join(' ');
      })
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('data-node-id', d => d.data.id) // Store node ID for updates
      .on('click', (event, d) => {
        console.log('ðŸ‘ï¸ Node clicked:', d.data.id, d.data.data ? d.data.data.name : 'no data');
        if (d.data.data) {
          selectNode(d.data.data.id);
        }
      })
      .on('mouseover', (event, d) => {
        if (!d.data.data) return;
        tooltip
          .html(buildTooltipHTML(d.data.data))
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .classed('visible', true);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.classed('visible', false);
      });
    
    // Add rounded rectangles
    nodeSelection.append('rect')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight);
    
    // Add lead time badge (circle outside top-left corner)
    const badgeOffsetX = -nodeWidth / 2;
    const badgeOffsetY = -nodeHeight / 2;
    
    nodeSelection.append('circle')
      .attr('class', 'leadtime-badge')
      .attr('cx', badgeOffsetX)
      .attr('cy', badgeOffsetY)
      .attr('r', badgeRadius);
    
    // Add lead time text in badge (uses display mode)
    nodeSelection.append('text')
      .attr('class', 'leadtime-text')
      .attr('x', badgeOffsetX)
      .attr('y', badgeOffsetY)
      .text(d => {
        const node = d.data.data;
        if (!node) return '';
        const leadTime = getLeadTimeDisplay(node);
        return `${leadTime}d`;
      });
    
    // Add buffer icon for buffered nodes
    nodeSelection.filter(d => d.data.data && d.data.data.hasBuffer)
      .each(function() {
        addBufferIcon(d3.select(this));
      });
    
    // Add independent ADU badge for nodes with independentADU > 0
    nodeSelection.filter(d => d.data.data && d.data.data.independentADU > 0)
      .each(function(d) {
        addIndependentADUBadge(d3.select(this), d.data.data);
      });
    
    // Add Customer Tolerance Gap alert badge for nodes with missingCustomerLeadTime > 0
    nodeSelection.filter(d => d.data.data && d.data.data.missingCustomerLeadTime > 0)
      .each(function(d) {
        addCustomerLeadTimeGapBadge(d3.select(this), d.data.data);
      });
    
    // Add node names (centered)
    nodeSelection.append('text')
      .attr('class', 'node-name')
      .attr('dy', '0.35em')
      .text(d => d.data.data ? d.data.data.name : '');
    
    // Apply view: either preserve current transform or auto-center
    if (preserveView && currentTransform) {
      // Restore previous zoom/pan state
      console.log('ðŸ“ Preserving view - restoring transform:', currentTransform);
      svg.call(zoom.transform, currentTransform);
    } else {
      // Auto-center the view (initial load or reset)
      console.log('ðŸŽ¯ Auto-centering view');
      const bounds = g.node().getBBox();
      const fullWidth = svg.node().clientWidth;
      const fullHeight = svg.node().clientHeight;
      const scale = 0.9 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
      const translate = [
        fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
        fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
      ];
      
      const newTransform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);
      
      svg.call(zoom.transform, newTransform);
      currentTransform = newTransform; // Store the new transform
    }
  }
  
  // Update appearance of a specific node (e.g., after buffer status change)
  function updateNodeAppearance(nodeId) {
    const currentNetwork = window.currentNetwork;
    if (!currentNetwork || !currentNetwork.nodes) {
      console.error('No network loaded for update');
      return;
    }
    
    const node = currentNetwork.nodes.get ? currentNetwork.nodes.get(nodeId) : currentNetwork.nodes[nodeId];
    if (!node) {
      console.error('Node not found for update:', nodeId);
      return;
    }
    
    // Find the node group in the SVG
    const nodeGroup = g.selectAll('.node')
      .filter(d => d.data.id === nodeId);
    
    if (nodeGroup.empty()) {
      console.warn('Node group not found in visualization:', nodeId);
      return;
    }
    
    // Update node classes (add/remove 'buffered' and 'has-gap')
    const classes = ['node', node.type.replace('_', '-')];
    if (node.hasBuffer) classes.push('buffered');
    if (node.missingCustomerLeadTime && node.missingCustomerLeadTime > 0) classes.push('has-gap');
    nodeGroup.attr('class', classes.join(' '));
    
    // Remove existing buffer icon if present
    nodeGroup.select('.buffer-icon').remove();
    
    // Add buffer icon if node is now buffered
    if (node.hasBuffer) {
      addBufferIcon(nodeGroup);
    }
    
    // Remove existing ADU badge if present
    nodeGroup.select('.adu-badge').remove();
    
    // Add independent ADU badge if node has independentADU > 0
    if (node.independentADU > 0) {
      addIndependentADUBadge(nodeGroup, node);
    }
    
    // Remove existing alert badge if present
    nodeGroup.select('.alert-badge').remove();
    
    // Add Customer Tolerance Gap alert badge if missingCustomerLeadTime > 0
    if (node.missingCustomerLeadTime && node.missingCustomerLeadTime > 0) {
      addCustomerLeadTimeGapBadge(nodeGroup, node);
    }
    
    console.log(`âœ“ Updated visualization for ${node.name} (hasBuffer=${node.hasBuffer}, independentADU=${node.independentADU}, missingCustomerLeadTime=${node.missingCustomerLeadTime})`);
  }
  
  // Select node and trigger UI update
  function selectNode(nodeId) {
    console.log('ðŸ‘ï¸ selectNode called with:', nodeId);
    
    // Remove previous selection
    g.selectAll('.node').classed('selected', false);
    
    // Add selection to clicked node
    g.selectAll('.node')
      .filter(d => d.data.data && d.data.data.id === nodeId)
      .classed('selected', true);
    
    console.log('ðŸ‘ï¸ Checking for onNodeSelect handler...');
    console.log('ðŸ‘ï¸ window.DDOptim:', window.DDOptim);
    console.log('ðŸ‘ï¸ window.DDOptim.onNodeSelect:', window.DDOptim ? window.DDOptim.onNodeSelect : 'DDOptim undefined');
    
    // CRITICAL FIX: Use correct case - DDOptim (capital O)
    if (window.DDOptim && window.DDOptim.onNodeSelect) {
      console.log('ðŸ‘ï¸ Calling onNodeSelect handler...');
      window.DDOptim.onNodeSelect(nodeId);
    } else {
      console.error('âŒ onNodeSelect handler not found! window.DDOptim:', window.DDOptim);
    }
  }
  
  return {
    init,
    render,
    selectNode,
    updateNodeAppearance
  };
})();

// CRITICAL: Expose to window for model selector
window.NetworkRenderer = NetworkRenderer;
console.log('âœ“ NetworkRenderer exposed to window');