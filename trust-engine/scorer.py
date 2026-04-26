def calculate_score(signals: dict) -> int:
    score = 90  # Start here
    
    # Deductions
    if signals.get('ip_changed'):
        score -= 25
    
    if signals.get('geo_distance', 0) > 500:  # km
        score -= 40
    
    if signals.get('device_changed'):
        score -= 20
    
    if signals.get('request_rate', 0) > 100:  # per minute
        score -= 15
    
    if signals.get('is_after_hours'):
        score -= 5
    
    # Increases
    if signals.get('successful_step_up'):
        score += 30
    
    if signals.get('consistent_24hrs'):
        score += 10
    
    # Clamp between 0-100
    return max(0, min(100, score))
