"""
Week 6: Training Data Generator
Generates benign and attack session graphs for GNN training
"""

import random
import time
import json
from typing import List, Dict, Tuple
import psycopg2
from psycopg2.extras import execute_values
import os

# Database connection
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'trust_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def get_sensitivity(endpoint: str) -> int:
    """Classify endpoint sensitivity"""
    if endpoint.startswith('/api/public') or endpoint.startswith('/public'):
        return 0
    if endpoint.startswith('/api/admin') or endpoint.startswith('/admin'):
        return 2
    if endpoint.startswith('/api/payment') or endpoint.startswith('/payment'):
        return 3
    if 'user' in endpoint or 'profile' in endpoint:
        return 1
    return 1

def session_to_graph(session: List[Tuple[str, str]]) -> Dict:
    """
    Convert a session (list of method, endpoint tuples) to a graph structure.
    
    Args:
        session: List of (method, endpoint) tuples
    
    Returns:
        Graph dict with nodes and edges
    """
    graph = {'nodes': [], 'edges': []}
    node_ids = {}
    
    for i, (method, endpoint) in enumerate(session):
        # Add node if not exists
        if endpoint not in node_ids:
            node_idx = len(graph['nodes'])
            node_ids[endpoint] = node_idx
            graph['nodes'].append({
                'id': endpoint,
                'sensitivity': get_sensitivity(endpoint),
                'accessCount': 0,
                'lastAccessed': int(time.time() * 1000),
                'method': method
            })
        
        # Update access count
        node_idx = node_ids[endpoint]
        graph['nodes'][node_idx]['accessCount'] += 1
        graph['nodes'][node_idx]['lastAccessed'] = int(time.time() * 1000)
        
        # Add edge from previous node
        if i > 0:
            prev_method, prev_endpoint = session[i - 1]
            prev_idx = node_ids[prev_endpoint]
            curr_idx = node_ids[endpoint]
            
            # Time delta between requests (50ms to 5s)
            time_delta = random.uniform(50, 5000)
            
            graph['edges'].append({
                'from': prev_endpoint,
                'to': endpoint,
                'timeDelta': time_delta,
                'method': method
            })
    
    return graph

# ============================================================================
# BENIGN SESSION SIMULATORS
# ============================================================================

def simulate_benign_session() -> List[Tuple[str, str]]:
    """
    Simulate a normal user session with typical browsing patterns.
    """
    session = []
    
    # Login
    session.append(('POST', '/api/auth/login'))
    
    # View dashboard
    session.append(('GET', '/api/dashboard'))
    
    # Browse pages at normal pace (2-10 requests)
    pages = [
        '/api/user/profile',
        '/api/user/settings',
        '/api/user/preferences',
        '/api/public/news',
        '/api/public/help',
        '/api/user/messages',
        '/api/user/notifications'
    ]
    
    num_browses = random.randint(3, 8)
    for _ in range(num_browses):
        page = random.choice(pages)
        session.append(('GET', page))
    
    # Maybe update profile
    if random.random() > 0.5:
        session.append(('POST', '/api/user/profile'))
    
    # Logout
    session.append(('POST', '/api/auth/logout'))
    
    return session

def simulate_benign_admin_session() -> List[Tuple[str, str]]:
    """
    Simulate a normal admin session with admin operations.
    """
    session = []
    
    # Login
    session.append(('POST', '/api/auth/login'))
    
    # Dashboard
    session.append(('GET', '/api/dashboard'))
    
    # Admin operations (3-5 operations at normal pace)
    admin_pages = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/logs',
        '/api/admin/reports'
    ]
    
    num_operations = random.randint(2, 5)
    for _ in range(num_operations):
        page = random.choice(admin_pages)
        session.append(('GET', page))
        
        # Maybe perform action (POST)
        if random.random() > 0.6:
            session.append(('POST', page))
    
    # Logout
    session.append(('POST', '/api/auth/logout'))
    
    return session

# ============================================================================
# ATTACK SESSION SIMULATORS
# ============================================================================

