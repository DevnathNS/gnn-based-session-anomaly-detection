import psycopg2
import json
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'trust_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def view_sample_graphs():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Fetch 1 Benign and 1 Attack graph
    cursor.execute("SELECT nodes, edges, label FROM session_graphs WHERE label = 'benign'")
    benign = cursor.fetchone()
    
    cursor.execute("SELECT nodes, edges, label FROM session_graphs WHERE label = 'attack'")
    attack = cursor.fetchone()
    
    for graph in [benign, attack]:
        print("\n" + "="*50)
        print(f" TYPE: {graph[2].upper()} SESSION ")
        print("="*50)
        nodes = graph[0] if isinstance(graph[0], list) else json.loads(graph[0])
        print(f"Total Nodes: {len(nodes)}")
        for n in nodes:
            print(f"  - {n.get('method', 'GET')} {n.get('id')} (Count: {n.get('accessCount')})")
            
    cursor.close()
    conn.close()

if __name__ == "__main__":
    view_sample_graphs()
