import geoip
import torch
import redis
import json
import hashlib
import time
from fastapi import FastAPI
from pydantic import BaseModel
from scorer import calculate_score
from typing import Dict, Any, Optional
from gnn_model import extract_graph_features, GraphSAGE, graph_to_pyg

app = FastAPI(title="Trust Engine")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"[INIT] Loading GraphSAGE model on {device}...")
model= GraphSAGE(in_channels=4,hidden_1=64,hidden_2=32,out_channels=16).to(device)
try:
	model.load_state_dict(torch.load('graphsage_model_best.pth',map_location=device))
	model.eval()
	print(f"[INIT] Model weights loaded successfully")
except Exception as e:
	print(f"Failed to load model weights: {e}")
r= redis.Redis(host='localhost',port=6379, db=0, decode_responses=True)

class Signals(BaseModel):
    ip: str = ""
    previous_ip: str = ""
    previous_location: Optional[dict] = None
    previous_ts: Optional[int] = None
    ip_changed: bool = False
    session_id:str
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
def gnn_score(session_id: str, graph: Dict[str, Any]):
    nodes = graph.get('nodes',[])
    if not nodes:		#Brand new session
    	return {'gnn_score':100, 'p_anomaly':0.0}
    graph_json=json.dumps(graph,sort_keys=True)
    graph_hash=hashlib.md5(graph_json.encode()).hexdigest()
    
    cache_key_hash= f"session:{session_id}:graph_hash"
    cache_key_score=f"session:{session_id}:gnn_cache"
    
    cached_hash= r.get(cache_key_hash)
    if cached_hash == graph_hash:
    	cached_score= r.get(cache_key_score)
    	if cached_score:
    		return {'gnn_score':float(cached_score),'p_anomaly':1.0-(float(cached_score)/100.0),'cached':True}
    
    data=graph_to_pyg(graph).to(device)
    with torch.no_grad():
    	p_anomaly=model(data.x,data.edge_index).item()
    	
    score= 100 * (1.0-p_anomaly)
    r.set(cache_key_hash,graph_hash,ex=3600)
    r.set(cache_key_score,str(score),ex=3600)
    return {'gnn_score':score, 'p_anomaly':p_anomaly,'cached':False}
    
   
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
	start_time=time.time()
	try:
		geo_signals = geoip.get_geo_signals(signals.ip, signals.previous_ip, signals.previous_location, signals.previous_ts)
		
		signals_dict = signals.model_dump()
		signals_dict.update(geo_signals)

		rule_score = calculate_score(signals_dict)

		gnn_result = gnn_score(signals.session_id,signals.graph or {'nodes': [], 'edges': []})
		gnn_s = gnn_result['gnn_score']    

		final = round(0.6 * rule_score + 0.4 * gnn_s)  
		latency_ms= (time.time()-start_time)*1000
		if latency_ms > 250:
			print(f"[PERF] Slow scoring detected: {latency_ms:.2f}ms for session {signals.session_id}")
		else:
			print(f"[PERF] Scoring complete: {latency_ms:.2f}ms")
            		
		print(f"DEBUG SCORE: {signals_dict} => rule_score: {rule_score}, gnn_score: {gnn_s}, final: {final}")
		
		return {
		    'final_score': max(0, min(100, final)),
		    'rule_score': rule_score,
		    'gnn_score': gnn_s,
		    'current_location': geo_signals.get('current_location'),
		    'cached': gnn_result.get('cached',False),
		    'latency_ms': round(latency_ms,2)
		}
	except Exception as e:
		print(f"[SYSTEM ERROR] Scoring failed: {str(e)}")
		return {'final_score': 15, 'error': 'Evaluation failed'}
