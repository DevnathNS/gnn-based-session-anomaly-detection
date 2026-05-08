from fastapi import FastAPI
from pydantic import BaseModel
from scorer import calculate_score
from typing import Dict, Any, Optional
import geoip
from gnn_model import extract_graph_features

app = FastAPI(title="Trust Engine")

class Signals(BaseModel):
    ip: str = ""
    previous_ip: str = ""
    previous_location: Optional[dict] = None
    previous_ts: Optional[int] = None
    ip_changed: bool = False
    geo_distance: int = 0
    impossible_travel: bool = False
    device_changed: bool = False
    requests_per_minute: int = 0
    is_after_hours: bool = False
    successful_step_up: bool = False
    consistent_24hrs: bool = False
    current_score: int = 90
    graph: Optional[dict] = None

@app.post('/gnn_score')
def gnn_score(graph: Dict[str, Any]):
    # STUB — replace with real inference in Week 6
    # Real implementation loads GraphSAGE from gnn_model.py
    return {'gnn_score': 85, 'anomaly_probability': 0.15}

@app.post('/extract_features')
def extract_features(graph: Dict[str, Any]):
    """
    Extract features from a session graph for GNN input preparation.
    
    Request: {
        'nodes': [...],
        'edges': [...]
    }
    
    Response: {
        'node_features': [[...], [...], ...],
        'edge_features': [[...], [...], ...],
        'num_nodes': int,
        'num_edges': int,
        'avg_sensitivity': float,
        'avg_access_count': float
    }
    """
    try:
        features = extract_graph_features(graph)
        return {
            'success': True,
            'features': features
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'features': None
        }

@app.post("/calculate_score")
def score(signals: Signals):
    geo_signals = geoip.get_geo_signals(signals.ip, signals.previous_ip, signals.previous_location, signals.previous_ts)
    
    signals_dict = signals.model_dump()
    signals_dict.update(geo_signals)

    rule_score = calculate_score(signals_dict)
    
    # Call GNN (replace with direct function call in Week 6)
    # For now: stub returns 85
    gnn_result = gnn_score(signals.graph or {'nodes': [], 'edges': []})
    gnn_s = gnn_result['gnn_score']
    
    final = rule_score  # use rule-only until GNN is trained
    # final = round(0.4 * rule_score + 0.6 * gnn_s)  # re-enable later
    
    print(f"DEBUG SCORE: {signals_dict} => rule_score: {rule_score}, final: {final}")
    
    return {
        'final_score': max(0, min(100, final)),
        'rule_score': rule_score,
        'gnn_score': gnn_s,
        'current_location': geo_signals.get('current_location')
    }
