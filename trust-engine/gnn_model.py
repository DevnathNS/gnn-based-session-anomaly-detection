import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from torch_geometric.data import Data
import numpy as np
from typing import Dict, Any, List

# HTTP Method mapping
METHOD_MAP = {'GET': 0, 'POST': 1, 'PUT': 2, 'DELETE': 3}

class GraphSAGE(torch.nn.Module):
    def __init__(self, in_channels=5, hidden_1=64, hidden_2=32, out_channels=16):
        super(GraphSAGE, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_1)
        self.conv2 = SAGEConv(hidden_1, hidden_2)
        self.conv3 = SAGEConv(hidden_2, out_channels)
        self.classifier = torch.nn.Linear(out_channels, 1)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        
        # Pool graph level representations (e.g. mean pool)
        # Simplified for now (e.g., using mean of node embeddings)
        x = torch.mean(x, dim=0)
        
        out = self.classifier(x)
        return torch.sigmoid(out)

def extract_node_features(node: Dict[str, Any]) -> List[float]:
    """
    Extract node-level features from a session graph node.
    Returns: [sensitivity, accessCount, timeSinceLastAccess_min, isSensitive]
    """
    sensitivity = node.get('sensitivity', 0)
    access_count = node.get('accessCount', 0)
    time_since = min(node.get('timeSinceLastAccess', 0) / 60000.0, 1440.0)  # clamped to 24h in minutes
    is_sensitive = 1.0 if sensitivity >= 2 else 0.0
    
    return [float(sensitivity), float(access_count), float(time_since), float(is_sensitive)]

def extract_edge_features(edge: Dict[str, Any]) -> List[float]:
    """
    Extract edge-level features from a session graph edge.
    Returns: [timeDelta_sec, method_encoded, is_sensitive_transition]
    """
    time_delta = edge.get('timeDelta', 0) / 1000.0  # convert ms to seconds
    method = float(METHOD_MAP.get(edge.get('method', 'GET'), 0))
    is_sensitive = 1.0 if edge.get('method') in ['POST', 'PUT', 'DELETE'] else 0.0
    
    return [float(time_delta), float(method), float(is_sensitive)]

def normalize_features(features: List[List[float]]) -> List[List[float]]:
    """
    Normalize feature vectors to 0-1 range using min-max scaling.
    Handles empty or single-value features gracefully.
    """
    if not features:
        return []
    
    features_array = np.array(features)
    num_features = features_array.shape[1]
    normalized = np.zeros_like(features_array, dtype=float)
    
    for i in range(num_features):
        col = features_array[:, i]
        col_min = np.min(col)
        col_max = np.max(col)
        
        if col_max - col_min > 0:
            normalized[:, i] = (col - col_min) / (col_max - col_min)
        else:
            # If all values are the same, set to 0.5 (middle)
            normalized[:, i] = 0.5
    
    return normalized.tolist()

def extract_graph_features(graph_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract all features from a session graph.
    Returns: {
        'node_features': list of normalized node features,
        'edge_features': list of normalized edge features,
        'num_nodes': int,
        'num_edges': int,
        'avg_sensitivity': float,
        'avg_access_count': float
    }
    """
    nodes = graph_dict.get('nodes', [])
    edges = graph_dict.get('edges', [])
    
    # Extract node features
    node_features = [extract_node_features(n) for n in nodes]
    normalized_node_features = normalize_features(node_features) if node_features else []
    
    # Extract edge features
    edge_features = [extract_edge_features(e) for e in edges]
    normalized_edge_features = normalize_features(edge_features) if edge_features else []
    
    # Calculate summary statistics
    avg_sensitivity = np.mean([n.get('sensitivity', 0) for n in nodes]) if nodes else 0.0
    avg_access_count = np.mean([n.get('accessCount', 0) for n in nodes]) if nodes else 0.0
    
    return {
        'node_features': normalized_node_features,
        'edge_features': normalized_edge_features,
        'num_nodes': len(nodes),
        'num_edges': len(edges),
        'avg_sensitivity': float(avg_sensitivity),
        'avg_access_count': float(avg_access_count)
    }

def graph_to_pyg(graph_dict):
    """
    Converts SessionGraph JSON format into a PyTorch Geometric Data object.
    """
    nodes = graph_dict.get('nodes', [])
    edges = graph_dict.get('edges', [])
    
    if not nodes:
        # Return empty data structure with 4 dimensions
        return Data(x=torch.zeros((0, 4), dtype=torch.float), edge_index=torch.zeros((2, 0), dtype=torch.long))

    x_features = [extract_node_features(n) for n in nodes]
    x = torch.tensor(x_features, dtype=torch.float)

    # Build edge index with node ID to index mapping
    node_ids = [n.get('id') for n in nodes]
    node_id_to_idx = {nid: idx for idx, nid in enumerate(node_ids)}
    
    edge_list = []
    for e in edges:
        source = e.get('from')
        target = e.get('to')
        
        # Map string IDs to indices
        if source in node_id_to_idx and target in node_id_to_idx:
            edge_list.append([node_id_to_idx[source], node_id_to_idx[target]])
            
    if not edge_list:
        edge_index = torch.zeros((2, 0), dtype=torch.long)
    else:
        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()

    return Data(x=x, edge_index=edge_index)

def train():
    """
    Stub for Week 6: Load benign/attack graphs from DB, split, train to >90%.
    """
    print("Training GraphSAGE model...")
    # 1. Load data
    # 2. Split 70/15/15
    # 3. Train loop
    # 4. Save model state dict
    pass

def infer(graph_dict):
    """
    Loads saved model weights and returns anomaly_probability.
    """
    pyg_data = graph_to_pyg(graph_dict)
    
    if pyg_data.x.size(0) == 0:
        return 0.0 # Safe default
        
    model = GraphSAGE()
    # In Week 6: model.load_state_dict(torch.load('gnn_weights.pth'))
    model.eval()
    
    with torch.no_grad():
        anomaly_prob = model(pyg_data.x, pyg_data.edge_index).item()
        
    return anomaly_prob
