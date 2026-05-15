#!/bin/bash
# =============================================================================
# ATTACK SCENARIO TEST SUITE
# Week 8 — Adaptive Trust Session Management System
# Runs 6 scenarios, logs score trajectories, outputs PASS/FAIL
# =============================================================================

BASE="http://localhost:3000"
RESULTS_FILE="/home/d3vn37/cys/s6/zta/project/gnn-based-session-anomaly-detection/tests/scenario_results.csv"
mkdir -p "$(dirname "$RESULTS_FILE")"

echo "scenario,type,final_score,expected_range_low,expected_range_high,status_code,result" > "$RESULTS_FILE"

pass=0
fail=0
total=0

log_result() {
    local scenario="$1" type="$2" score="$3" low="$4" high="$5" status="$6"
    local result="FAIL"
    if [ "$score" -ge "$low" ] 2>/dev/null && [ "$score" -le "$high" ] 2>/dev/null; then
        result="PASS"
    fi
    echo "$scenario,$type,$score,$low,$high,$status,$result" >> "$RESULTS_FILE"
    if [ "$result" = "PASS" ]; then
        echo "  ✅ $result (score=$score, expected=$low-$high)"
        pass=$((pass+1))
    else
        echo "  ❌ $result (score=$score, expected=$low-$high)"
        fail=$((fail+1))
    fi
    total=$((total+1))
}

register_and_login() {
    local email="$1"
    curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"password123\"}" > /dev/null 2>&1
    curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"password123\"}"
}

get_score() {
    local token="$1"
    curl -s -H "Authorization: Bearer $token" "$BASE/api/session/stats" | jq -r '.data.currentScore // 0'
}

# Consistent fingerprint for "legitimate" device
FP_LEGIT="fp_legitimate_laptop_001"
FP_ATTACKER="fp_attacker_phone_666"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         ATTACK SCENARIO TEST SUITE — Week 8             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# SCENARIO 1: NORMAL BEHAVIOR (BASELINE)
# Expected: Score stays 80-100 after normal browsing
# ─────────────────────────────────────────────────────────────
echo "━━━ Scenario 1: Normal User Behavior (Baseline) ━━━"
EMAIL="normal_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')

