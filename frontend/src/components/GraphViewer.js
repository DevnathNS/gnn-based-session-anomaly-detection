import React, { useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d'; 
import api from '../utils/api';

export default function GraphViewer() {
	const [graphData, setGraphData] = useState({nodes:[],links:[]});
	useEffect(() => {
    api.get('/api/session/graph')
      .then(res => {
        const data = res.data?.data || res.data; 
        const rawEdges = data.edges || data.links;

        if (data && data.nodes && rawEdges) {
          
          // Helper function to force all URLs into the exact same format
          const normalize = (path) => {
            if (!path) return String(Math.random());
            // Removes '/api' and trailing slashes so '/api/profile' and '/profile' become identical
            return path.replace(/^\/api/, '').replace(/\/$/, ''); 
          };

          // 1. Build the nodes using normalized IDs
          const safeNodes = data.nodes.map(n => {
            const cleanId = normalize(n.id || n.endpoint);
            return {
              id: cleanId,
              name: cleanId, // Display the clean name (e.g. "/user/profile")
              val: n.accessCount || n.count || 1, 
              color: getColor(n.sensitivity || 0)
            };
          });

          // 2. Create the fast lookup Set
          const validNodeIds = new Set(safeNodes.map(n => n.id));

          // 3. Map and filter the links using the SAME normalization
          const safeLinks = rawEdges
            .map(e => ({
              source: normalize(e.from || e.source), 
              target: normalize(e.to || e.target),
              name: e.method || 'NAV'
            }))
            .filter(link => validNodeIds.has(link.source) && validNodeIds.has(link.target)); 

          // 4. Render the graph
          setGraphData({
            nodes: safeNodes,
            links: safeLinks
          });
        }
      })
      .catch(err => console.error("Failed to load session graph:", err));
  }, []);
  
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
