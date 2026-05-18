import React, { useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d'; 
import api from '../utils/api';

export default function GraphViewer() {
	const [graphData, setGraphData] = useState({nodes:[],links:[]});
	useEffect(() => {
		api.get('api/session/graph')
		.then(res=> {
			const data=res.data?.data || res.data;
			const rawNodes = data.nodes || [];
			const rawEdges = data.edges || [];
			if(rawNodes.length > 0) {
				const normalize = (path) => {
					if(!path) return "Unknown";
					return path.replace(/^\/api/,'').replace(/\$/,'');
				};
				
				const safeNodes = rawNodes.map( n=> {
					const cleanId = normalize(n.id);
					return {
						id: n.id,
						name: cleanId,
						val: Math.max(n.accessCount || 1, 2),
						color: getColor(n.sensitivity||0)
						};
				});
				
				const validNodeIds = new Set(safeNodes.map(n=>n.id));
				const safeLinks = rawEdges.map(e => ({
							source: e.from,
							target: e.to,
							name: `${e.method} (${e.timeDelta}ms)`
				}))
				.filter(link => validNodeIds.has(link.source) && validNodeIds.has(link.target));
				
				setGraphData({
					nodes: safeNodes,
					links: safeLinks
				});
			}
		})
		.catch(err => console.error("Failed to load session graph: ", err));
	},[]);
	
	function getColor(sensitivity) {
		if(sensitivity === 0) return "#22c55e";
		if(sensitivity === 1) return "#f59e0b";
		if(sensitivity === 2) return "#f97316";
		return "#ef4444";
	}
	
	return (
    <div style={{ 
      background: 'var(--bg)', 
      border: '1px solid var(--border)', 
      borderRadius: 16, 
      overflow: 'hidden', 
      height: '400px',
      position: 'relative'
    }}>
      <h3 style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)'
      }}>
        Live Session Graph
      </h3>
      
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          graphData={graphData}
          width={800}
          height={400}
          nodeLabel="name"
          linkColor={() => 'rgba(139,147,176,0.3)'}
          backgroundColor="transparent"
        />
      ) : (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
          Collecting graph data...
        </div>
      )}
    </div>
  );
}
