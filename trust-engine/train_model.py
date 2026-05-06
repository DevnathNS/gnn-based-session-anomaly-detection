"""
Week 6: GNN Model Training
Train GraphSAGE to detect anomalous sessions
"""

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torch_geometric.nn import SAGEConv
from torch_geometric.data import Data
import json
import psycopg2
import numpy as np
from typing import List, Tuple
import os
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from datetime import datetime

# Database connection
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'trust_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"[TRAINING] Using device: {device}")

# ============================================================================
# MODEL DEFINITION
# ============================================================================

class GraphSAGE(torch.nn.Module):
    """
    3-layer GraphSAGE for session anomaly detection.
    Input: Graph with node features
    Output: Binary classification (0=benign, 1=attack)
    """
    def __init__(self, in_channels=4, hidden_1=64, hidden_2=32, out_channels=16):
        super(GraphSAGE, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_1)
        self.conv2 = SAGEConv(hidden_1, hidden_2)
        self.conv3 = SAGEConv(hidden_2, out_channels)
        self.classifier = torch.nn.Linear(out_channels, 1)

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        # Layer 3
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        
        # Global pooling (mean of all node embeddings)
        x = torch.mean(x, dim=0)
        
        # Classification
        x = self.classifier(x)
        return torch.sigmoid(x)

# ============================================================================
# DATA LOADING
# ============================================================================

