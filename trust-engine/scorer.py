import json
import os

# Adjust path to find the backend config from the trust-engine folder
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "src", "config", "scoring-rules.json")

def load_config():
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load config: {e}. Falling back to default rules.")
        return {
            "initial_score": 90,
            "min_score": 0,
            "max_score": 100,
            "deductions": {
                "ip_change": -25,
                "geo_jump_penalty": -40,
                "geo_jump_threshold_km": 500,
                "new_device": -20,
                "high_rate_penalty": -15,
                "rate_limit_threshold": 100,
                "after_hours": -5
            },
            "increases": {
                "sucessful_step_up": 30,
                "consistent_24hrs": 10
            }
        }

def calculate_score(signals):
    config = load_config()
    
    # Can allow passing the current score in the signals payload, otherwise default to initial_score
    score = signals.get('current_score', config['initial_score'])
    deductions = config['deductions']

    if signals.get('ip_changed'):
        score += deductions['ip_change']
        
    if signals.get('impossible_travel'):
        score += deductions.get('impossible_travel', -20)
        
    if signals.get('geo_distance', 0) > deductions['geo_jump_threshold_km']:
        score += deductions['geo_jump_penalty']
        
    if signals.get('device_changed'):
        score += deductions['new_device']
        
    if signals.get('requests_per_minute', 0) > deductions['rate_limit_threshold']:
        score += deductions['high_rate_penalty']
        
    if signals.get('is_after_hours'):
        score += deductions['after_hours']
        
    increases = config['increases']
    # Increases
    if signals.get('successful_step_up'):
        score += increases['successful_step_up']
        
    if signals.get('consistent_24hrs'):
        score += increases['consistent_24hrs']
        
    # Clamp between min_score and max_score
    return max(config['min_score'], min(config['max_score'], score))