def simulate_session_hijacking() -> List[Tuple[str, str]]:
    """
    Simulate session hijacking: normal start, then sudden high-speed admin access.
    """
    session = []
    
    # Attacker hijacks after normal login
    session.append(('POST', '/api/auth/login'))
    session.append(('GET', '/api/dashboard'))
    
    # Brief normal browsing
    session.append(('GET', '/api/user/profile'))
    
    # ATTACK: Rapid admin access attempts (attacker trying to access admin endpoints)
    admin_endpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/delete',
        '/api/admin/logs'
    ]
    
    # Many rapid requests (10-20 in quick succession)
    for _ in range(random.randint(10, 20)):
        endpoint = random.choice(admin_endpoints)
        session.append(('GET', endpoint))
        # Some attempts with POST (trying to modify)
        if random.random() > 0.7:
            session.append(('POST', endpoint))
    
    return session

def simulate_privilege_escalation() -> List[Tuple[str, str]]:
    """
    Simulate privilege escalation: trying all sensitive endpoints systematically.
    """
    session = []
    
    # Normal login
    session.append(('POST', '/api/auth/login'))
    session.append(('GET', '/api/dashboard'))
    
    # Escalation attempt: sequential access to all admin/payment endpoints
    sensitive_endpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/permissions',
        '/api/admin/audit',
        '/api/payment/history',
        '/api/payment/settings',
        '/api/payment/methods'
    ]
    
    # Try each endpoint multiple times
    for endpoint in sensitive_endpoints * 3:
        session.append(('GET', endpoint))
        if random.random() > 0.5:
            session.append(('POST', endpoint))
    
    return session

def simulate_data_exfiltration() -> List[Tuple[str, str]]:
    """
    Simulate data exfiltration: downloading/exporting large amounts of data.
    """
    session = []
    
    # Normal login
    session.append(('POST', '/api/auth/login'))
    session.append(('GET', '/api/dashboard'))
    
    # ATTACK: Massive data downloads
    # Download many pages of user data/reports
    for i in range(random.randint(30, 50)):
        session.append(('GET', f'/api/data/export?page={i}'))
    
    # Also try payment data
    for i in range(random.randint(10, 20)):
        session.append(('GET', f'/api/payment/export?page={i}'))
    
    return session

def simulate_rate_limit_attack() -> List[Tuple[str, str]]:
    """
    Simulate rate limiting attack: hundreds of requests in seconds.
    """
    session = []
    
    # Quick login
    session.append(('POST', '/api/auth/login'))
    
    # ATTACK: Rapid-fire requests to same endpoint
    endpoints = ['/api/user/profile', '/api/dashboard', '/api/data/search']
    
    for _ in range(random.randint(50, 100)):
        session.append(('GET', random.choice(endpoints)))
    
    return session

def simulate_sqli_attempt() -> List[Tuple[str, str]]:
    """
    Simulate SQL injection attempt: requests with suspicious parameters.
    """
    session = []
    
    session.append(('POST', '/api/auth/login'))
    
    # ATTACK: Requests with injection patterns
    # In real scenario, these would have payloads in query params
    suspicious_endpoints = [
        "/api/search?q='; DROP TABLE users; --",
        "/api/user?id=1 OR 1=1",
        "/api/data?filter=1' UNION SELECT * FROM passwords",
    ]
    
    for endpoint in suspicious_endpoints * 5:
        session.append(('GET', endpoint))
        session.append(('POST', endpoint))
    
    return session

# ============================================================================
# DATA GENERATION & DATABASE STORAGE
# ============================================================================

def generate_benign_graphs(num_sessions: int = 1000) -> List[Tuple[Dict, str]]:
    """Generate benign session graphs"""
    graphs = []
    
    print(f"[GENERATOR] Generating {num_sessions} benign sessions...")
    
    for i in range(num_sessions):
        # 80% regular users, 20% admins
        if random.random() > 0.8:
            session = simulate_benign_admin_session()
        else:
            session = simulate_benign_session()
        
        graph = session_to_graph(session)
        graphs.append((graph, 'benign'))
        
        if (i + 1) % 100 == 0:
            print(f"  ✓ Generated {i + 1}/{num_sessions} benign sessions")
    
    return graphs