def load_graphs_from_db() -> List[Tuple[Dict, int]]:
    """Load all graphs from database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("[DATA] Loading graphs from database...")
        
        cursor.execute("""
            SELECT nodes, edges, label FROM session_graphs
            ORDER BY created_at DESC
        """)
        
        rows = cursor.fetchall()
        graphs = []
        
        for nodes_json, edges_json, label in rows:
            graph = {
                'nodes': json.loads(nodes_json),
                'edges': json.loads(edges_json)
            }
            label_int = 1 if label == 'attack' else 0
            graphs.append((graph, label_int))
        
        cursor.close()
        conn.close()
        
        print(f"  ✓ Loaded {len(graphs)} graphs from database")
        return graphs
        
    except Exception as e:
        print(f"  ❌ Error loading graphs: {e}")
        return []

def extract_node_features(node: Dict) -> List[float]:
    """Extract features from node"""
    sensitivity = node.get('sensitivity', 0)
    access_count = node.get('accessCount', 0)
    time_since = min(node.get('timeSinceLastAccess', 0) / 60000.0, 1440.0)
    is_sensitive = 1.0 if sensitivity >= 2 else 0.0
    
    return [float(sensitivity), float(access_count), float(time_since), float(is_sensitive)]

def graph_to_pyg(graph: Dict, label: int) -> Data:
    """Convert session graph to PyTorch Geometric format"""
    nodes = graph.get('nodes', [])
    edges = graph.get('edges', [])
    
    if not nodes:
        # Empty graph
        data = Data(x=torch.zeros((1, 4), dtype=torch.float),
                   edge_index=torch.zeros((2, 0), dtype=torch.long),
                   y=torch.tensor([label], dtype=torch.float))
        return data
    
    # Extract node features
    node_features = [extract_node_features(n) for n in nodes]
    x = torch.tensor(node_features, dtype=torch.float)
    
    # Build edge index with ID mapping
    node_id_to_idx = {n.get('id'): i for i, n in enumerate(nodes)}
    
    edge_list = []
    for edge in edges:
        source = edge.get('from')
        target = edge.get('to')
        
        if source in node_id_to_idx and target in node_id_to_idx:
            edge_list.append([node_id_to_idx[source], node_id_to_idx[target]])
    
    if edge_list:
        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.zeros((2, 0), dtype=torch.long)
    
    data = Data(x=x, edge_index=edge_index, y=torch.tensor([label], dtype=torch.float))
    return data

# ============================================================================
# TRAINING
# ============================================================================

def train_epoch(model, train_data: List[Data], optimizer, criterion):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    
    for data in train_data:
        data = data.to(device)
        optimizer.zero_grad()
        
        output = model(data.x, data.edge_index)
        loss = criterion(output, data.y)
        
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(train_data) if train_data else 0

def evaluate(model, data_list: List[Data]) -> Tuple[float, float, float]:
    """Evaluate model on dataset"""
    model.eval()
    correct = 0
    total = 0
    
    with torch.no_grad():
        for data in data_list:
            data = data.to(device)
            output = model(data.x, data.edge_index)
            pred = 1 if output.item() > 0.5 else 0
            
            if pred == int(data.y.item()):
                correct += 1
            total += 1
    
    accuracy = correct / total if total > 0 else 0
    return accuracy

def get_predictions(model, data_list: List[Data]) -> Tuple[List[int], List[int]]:
    """Get predictions for calculating metrics"""
    model.eval()
    y_true = []
    y_pred = []
    
    with torch.no_grad():
        for data in data_list:
            data = data.to(device)
            output = model(data.x, data.edge_index)
            pred = 1 if output.item() > 0.5 else 0
            
            y_true.append(int(data.y.item()))
            y_pred.append(pred)
    
    return y_true, y_pred

def train_model(epochs: int = 100):
    """Main training function"""
    print("\n" + "="*70)
    print("🤖 TRAINING GRAPHSAGE MODEL")
    print("="*70)
    
    # Load data
    graph_data = load_graphs_from_db()
    if not graph_data:
        print("❌ No training data found!")
        return
    
    print(f"  Total graphs: {len(graph_data)}")
    
    # Convert to PyG format
    print("[DATA] Converting graphs to PyTorch Geometric format...")
    dataset = []
    for graph, label in graph_data:
        data = graph_to_pyg(graph, label)
        dataset.append(data)
    
    # Split: 70% train, 15% val, 15% test
    total = len(dataset)
    train_size = int(0.7 * total)
    val_size = int(0.15 * total)
    
    train_data = dataset[:train_size]
    val_data = dataset[train_size:train_size + val_size]
    test_data = dataset[train_size + val_size:]
    
    print(f"  Train: {len(train_data)} | Val: {len(val_data)} | Test: {len(test_data)}")
    
    # Count labels
    benign_count = sum(1 for d in dataset if d.y.item() == 0)
    attack_count = sum(1 for d in dataset if d.y.item() == 1)
    print(f"  Benign: {benign_count} | Attack: {attack_count}")
    
    # Create model
    model = GraphSAGE(in_channels=4, hidden_1=64, hidden_2=32, out_channels=16).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = torch.nn.BCELoss()
    
    print("\n[TRAINING] Starting training...")
    print("="*70)
    
    best_val_acc = 0
    patience = 10
    patience_counter = 0
    
    for epoch in range(epochs):
        train_loss = train_epoch(model, train_data, optimizer, criterion)
        val_acc = evaluate(model, val_data)
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            # Save best model
            torch.save(model.state_dict(), 'graphsage_model_best.pth')
        else:
            patience_counter += 1
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1:3d} | Loss: {train_loss:.4f} | Val Acc: {val_acc:.4f}")
        
        # Early stopping
        if patience_counter >= patience:
            print(f"Early stopping at epoch {epoch+1}")
            break
        
        # Stop if target accuracy reached
        if val_acc >= 0.90:
            print(f"Target accuracy 90% reached at epoch {epoch+1}!")
            torch.save(model.state_dict(), 'graphsage_model_best.pth')
            break
    
    print("="*70)
    
    # Test evaluation
    print("\n[EVALUATION] Testing on test set...")
    test_acc = evaluate(model, test_data)
    y_true, y_pred = get_predictions(model, test_data)
    
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    
    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"    True Negatives:  {tn}")
    print(f"    False Positives: {fp}")
    print(f"    False Negatives: {fn}")
    print(f"    True Positives:  {tp}")
    
    # Final model save
    torch.save(model.state_dict(), 'graphsage_model.pth')
    print(f"\n  ✅ Model saved to: graphsage_model.pth")
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE")
    print("="*70)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("="*70 + "\n")

if __name__ == "__main__":
    train_model(epochs=100)
