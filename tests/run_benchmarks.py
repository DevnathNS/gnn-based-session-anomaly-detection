#!/usr/bin/env python3
"""
Performance & Latency Benchmark Suite
Week 8 — Adaptive Trust Session Management System

Measures:
  - Scoring latency (P50, P95, P99)
  - End-to-end request latency
  - Throughput (req/s)
  - Concurrent user simulation
"""

import requests
import time
import json
import statistics
import concurrent.futures
import sys
import os

BASE = "http://localhost:3000"
ENGINE = "http://localhost:8000"
RESULTS_DIR = os.path.dirname(os.path.abspath(__file__))

def register_and_login(email):
    """Register a user and return (token, sessionId)."""
    requests.post(f"{BASE}/auth/register", json={"email": email, "password": "password123"})
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "password123"})
    data = r.json()
    return data.get("token"), data.get("sessionId")


def percentile(data, p):
    """Calculate percentile."""
    if not data:
        return 0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f = int(k)
    c = f + 1 if f + 1 < len(sorted_data) else f
    d = k - f
    return sorted_data[f] + d * (sorted_data[c] - sorted_data[f])


# ─────────────────────────────────────────────────────────
# TEST 1: Trust Engine Scoring Latency
# ─────────────────────────────────────────────────────────
def test_scoring_latency(n=100):
    print(f"\n{'='*60}")
    print(f"  TEST 1: Trust Engine Scoring Latency ({n} requests)")
    print(f"{'='*60}")

    test_payload = {
        "ip": "127.0.0.1",
        "previous_ip": "127.0.0.1",
        "previous_location": None,
        "previous_ts": None,
        "ip_changed": False,
        "session_id": "bench-test-session",
        "geo_distance": 0,
        "impossible_travel": False,
        "device_changed": False,
        "requests_per_minute": 5,
        "is_after_hours": False,
        "successful_step_up": False,
        "consistent_24hrs": False,
        "current_score": 90,
        "graph": {
            "nodes": [
                {"id": "/api/user/profile", "sensitivity": 1, "accessCount": 3, "lastAccessed": 1000, "timeSinceLastAccess": 500},
                {"id": "/api/user/settings", "sensitivity": 1, "accessCount": 2, "lastAccessed": 2000, "timeSinceLastAccess": 300}
            ],
            "edges": [
                {"from": "/api/user/profile", "to": "/api/user/settings", "timeDelta": 500, "method": "GET"}
            ]
        },
        "current_location": None
    }

    latencies = []
    errors = 0

    for i in range(n):
        start = time.time()
        try:
            r = requests.post(f"{ENGINE}/calculate_score", json=test_payload, timeout=5)
            elapsed = (time.time() - start) * 1000  # ms
            latencies.append(elapsed)
            if r.status_code != 200:
                errors += 1
        except Exception:
            errors += 1

    if not latencies:
        print("  ❌ All requests failed. Is trust-engine running on :8000?")
        return None

    p50 = percentile(latencies, 50)
    p95 = percentile(latencies, 95)
    p99 = percentile(latencies, 99)
    avg = statistics.mean(latencies)
    mn = min(latencies)
    mx = max(latencies)

    print(f"  Requests:  {n} (errors: {errors})")
    print(f"  Min:       {mn:.2f}ms")
    print(f"  P50:       {p50:.2f}ms")
    print(f"  P95:       {p95:.2f}ms")
    print(f"  P99:       {p99:.2f}ms")
    print(f"  Max:       {mx:.2f}ms")
    print(f"  Avg:       {avg:.2f}ms")
    print()
    if p95 < 250:
        print(f"  ✅ LATENCY TARGET MET (P95={p95:.1f}ms < 250ms)")
    else:
        print(f"  ⚠️  LATENCY TARGET MISSED (P95={p95:.1f}ms >= 250ms)")

    return {"p50": p50, "p95": p95, "p99": p99, "avg": avg, "min": mn, "max": mx}


# ─────────────────────────────────────────────────────────
# TEST 2: End-to-End Request Latency
# ─────────────────────────────────────────────────────────
def test_e2e_latency(n=50):
    print(f"\n{'='*60}")
    print(f"  TEST 2: End-to-End Request Latency ({n} requests)")
    print(f"{'='*60}")

    email = f"e2e_bench_{int(time.time())}@test.com"
    token, sid = register_and_login(email)

    if not token:
        print("  ❌ Failed to login. Is backend running on :3000?")
        return None

    latencies = []
    endpoints = ["/api/user/profile", "/api/user/settings", "/api/public/news"]

    for i in range(n):
        ep = endpoints[i % len(endpoints)]
        start = time.time()
        r = requests.get(f"{BASE}{ep}", headers={"Authorization": f"Bearer {token}"})
        elapsed = (time.time() - start) * 1000
        latencies.append(elapsed)

    p50 = percentile(latencies, 50)
    p95 = percentile(latencies, 95)
    p99 = percentile(latencies, 99)

    print(f"  P50:  {p50:.2f}ms")
    print(f"  P95:  {p95:.2f}ms")
    print(f"  P99:  {p99:.2f}ms")
    print(f"  Avg:  {statistics.mean(latencies):.2f}ms")

    return {"p50": p50, "p95": p95, "p99": p99}