def generate_attack_graphs(num_sessions: int = 500) -> List[Tuple[Dict, str]]:
    """Generate attack session graphs with variety"""
    graphs = []
    
    print(f"[GENERATOR] Generating {num_sessions} attack sessions...")
    
    attack_types = [
        ('session_hijacking', simulate_session_hijacking, 0.2),
        ('privilege_escalation', simulate_privilege_escalation, 0.2),
        ('data_exfiltration', simulate_data_exfiltration, 0.3),
        ('rate_limit', simulate_rate_limit_attack, 0.2),
        ('sqli_attempt', simulate_sqli_attempt, 0.1),
    ]
    
    for i in range(num_sessions):
        # Choose attack type based on distribution
        rand = random.random()
        cumulative = 0
        attack_func = None
        
        for attack_type, func, probability in attack_types:
            cumulative += probability
            if rand <= cumulative:
                attack_func = func
                break
        
        if attack_func is None:
            attack_func = simulate_data_exfiltration
        
        session = attack_func()
        graph = session_to_graph(session)
        graphs.append((graph, 'attack'))
        
        if (i + 1) % 100 == 0:
            print(f"  ✓ Generated {i + 1}/{num_sessions} attack sessions")
    
    return graphs

def save_graphs_to_db(graphs: List[Tuple[Dict, str]]) -> int:
    """Save all graphs to PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print(f"\n[DATABASE] Saving {len(graphs)} graphs to PostgreSQL...")
        
        # For each graph, insert nodes and edges
        # Note: We'll store the label info in a comment or separate tracking
        inserted = 0
        for i, (graph, label) in enumerate(graphs):
            try:
                # Use session_id as unique identifier with label prefix
                session_id = f"{label}_{i:05d}_{int(time.time() * 1000) % 100000}"
                
                cursor.execute("""
                    INSERT INTO session_graphs (session_id, nodes, edges, label)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (session_id) DO NOTHING
                """, (
                    session_id,
                    json.dumps(graph['nodes']),
                    json.dumps(graph['edges']),
                    label
                ))
                inserted += 1
                
                if (inserted) % 200 == 0:
                    conn.commit()
                    
            except Exception as e:
                # Rollback on error and continue
                conn.rollback()
                continue
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"  ✅ Successfully saved {inserted}/{len(graphs)} graphs to database")
        return inserted
        
    except Exception as e:
        print(f"  ❌ Database error: {e}")
        return 0

def generate_and_save_dataset(benign_count: int = 1000, attack_count: int = 500):
    """Main function: generate and save complete dataset"""
    print("\n" + "="*70)
    print("🚀 WEEK 6: TRAINING DATA GENERATION")
    print("="*70)
    
    # Generate graphs
    benign_graphs = generate_benign_graphs(benign_count)
    attack_graphs = generate_attack_graphs(attack_count)
    
    all_graphs = benign_graphs + attack_graphs
    
    # Shuffle
    random.shuffle(all_graphs)
    
    # Save to database
    saved_count = save_graphs_to_db(all_graphs)
    
    print("\n" + "="*70)
    print("📊 DATASET SUMMARY")
    print("="*70)
    print(f"  Benign sessions: {benign_count}")
    print(f"  Attack sessions: {attack_count}")
    print(f"  Total graphs: {benign_count + attack_count}")
    print(f"  Saved to DB: {saved_count}")
    print(f"  Split: 70% train / 15% val / 15% test")
    print("="*70 + "\n")
    
    return all_graphs

if __name__ == "__main__":
    # Generate dataset
    # Adjust counts as needed
    generate_and_save_dataset(benign_count=1000, attack_count=500)
    
    print("✅ Data generation complete!")
    print("Next steps:")
    print("  1. Run training script")
    print("  2. Train model to >90% accuracy")
    print("  3. Save model weights")
    print("  4. Update inference endpoint")
