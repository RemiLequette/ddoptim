"""
Network Visualization Tool for DDoptim

Interactive web-based visualization of supply chain networks with:
- Tree/hierarchical graph layout
- Color-coded nodes by type
- Zoom and pan capabilities
- Mini-map overview
- Node selection with editable side panel
- Load/Save functionality

Run with: python visualization/network_viewer.py
"""

import json
import os
import sys
from typing import Optional, Dict, List, Tuple

# Add project to path
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_dir)

import dash
from dash import dcc, html, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import networkx as nx

from core import Network, NetworkNode, NodeType, BufferStatus


# Color scheme for node types (inspired by case study presentation)
NODE_TYPE_COLORS = {
    NodeType.FINISHED_PRODUCT: '#4A90E2',      # Blue
    NodeType.INTERMEDIATE: '#7ED321',          # Green
    NodeType.MACHINED: '#F5A623',              # Orange
    NodeType.PURCHASED_LOCAL: '#D0021B',       # Red
    NodeType.PURCHASED_INTERNATIONAL: '#BD10E0'  # Purple
}

# Buffer status colors (for border)
BUFFER_STATUS_COLORS = {
    BufferStatus.NO_BUFFER: '#CCCCCC',              # Gray
    BufferStatus.USER_FIXED: '#00CC00',             # Green
    BufferStatus.USER_FORBIDDEN: '#CC0000',         # Red
    BufferStatus.ALGORITHM_RECOMMENDED: '#0066CC'   # Blue
}