# ─────────────────────────────────────────────────────────
# TEST 3: Throughput (Sequential)
# ─────────────────────────────────────────────────────────
def test_throughput(n=200):
    print(f"\n{'='*60}")
    print(f"  TEST 3: Throughput ({n} sequential requests)")
    print(f"{'='*60}")

    email = f"throughput_{int(time.time())}@test.com"
    token, sid = register_and_login(email)

    if not token:
        print("  ❌ Failed to login")
        return None

    start = time.time()
    success = 0
    for i in range(n):
        r = requests.get(f"{BASE}/api/user/settings", headers={"Authorization": f"Bearer {token}"})
        if r.status_code in (200, 403, 401, 429):  # any valid response
            success += 1
    elapsed = time.time() - start
    rps = n / elapsed

    print(f"  Total:      {n} requests in {elapsed:.1f}s")
    print(f"  Successful: {success}")
    print(f"  Throughput: {rps:.1f} req/s")
    print()
    if rps > 50:
        print(f"  ✅ THROUGHPUT TARGET MET ({rps:.1f} > 50 req/s)")
    else:
        print(f"  ⚠️  THROUGHPUT BELOW TARGET ({rps:.1f} < 50 req/s)")

    return {"rps": rps, "total": n, "elapsed": elapsed}


# ─────────────────────────────────────────────────────────
# TEST 4: Concurrent Users
# ─────────────────────────────────────────────────────────
def simulate_user(user_id):
    """Simulate one user: login + 20 requests."""
    email = f"concurrent_{user_id}_{int(time.time())}@test.com"
    token, sid = register_and_login(email)
    if not token:
        return {"user": user_id, "requests": 0, "errors": 1}

    success = 0
    errors = 0
    endpoints = ["/api/user/profile", "/api/user/settings", "/api/public/news", "/api/public/about"]

    for i in range(20):
        ep = endpoints[i % len(endpoints)]
        try:
            r = requests.get(f"{BASE}{ep}", headers={"Authorization": f"Bearer {token}"}, timeout=10)
            success += 1
        except Exception:
            errors += 1
        time.sleep(0.05)

    return {"user": user_id, "requests": success, "errors": errors}


def test_concurrent(users=50):
    print(f"\n{'='*60}")
    print(f"  TEST 4: Concurrent Users ({users} users, 20 req each)")
    print(f"{'='*60}")

    start = time.time()
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=users) as executor:
        futures = [executor.submit(simulate_user, i) for i in range(users)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    elapsed = time.time() - start
    total_requests = sum(r["requests"] for r in results)
    total_errors = sum(r["errors"] for r in results)
    rps = total_requests / elapsed

    print(f"  Users:      {users}")
    print(f"  Total req:  {total_requests}")
    print(f"  Errors:     {total_errors}")
    print(f"  Duration:   {elapsed:.1f}s")
    print(f"  Throughput: {rps:.1f} req/s")
    print()
    if total_errors == 0:
        print(f"  ✅ ALL USERS COMPLETED WITHOUT ERRORS")
    else:
        print(f"  ⚠️  {total_errors} errors during concurrent test")

    return {"users": users, "total_requests": total_requests, "errors": total_errors, "rps": rps, "elapsed": elapsed}


# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║       PERFORMANCE BENCHMARK SUITE — Week 8              ║")
    print("╚══════════════════════════════════════════════════════════╝")

    results = {}

    # 1. Scoring latency
    r1 = test_scoring_latency(100)
    if r1:
        results["scoring_latency"] = r1

    # 2. E2E latency
    r2 = test_e2e_latency(50)
    if r2:
        results["e2e_latency"] = r2

    # 3. Throughput
    r3 = test_throughput(200)
    if r3:
        results["throughput"] = r3

    # 4. Concurrent
    r4 = test_concurrent(50)
    if r4:
        results["concurrent"] = r4

    # Save results
    results_path = os.path.join(RESULTS_DIR, "benchmark_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    if r1:
        tag = "✅" if r1["p95"] < 250 else "⚠️"
        print(f"  {tag} Scoring Latency P95:   {r1['p95']:.1f}ms (target: <250ms)")
    if r2:
        print(f"  📊 E2E Latency P95:        {r2['p95']:.1f}ms")
    if r3:
        tag = "✅" if r3["rps"] > 50 else "⚠️"
        print(f"  {tag} Throughput:            {r3['rps']:.1f} req/s (target: >50)")
    if r4:
        tag = "✅" if r4["errors"] == 0 else "⚠️"
        print(f"  {tag} Concurrent ({r4['users']} users): {r4['total_requests']} req, {r4['errors']} errors")

    print(f"\n  Results saved to: {results_path}")
    print()