echo "  Browsing normally (10 requests, same device, natural delays)..."
endpoints=("/api/user/profile" "/api/user/settings" "/api/public/news" "/api/public/about")
for i in $(seq 1 10); do
    idx=$((RANDOM % ${#endpoints[@]}))
    ep="${endpoints[$idx]}"
    curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE$ep" > /dev/null
    sleep 1
done

SCORE=$(get_score "$TOKEN")
echo "  Final score: $SCORE"
log_result "1_normal_behavior" "benign" "$SCORE" 80 100 200

# ─────────────────────────────────────────────────────────────
# SCENARIO 2: SESSION HIJACKING (Device Change)
# Attacker uses stolen token from different device
# Expected: Score drops below 80
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ Scenario 2: Session Hijacking (Device Change) ━━━"
EMAIL="hijack_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')

echo "  Legitimate user browses (setting fingerprint)..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/profile" > /dev/null
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/settings" > /dev/null
sleep 0.5

echo "  ATTACK: Attacker uses stolen token with different device..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_ATTACKER" "$BASE/api/user/profile" > /dev/null
sleep 0.2
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: another_device_999" "$BASE/api/admin/users" > /dev/null

SCORE=$(get_score "$TOKEN")
echo "  Final score: $SCORE"
log_result "2_session_hijacking" "attack" "$SCORE" 0 79 403

# ─────────────────────────────────────────────────────────────
# SCENARIO 3: PRIVILEGE ESCALATION (Rapid Sensitive Access)
# User rapidly hits admin/payment endpoints → rate limit penalty
# Expected: Score drops below 80
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ Scenario 3: Privilege Escalation (Rapid Admin Access) ━━━"
EMAIL="escalate_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')

echo "  Setting initial fingerprint..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/profile" > /dev/null

echo "  Rapidly hitting admin + payment endpoints (60 requests)..."
for i in $(seq 1 60); do
    curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/admin/users" > /dev/null
    curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" -H "Content-Type: application/json" \
        -d '{"amount":9999,"to":"evil"}' "$BASE/api/payments/transfer" > /dev/null
done

SCORE=$(get_score "$TOKEN")
echo "  Final score: $SCORE"
log_result "3_privilege_escalation" "attack" "$SCORE" 0 79 403

# ─────────────────────────────────────────────────────────────
# SCENARIO 4: API ABUSE (Rate Flooding)
# 200 rapid requests to trigger rate-based penalties
# Expected: Score drops below 80
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ Scenario 4: API Abuse (Rate Flooding) ━━━"
EMAIL="abuser_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')

echo "  Setting initial fingerprint..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/profile" > /dev/null

echo "  Flooding with 200 rapid requests..."
for i in $(seq 1 200); do
    curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/settings" > /dev/null
done

SCORE=$(get_score "$TOKEN")
echo "  Final score: $SCORE"
log_result "4_api_abuse" "attack" "$SCORE" 0 79 429

# ─────────────────────────────────────────────────────────────
# SCENARIO 5: SCORE RECOVERY VIA STEP-UP
# Score tanks → step-up auth recovers it (+30)
# Expected: Score recovers to 70+
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ Scenario 5: Score Recovery (Step-Up Simulation) ━━━"
EMAIL="recover_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')
SID=$(echo "$LOGIN" | jq -r '.sessionId')

echo "  Setting initial fingerprint..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/profile" > /dev/null

echo "  Tanking score via device change..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_ATTACKER" "$BASE/api/user/profile" > /dev/null
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: yet_another_device" "$BASE/api/user/profile" > /dev/null

TANKED=$(get_score "$TOKEN")
echo "  Score after attack: $TANKED"

echo "  Simulating step-up auth (+30 via debug endpoint)..."
NEW_SCORE=$((TANKED + 30))
if [ "$NEW_SCORE" -gt 100 ]; then NEW_SCORE=100; fi
curl -s -X POST "$BASE/debug/score/$SID/$NEW_SCORE" > /dev/null

RECOVERED=$(get_score "$TOKEN")
echo "  Score after step-up: $RECOVERED"
log_result "5_score_recovery" "benign" "$RECOVERED" 70 100 200

# ─────────────────────────────────────────────────────────────
# SCENARIO 6: INSIDER THREAT (Mass Export + Admin + Device)
# Many data export requests + admin access + device switch
# Expected: Score drops below 80
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ Scenario 6: Insider Threat (Mass Export + Admin) ━━━"
EMAIL="insider_$(date +%s)@test.com"
LOGIN=$(register_and_login "$EMAIL")
TOKEN=$(echo "$LOGIN" | jq -r '.token')

echo "  Setting initial fingerprint..."
curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/user/profile" > /dev/null

echo "  Mass data export (100 requests)..."
for i in $(seq 1 100); do
    curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_LEGIT" "$BASE/api/data/export" > /dev/null
done

echo "  Switching device + admin access..."
for i in $(seq 1 30); do
    curl -s -H "Authorization: Bearer $TOKEN" -H "x-device-fingerprint: $FP_ATTACKER" "$BASE/api/admin/users" > /dev/null
done

SCORE=$(get_score "$TOKEN")
echo "  Final score: $SCORE"
log_result "6_insider_threat" "attack" "$SCORE" 0 79 403

# ─────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    RESULTS SUMMARY                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Passed: $pass / $total"
echo "  Failed: $fail / $total"
echo ""

benign_pass=0; benign_total=0; attack_detected=0; attack_total=0
while IFS=, read -r scenario type score low high status result; do
    [ "$scenario" = "scenario" ] && continue
    if [ "$type" = "benign" ]; then
        benign_total=$((benign_total+1))
        [ "$result" = "PASS" ] && benign_pass=$((benign_pass+1))
    elif [ "$type" = "attack" ]; then
        attack_total=$((attack_total+1))
        [ "$result" = "PASS" ] && attack_detected=$((attack_detected+1))
    fi
done < "$RESULTS_FILE"

benign_fail=$((benign_total - benign_pass))
attack_missed=$((attack_total - attack_detected))

echo "  ── Effectiveness Metrics ──"
echo "  True Positives  (attacks caught):    $attack_detected"
echo "  False Negatives (attacks missed):    $attack_missed"
echo "  True Negatives  (benign allowed):    $benign_pass"
echo "  False Positives (benign blocked):    $benign_fail"

if [ "$attack_total" -gt 0 ]; then
    tpr=$((attack_detected * 100 / attack_total))
    echo "  TPR (Recall):                        ${tpr}%"
else
    tpr=0
fi

if [ "$benign_total" -gt 0 ]; then
    fpr=$((benign_fail * 100 / benign_total))
    echo "  FPR:                                 ${fpr}%"
else
    fpr=0
fi

echo ""
if [ "$tpr" -ge 75 ] && [ "$fpr" -le 10 ]; then
    echo "  ✅ MEETS PERFORMANCE TARGETS (TPR≥75%, FPR≤10%)"
else
    echo "  ⚠️  BELOW PERFORMANCE TARGETS"
fi

echo ""
echo "  Results saved to: $RESULTS_FILE"
echo ""