class NetworkVisualizer:
    """Interactive network visualization tool."""

    # Default network file to load on startup
    DEFAULT_NETWORK_FILE = 'data/weber_pignons_network.json'

    def __init__(self):
        """Initialize the visualizer."""
        self.network: Optional[Network] = None
        self.selected_node_id: Optional[str] = None
        self.current_file: Optional[str] = None
        self.initial_network_data: Optional[dict] = None

        # Load default network on startup
        self._load_default_network()

        # Create Dash app with Bootstrap theme
        self.app = dash.Dash(
            __name__,
            external_stylesheets=[dbc.themes.BOOTSTRAP]
        )
        self.app.title = "DDoptim Network Viewer"

        self._build_layout()
        self._setup_callbacks()

    def _load_default_network(self):
        """Load the default network file on startup."""
        try:
            full_path = os.path.join(project_dir, self.DEFAULT_NETWORK_FILE)
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validate by loading into Network
            network = Network.from_dict(data)
            is_valid, errors = network.validate()

            if is_valid:
                self.network = network
                self.current_file = self.DEFAULT_NETWORK_FILE
                self.initial_network_data = data
                print(f"Loaded default network: {self.DEFAULT_NETWORK_FILE}")
            else:
                print(f"Validation errors in default network: {errors}")
        except Exception as e:
            print(f"Could not load default network: {e}")
    
    # Node rectangle dimensions
    NODE_WIDTH = 1.8
    NODE_HEIGHT = 0.9
    # Lead time circle dimensions
    LT_CIRCLE_RADIUS = 0.22

    def _calculate_hierarchical_layout(self) -> Dict[str, Tuple[float, float]]:
        """
        Calculate hierarchical tree layout for the network.
        Top-down layout with finished products at top, components below.
        Children are grouped under their parents to minimize edge crossings.

        Returns:
            Dictionary mapping node_id to (x, y) coordinates (center of node)
        """
        if not self.network:
            return {}

        pos = {}

        try:
            # Get topological order (finished products first)
            topo_order = self.network.get_topological_order()

            # Assign levels based on longest path from finished products
            # Level 0 = finished products (top), higher levels = deeper in BOM
            levels = {}
            for node_id in topo_order:
                parents = self.network.get_parents(node_id)
                if not parents:
                    levels[node_id] = 0  # Root node (finished product)
                else:
                    levels[node_id] = max(levels[parent_id] for parent_id in parents) + 1

            # Group nodes by level
            nodes_by_level = {}
            for node_id, level in levels.items():
                if level not in nodes_by_level:
                    nodes_by_level[level] = []
                nodes_by_level[level].append(node_id)

            max_level = max(levels.values()) if levels else 0
            y_spacing = 2.0  # Vertical spacing between levels
            x_gap = 0.5  # Horizontal gap between nodes

            # Calculate subtree widths (bottom-up)
            subtree_width = {}
            for level in range(max_level, -1, -1):
                if level not in nodes_by_level:
                    continue
                for node_id in nodes_by_level[level]:
                    children = list(self.network.get_children(node_id).keys())
                    if not children:
                        # Leaf node
                        subtree_width[node_id] = self.NODE_WIDTH
                    else:
                        # Width is sum of children's subtrees + gaps
                        children_width = sum(subtree_width.get(c, self.NODE_WIDTH) for c in children)
                        children_width += (len(children) - 1) * x_gap
                        subtree_width[node_id] = max(self.NODE_WIDTH, children_width)

            # Order nodes at each level to group children under parents
            ordered_by_level = {0: list(nodes_by_level.get(0, []))}

            for level in range(1, max_level + 1):
                if level not in nodes_by_level:
                    continue

                # Group children by their primary parent (first parent in sorted order)
                parent_children = {}
                for node_id in nodes_by_level[level]:
                    parents = sorted(self.network.get_parents(node_id).keys())
                    primary_parent = parents[0] if parents else None
                    if primary_parent not in parent_children:
                        parent_children[primary_parent] = []
                    parent_children[primary_parent].append(node_id)

                # Order children following parent order from previous level
                ordered_nodes = []
                prev_level_order = ordered_by_level.get(level - 1, [])
                for parent_id in prev_level_order:
                    if parent_id in parent_children:
                        # Sort children alphabetically within each parent group
                        ordered_nodes.extend(sorted(parent_children[parent_id]))
                        del parent_children[parent_id]

                # Add any orphaned nodes (shouldn't happen but just in case)
                for remaining in parent_children.values():
                    ordered_nodes.extend(sorted(remaining))

                ordered_by_level[level] = ordered_nodes

            # Position nodes (top-down), centering children under parents
            x_positions = {}

            # First pass: assign initial x positions based on subtree width
            for level in range(max_level + 1):
                if level not in ordered_by_level:
                    continue

                nodes = ordered_by_level[level]
                if level == 0:
                    # Position root nodes
                    current_x = 0
                    for node_id in nodes:
                        width = subtree_width.get(node_id, self.NODE_WIDTH)
                        x_positions[node_id] = current_x + width / 2
                        current_x += width + x_gap
                    # Center the roots
                    total_width = current_x - x_gap
                    offset = total_width / 2
                    for node_id in nodes:
                        x_positions[node_id] -= offset
                else:
                    # Position children centered under their parents
                    # Group by primary parent
                    parent_children = {}
                    for node_id in nodes:
                        parents = sorted(self.network.get_parents(node_id).keys())
                        primary_parent = parents[0] if parents else None
                        if primary_parent not in parent_children:
                            parent_children[primary_parent] = []
                        parent_children[primary_parent].append(node_id)

                    for parent_id, children in parent_children.items():
                        if parent_id is None:
                            continue
                        parent_x = x_positions.get(parent_id, 0)
                        # Calculate total width of children
                        total_children_width = sum(subtree_width.get(c, self.NODE_WIDTH) for c in children)
                        total_children_width += (len(children) - 1) * x_gap
                        # Center children under parent
                        start_x = parent_x - total_children_width / 2
                        for child_id in children:
                            child_width = subtree_width.get(child_id, self.NODE_WIDTH)
                            x_positions[child_id] = start_x + child_width / 2
                            start_x += child_width + x_gap

            # Second pass: resolve overlaps within each level
            for level in range(max_level + 1):
                if level not in ordered_by_level:
                    continue
                nodes = ordered_by_level[level]
                if len(nodes) <= 1:
                    continue

                # Sort by x position
                nodes_sorted = sorted(nodes, key=lambda n: x_positions.get(n, 0))
                min_gap = self.NODE_WIDTH + x_gap

                # Push nodes apart if they overlap
                for i in range(1, len(nodes_sorted)):
                    prev_node = nodes_sorted[i - 1]
                    curr_node = nodes_sorted[i]
                    prev_x = x_positions[prev_node]
                    curr_x = x_positions[curr_node]
                    if curr_x - prev_x < min_gap:
                        x_positions[curr_node] = prev_x + min_gap

                # Re-center the level
                xs = [x_positions[n] for n in nodes]
                center = (min(xs) + max(xs)) / 2
                for node_id in nodes:
                    x_positions[node_id] -= center

            # Build final positions
            for node_id, level in levels.items():
                y = (max_level - level) * y_spacing
                x = x_positions.get(node_id, 0)
                pos[node_id] = (x, y)

        except Exception as e:
            print(f"Error calculating layout: {e}")
            # Fallback to spring layout
            pos = nx.spring_layout(self.network.graph, k=2, iterations=50)
            pos = {node_id: (coords[0] * 10, coords[1] * 10) for node_id, coords in pos.items()}

        return pos
    
    def _create_orthogonal_edge(self, x0: float, y0: float, x1: float, y1: float) -> Tuple[List[float], List[float]]:
        """
        Create orthogonal (vertical-horizontal-vertical) edge path.

        Args:
            x0, y0: Start point (parent node center)
            x1, y1: End point (child node center)

        Returns:
            Tuple of (x_coords, y_coords) for the path
        """
        # Adjust start/end to edge of rectangles
        y0_bottom = y0 - self.NODE_HEIGHT / 2  # Bottom of parent
        y1_top = y1 + self.NODE_HEIGHT / 2      # Top of child

        # Midpoint for horizontal segment
        y_mid = (y0_bottom + y1_top) / 2

        # Path: down from parent, horizontal, down to child
        x_coords = [x0, x0, x1, x1]
        y_coords = [y0_bottom, y_mid, y_mid, y1_top]

        return x_coords, y_coords

    def _create_network_figure(self, highlight_node: Optional[str] = None, show_lead_times: bool = True) -> go.Figure:
        """
        Create Plotly figure for the network with rectangular nodes
        and orthogonal edges.

        Args:
            highlight_node: Node ID to highlight (if any)
            show_lead_times: Whether to show lead time circles on nodes

        Returns:
            Plotly figure
        """
        if not self.network:
            # Empty figure
            fig = go.Figure()
            fig.add_annotation(
                text="No network loaded. Use 'Load Network' to open a file.",
                xref="paper", yref="paper",
                x=0.5, y=0.5, showarrow=False,
                font=dict(size=16)
            )
            fig.update_layout(
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                plot_bgcolor='white'
            )
            return fig

        # Calculate layout
        pos = self._calculate_hierarchical_layout()

        # Create figure
        fig = go.Figure()

        # Add orthogonal edges (BOM relationships)
        for parent_id, child_id, data in self.network.graph.edges(data=True):
            if parent_id not in pos or child_id not in pos:
                continue

            x0, y0 = pos[parent_id]
            x1, y1 = pos[child_id]

            # Create orthogonal path
            x_coords, y_coords = self._create_orthogonal_edge(x0, y0, x1, y1)

            edge_trace = go.Scatter(
                x=x_coords,
                y=y_coords,
                mode='lines',
                line=dict(width=1.5, color='#666'),
                hoverinfo='text',
                text=f"Qty: {data['quantity']}",
                showlegend=False
            )
            fig.add_trace(edge_trace)

        # Add rectangular nodes as shapes and invisible scatter points for interaction
        shapes = []
        annotations = []
        node_x = []
        node_y = []
        node_text = []
        node_ids = []
        node_labels = []

        for node in self.network.get_all_nodes():
            if node.node_id not in pos:
                continue

            x, y = pos[node.node_id]
            node_x.append(x)
            node_y.append(y)
            node_ids.append(node.node_id)
            # Split node name at first space for two-line display
            name_parts = node.name.split(' ', 1)
            if len(name_parts) > 1:
                label = f"<b>{name_parts[0]}<br>{name_parts[1]}</b>"
            else:
                label = f"<b>{node.name}</b>"
            node_labels.append(label)

            # Hover text
            hover_text = (
                f"<b>{node.name}</b><br>"
                f"ID: {node.node_id}<br>"
                f"Type: {node.node_type.value}<br>"
                f"Lead Time: {node.lead_time} days<br>"
                f"Profile: {node.buffer_profile_name}<br>"
                f"Buffer: {node.buffer_status.value}"
            )
            if node.is_finished_product():
                hover_text += f"<br>Customer Tolerance: {node.customer_tolerance_time} days"
            if node.adu is not None:
                hover_text += f"<br>ADU: {node.adu:.1f}"
            node_text.append(hover_text)

            # Rectangle dimensions
            half_w = self.NODE_WIDTH / 2
            half_h = self.NODE_HEIGHT / 2

            # Border width based on selection
            border_width = 3 if node.node_id == highlight_node else 1.5

            # Add rectangle shape
            shapes.append(dict(
                type="rect",
                x0=x - half_w,
                y0=y - half_h,
                x1=x + half_w,
                y1=y + half_h,
                fillcolor=NODE_TYPE_COLORS[node.node_type],
                line=dict(
                    color=BUFFER_STATUS_COLORS[node.buffer_status],
                    width=border_width
                ),
                layer="below"
            ))

            # Add lead time circle outside rectangle, touching top-left corner
            if show_lead_times:
                # Position circle center at the top-left corner of the rectangle
                lt_x = x - half_w
                lt_y = y + half_h
                shapes.append(dict(
                    type="circle",
                    x0=lt_x - self.LT_CIRCLE_RADIUS,
                    y0=lt_y - self.LT_CIRCLE_RADIUS,
                    x1=lt_x + self.LT_CIRCLE_RADIUS,
                    y1=lt_y + self.LT_CIRCLE_RADIUS,
                    fillcolor='white',
                    line=dict(color='#333', width=2),
                    layer="above"
                ))
                # Add lead time text annotation (bold)
                annotations.append(dict(
                    x=lt_x,
                    y=lt_y,
                    text=f"<b>{node.lead_time}</b>",
                    showarrow=False,
                    font=dict(size=16, color='#333'),
                    xanchor='center',
                    yanchor='middle'
                ))

        # Add invisible scatter for click detection and hover
        node_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode='markers+text',
            text=node_labels,
            textposition='middle center',
            textfont=dict(size=18, color='white'),
            hovertext=node_text,
            hoverinfo='text',
            marker=dict(
                size=1,
                opacity=0
            ),
            showlegend=False,
            customdata=node_ids
        )
        fig.add_trace(node_trace)

        # Add legend traces (invisible markers for legend only)
        for node_type in NodeType:
            fig.add_trace(go.Scatter(
                x=[None],
                y=[None],
                mode='markers',
                marker=dict(
                    size=15,
                    color=NODE_TYPE_COLORS[node_type],
                    symbol='square'
                ),
                name=node_type.value.replace('_', ' ').title(),
                showlegend=True
            ))

        # Calculate axis ranges
        if pos:
            all_x = [p[0] for p in pos.values()]
            all_y = [p[1] for p in pos.values()]
            x_margin = self.NODE_WIDTH
            y_margin = self.NODE_HEIGHT
            x_range = [min(all_x) - x_margin, max(all_x) + x_margin]
            y_range = [min(all_y) - y_margin, max(all_y) + y_margin]
        else:
            x_range = [-5, 5]
            y_range = [-5, 5]

        # Update layout
        fig.update_layout(
            title=dict(
                text=f"Supply Chain Network: {len(self.network)} nodes",
                font=dict(size=16)
            ),
            shapes=shapes,
            annotations=annotations,
            showlegend=True,
            legend=dict(
                orientation="v",
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.02
            ),
            hovermode='closest',
            margin=dict(b=20, l=5, r=150, t=40),
            xaxis=dict(
                showgrid=False,
                zeroline=False,
                showticklabels=False,
                range=x_range,
                scaleanchor="y",
                scaleratio=1
            ),
            yaxis=dict(
                showgrid=False,
                zeroline=False,
                showticklabels=False,
                range=y_range
            ),
            plot_bgcolor='white',
            height=700,
            uirevision='network',  # Preserve zoom/pan state across updates
            dragmode='pan'  # Default to pan mode, click to select nodes
        )

        return fig
    
    def _build_layout(self):
        """Build the Dash app layout."""
        
        self.app.layout = dbc.Container([
            dcc.Store(id='network-data', data=self.initial_network_data),
            dcc.Store(id='selected-node-id', data=None),
            dcc.Store(id='current-file', data=self.current_file),
            dcc.Store(id='show-lead-times', data=True),
            
            # Header
            dbc.Row([
                dbc.Col([
                    html.H1("DDoptim Network Viewer", className="text-primary"),
                    html.P("Interactive Supply Chain Network Visualization", className="text-muted")
                ], width=6),
                dbc.Col([
                    html.Div([
                        dbc.Label("Show Lead Times", className="me-2", style={'font-size': '14px'}),
                        dbc.Switch(
                            id='toggle-lead-times',
                            value=True,
                            className="d-inline-block"
                        )
                    ], className="d-flex align-items-center justify-content-end mt-3")
                ], width=2),
                dbc.Col([
                    dbc.ButtonGroup([
                        dbc.Button("Load Network", id="btn-load", color="primary", className="me-2"),
                        dbc.Button("Save Network", id="btn-save", color="success"),
                    ], className="float-end")
                ], width=4)
            ], className="mb-3"),
            
            html.Hr(),
            
            # Main content
            dbc.Row([
                # Left panel - Network visualization
                dbc.Col([
                    dcc.Loading(
                        id="loading-graph",
                        type="default",
                        children=[
                            dcc.Graph(
                                id='network-graph',
                                style={'height': '700px'},
                                config={
                                    'displayModeBar': True,
                                    'displaylogo': False,
                                    'modeBarButtonsToRemove': ['select2d', 'lasso2d', 'autoScale2d'],
                                    'modeBarButtonsToAdd': ['pan2d', 'zoomIn2d', 'zoomOut2d', 'resetScale2d']
                                }
                            )
                        ]
                    )
                ], width=8),
                
                # Right panel - Node details
                dbc.Col([
                    html.Div(id='node-detail-panel', children=[
                        dbc.Card([
                            dbc.CardHeader(html.H5("Node Details")),
                            dbc.CardBody([
                                html.P("Select a node to view and edit its properties.", 
                                      className="text-muted text-center")
                            ])
                        ])
                    ])
                ], width=4)
            ]),
            
            # Modals
            dbc.Modal([
                dbc.ModalHeader(dbc.ModalTitle("Load Network")),
                dbc.ModalBody([
                    dbc.Label("Select network file:"),
                    dcc.Input(
                        id='input-load-file',
                        type='text',
                        placeholder='data/weber_pignons_network.json',
                        value='data/weber_pignons_network.json',
                        style={'width': '100%'}
                    ),
                    html.Div(id='load-error', className="text-danger mt-2")
                ]),
                dbc.ModalFooter([
                    dbc.Button("Cancel", id="btn-load-cancel", className="me-2"),
                    dbc.Button("Load", id="btn-load-confirm", color="primary")
                ])
            ], id="modal-load", is_open=False),
            
            dbc.Modal([
                dbc.ModalHeader(dbc.ModalTitle("Save Network")),
                dbc.ModalBody([
                    dbc.Label("Save to file:"),
                    dcc.Input(
                        id='input-save-file',
                        type='text',
                        placeholder='data/my_network.json',
                        style={'width': '100%'}
                    ),
                    html.Div(id='save-status', className="mt-2")
                ]),
                dbc.ModalFooter([
                    dbc.Button("Cancel", id="btn-save-cancel", className="me-2"),
                    dbc.Button("Save", id="btn-save-confirm", color="success")
                ])
            ], id="modal-save", is_open=False),
            
            # Legend
            dbc.Row([
                dbc.Col([
                    html.Hr(),
                    html.H6("Legend", className="text-muted"),
                    dbc.Row([
                        dbc.Col([
                            html.H6("Node Types:", style={'font-size': '14px'}),
                            html.Div([
                                html.Span("\u25A0 ", style={'color': NODE_TYPE_COLORS[NodeType.FINISHED_PRODUCT], 'font-size': '16px'}),
                                html.Span("Finished Product", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A0 ", style={'color': NODE_TYPE_COLORS[NodeType.INTERMEDIATE], 'font-size': '16px'}),
                                html.Span("Intermediate", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A0 ", style={'color': NODE_TYPE_COLORS[NodeType.MACHINED], 'font-size': '16px'}),
                                html.Span("Machined", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A0 ", style={'color': NODE_TYPE_COLORS[NodeType.PURCHASED_LOCAL], 'font-size': '16px'}),
                                html.Span("Purchased Local", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A0 ", style={'color': NODE_TYPE_COLORS[NodeType.PURCHASED_INTERNATIONAL], 'font-size': '16px'}),
                                html.Span("Purchased International", style={'font-size': '12px'})
                            ])
                        ], width=6),
                        dbc.Col([
                            html.H6("Buffer Status (Border):", style={'font-size': '14px'}),
                            html.Div([
                                html.Span("\u25A1 ", style={'color': BUFFER_STATUS_COLORS[BufferStatus.NO_BUFFER], 'font-size': '16px'}),
                                html.Span("No Buffer", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A1 ", style={'color': BUFFER_STATUS_COLORS[BufferStatus.USER_FIXED], 'font-size': '16px'}),
                                html.Span("User Fixed", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A1 ", style={'color': BUFFER_STATUS_COLORS[BufferStatus.USER_FORBIDDEN], 'font-size': '16px'}),
                                html.Span("User Forbidden", style={'font-size': '12px'})
                            ]),
                            html.Div([
                                html.Span("\u25A1 ", style={'color': BUFFER_STATUS_COLORS[BufferStatus.ALGORITHM_RECOMMENDED], 'font-size': '16px'}),
                                html.Span("Algorithm Recommended", style={'font-size': '12px'})
                            ])
                        ], width=6)
                    ])
                ])
            ], className="mt-3")
            
        ], fluid=True)
    
    def _setup_callbacks(self):
        """Setup Dash callbacks for interactivity."""
        
        # Modal controls
        @self.app.callback(
            Output("modal-load", "is_open"),
            [Input("btn-load", "n_clicks"),
             Input("btn-load-cancel", "n_clicks"),
             Input("btn-load-confirm", "n_clicks")],
            [State("modal-load", "is_open")]
        )
        def toggle_load_modal(n_open, n_cancel, n_confirm, is_open):
            ctx = callback_context
            if not ctx.triggered:
                return is_open
            button_id = ctx.triggered[0]["prop_id"].split(".")[0]
            if button_id in ["btn-load", "btn-load-cancel", "btn-load-confirm"]:
                return not is_open
            return is_open
        
        @self.app.callback(
            Output("modal-save", "is_open"),
            [Input("btn-save", "n_clicks"),
             Input("btn-save-cancel", "n_clicks"),
             Input("btn-save-confirm", "n_clicks")],
            [State("modal-save", "is_open")]
        )
        def toggle_save_modal(n_open, n_cancel, n_confirm, is_open):
            ctx = callback_context
            if not ctx.triggered:
                return is_open
            button_id = ctx.triggered[0]["prop_id"].split(".")[0]
            if button_id in ["btn-save", "btn-save-cancel", "btn-save-confirm"]:
                return not is_open
            return is_open
        
        # Load network
        @self.app.callback(
            [Output('network-data', 'data'),
             Output('current-file', 'data'),
             Output('load-error', 'children')],
            [Input('btn-load-confirm', 'n_clicks')],
            [State('input-load-file', 'value')]
        )
        def load_network(n_clicks, filepath):
            if not n_clicks:
                return None, None, ""
            
            try:
                # Load from file
                full_path = os.path.join(project_dir, filepath)
                with open(full_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Validate by loading into Network
                network = Network.from_dict(data)
                is_valid, errors = network.validate()
                
                if not is_valid:
                    error_msg = "Validation errors: " + "; ".join(errors)
                    return None, None, error_msg
                
                # Store network and update visualizer
                self.network = network
                self.current_file = filepath
                
                return data, filepath, ""
                
            except Exception as e:
                return None, None, f"Error loading network: {str(e)}"
        
        # Save network
        @self.app.callback(
            Output('save-status', 'children'),
            [Input('btn-save-confirm', 'n_clicks')],
            [State('input-save-file', 'value'),
             State('network-data', 'data')]
        )
        def save_network(n_clicks, filepath, network_data):
            if not n_clicks or not network_data:
                return ""
            
            try:
                full_path = os.path.join(project_dir, filepath)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                with open(full_path, 'w', encoding='utf-8') as f:
                    json.dump(network_data, f, indent=2, ensure_ascii=False)
                
                return html.Div("✓ Network saved successfully!", className="text-success")
                
            except Exception as e:
                return html.Div(f"✗ Error: {str(e)}", className="text-danger")
        
        # Update graph when network loads or toggle changes
        @self.app.callback(
            Output('network-graph', 'figure'),
            [Input('network-data', 'data'),
             Input('selected-node-id', 'data'),
             Input('toggle-lead-times', 'value')]
        )
        def update_graph(network_data, selected_node_id, show_lead_times):
            if network_data:
                self.network = Network.from_dict(network_data)

            main_fig = self._create_network_figure(
                highlight_node=selected_node_id,
                show_lead_times=show_lead_times if show_lead_times is not None else True
            )

            return main_fig
        
        # Handle node click
        @self.app.callback(
            [Output('selected-node-id', 'data'),
             Output('node-detail-panel', 'children')],
            [Input('network-graph', 'clickData')],
            [State('network-data', 'data')]
        )
        def handle_node_click(click_data, network_data):
            if not click_data or not network_data:
                return None, self._empty_detail_panel()
            
            # Get clicked node ID
            try:
                node_id = click_data['points'][0]['customdata']
                self.network = Network.from_dict(network_data)
                node = self.network.get_node(node_id)
                
                return node_id, self._create_detail_panel(node)
                
            except Exception as e:
                print(f"Error handling click: {e}")
                return None, self._empty_detail_panel()
    
    def _empty_detail_panel(self):
        """Create empty detail panel."""
        return dbc.Card([
            dbc.CardHeader(html.H5("Node Details")),
            dbc.CardBody([
                html.P("Select a node to view and edit its properties.", 
                      className="text-muted text-center")
            ])
        ])
    
    def _create_detail_panel(self, node: NetworkNode):
        """Create detail panel for selected node."""
        return dbc.Card([
            dbc.CardHeader([
                html.H5(node.name),
                html.P(f"ID: {node.node_id}", className="text-muted mb-0", style={'font-size': '12px'})
            ]),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label("Type:", style={'font-weight': 'bold', 'font-size': '12px'}),
                        html.P(node.node_type.value.replace('_', ' ').title(), style={'font-size': '12px'})
                    ], width=6),
                    dbc.Col([
                        dbc.Label("Profile:", style={'font-weight': 'bold', 'font-size': '12px'}),
                        html.P(node.buffer_profile_name, style={'font-size': '12px'})
                    ], width=6)
                ]),
                
                html.Hr(className="my-2"),
                
                dbc.Label("Lead Time:", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Input(
                    id={'type': 'node-field', 'field': 'lead_time'},
                    type='number',
                    value=node.lead_time,
                    style={'width': '100%', 'font-size': '12px'},
                    className="mb-2"
                ),
                
                dbc.Label("Unit Cost:", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Input(
                    id={'type': 'node-field', 'field': 'unit_cost'},
                    type='number',
                    value=node.unit_cost,
                    style={'width': '100%', 'font-size': '12px'},
                    className="mb-2"
                ),
                
                dbc.Label("MOQ:", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Input(
                    id={'type': 'node-field', 'field': 'moq'},
                    type='number',
                    value=node.moq,
                    style={'width': '100%', 'font-size': '12px'},
                    className="mb-2"
                ),
                
                dbc.Label("Order Cycle (days):", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Input(
                    id={'type': 'node-field', 'field': 'order_cycle'},
                    type='number',
                    value=node.order_cycle,
                    style={'width': '100%', 'font-size': '12px'},
                    className="mb-2"
                ),
                
                html.Hr(className="my-2"),
                
                dbc.Label("Buffer Status:", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Dropdown(
                    id={'type': 'node-field', 'field': 'buffer_status'},
                    options=[
                        {'label': 'No Buffer', 'value': 'no_buffer'},
                        {'label': 'User Fixed', 'value': 'user_fixed'},
                        {'label': 'User Forbidden', 'value': 'user_forbidden'},
                        {'label': 'Algorithm Recommended', 'value': 'algorithm_recommended'}
                    ],
                    value=node.buffer_status.value,
                    style={'font-size': '12px'},
                    className="mb-2"
                ),
                
                dbc.Label("Buffer Rationale:", style={'font-weight': 'bold', 'font-size': '12px'}),
                dcc.Textarea(
                    id={'type': 'node-field', 'field': 'buffer_rationale'},
                    value=node.buffer_rationale,
                    style={'width': '100%', 'height': '60px', 'font-size': '12px'},
                    className="mb-2"
                ),
                
                # Show ADU if available
                html.Div([
                    html.Hr(className="my-2"),
                    dbc.Label("ADU (Average Daily Usage):", style={'font-weight': 'bold', 'font-size': '12px'}),
                    html.P(f"{node.adu:.2f}" if node.adu is not None else "Not calculated", 
                          style={'font-size': '12px'})
                ]) if node.adu is not None or node.is_finished_product() else None,
                
                # Show customer tolerance for finished products
                html.Div([
                    dbc.Label("Customer Tolerance (days):", style={'font-weight': 'bold', 'font-size': '12px'}),
                    html.P(str(node.customer_tolerance_time), style={'font-size': '12px'})
                ]) if node.is_finished_product() else None,
                
                html.Hr(className="my-2"),
                
                # BOM relationships
                html.Div([
                    dbc.Label("Parents (uses this):", style={'font-weight': 'bold', 'font-size': '12px'}),
                    html.Ul([
                        html.Li(f"{self.network.get_node(parent_id).name}: {qty}x", 
                               style={'font-size': '11px'})
                        for parent_id, qty in self.network.get_parents(node.node_id).items()
                    ]) if self.network.get_parents(node.node_id) else html.P("None", style={'font-size': '11px', 'color': '#888'})
                ]),
                
                html.Div([
                    dbc.Label("Children (this uses):", style={'font-weight': 'bold', 'font-size': '12px'}),
                    html.Ul([
                        html.Li(f"{self.network.get_node(child_id).name}: {qty}x", 
                               style={'font-size': '11px'})
                        for child_id, qty in self.network.get_children(node.node_id).items()
                    ]) if self.network.get_children(node.node_id) else html.P("None", style={'font-size': '11px', 'color': '#888'})
                ])
            ])
        ])
    
    def run(self, debug=True, port=8050):
        """Run the visualization server."""
        print("=" * 60)
        print("DDoptim Network Viewer")
        print("=" * 60)
        print(f"\nStarting server on http://localhost:{port}")
        print("Open this URL in your web browser.")
        print("\nPress Ctrl+C to stop the server.")
        print("=" * 60 + "\n")
        
        self.app.run(debug=debug, port=port)


def main():
    """Main entry point."""
    visualizer = NetworkVisualizer()
    visualizer.run()


if __name__ == '__main__':
    main()
