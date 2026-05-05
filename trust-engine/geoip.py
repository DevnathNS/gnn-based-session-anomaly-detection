import geoip2.database
import math
import time

DB_PATH = 'GeoLite2-City.mmdb'

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def lookup(ip):
    try:
        with geoip2.database.Reader(DB_PATH) as reader:
            r = reader.city(ip)
            return {'city': r.city.name, 'country': r.country.iso_code,
                    'lat': r.location.latitude, 'lon': r.location.longitude}
    except:
        return None

def impossible_travel(distance_km, elapsed_seconds):
    if elapsed_seconds <= 0: return distance_km > 0
    speed_kmh = distance_km / (elapsed_seconds / 3600)
    return speed_kmh > 900

def get_geo_signals(current_ip, previous_ip, previous_location, previous_ts):
    curr_loc = lookup(current_ip)
    ip_changed = current_ip != previous_ip
    dist = 0
    impossible = False
    if ip_changed and curr_loc and previous_location:
        dist = haversine(previous_location['lat'], previous_location['lon'],
                         curr_loc['lat'], curr_loc['lon'])
        elapsed = (time.time() - previous_ts/1000.0) if previous_ts else 0 # assuming previous_ts is in ms
        impossible = impossible_travel(dist, elapsed)
    return {
        'ip_changed': ip_changed,
        'geo_distance': dist,
        'impossible_travel': impossible,
        'current_location': curr_loc
    }
