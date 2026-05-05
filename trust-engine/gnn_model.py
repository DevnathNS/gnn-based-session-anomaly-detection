import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from torch_geometric.data import Data
import numpy as np

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

def graph_to_pyg(graph_dict):
    """
    Converts SessionGraph JSON format into a PyTorch Geometric Data object.
    """
    nodes = graph_dict.get('nodes', [])
    edges = graph_dict.get('edges', [])
    
    if not nodes:
        # Return empty data structure with 5 dimensions
        return Data(x=torch.zeros((0, 5), dtype=torch.float), edge_index=torch.zeros((2, 0), dtype=torch.long))

    max_access = max([n.get('accessCount', 1) for n in nodes]) or 1

    x_features = []
    # Node features: [sensitivity, accessCount_norm, timeSinceLastAccess_min, isSensitive, method]
    for n in nodes:
        sens = n.get('sensitivity', 0)
        acc_cnt = n.get('accessCount', 0) / max_access
        time_min = min(n.get('timeSinceLastAccess', 0) / 60000.0, 1440.0) # clamped to 24h
        is_sens = 1 if sens >= 2 else 0
        method = METHOD_MAP.get(n.get('method', 'GET'), 0)
        x_features.append([sens, acc_cnt, time_min, is_sens, method])
        
    x = torch.tensor(x_features, dtype=torch.float)

    edge_list = []
    for e in edges:
        source = e.get('source')
        target = e.get('target')
        # In a real scenario we need to map source/target string IDs to node indices
        # Assuming source and target are indices for this stub
        if isinstance(source, int) and isinstance(target, int):
            edge_list.append([source, target])
            
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
