from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import requests
import urllib.parse
from zoneinfo import ZoneInfo
from datetime import datetime

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════
# DATABASE CONNECTIONS
# ══════════════════════════════════════════

def get_metro_db():
    conn = sqlite3.connect("chennai_metro_clean.db")
    conn.row_factory = sqlite3.Row
    return conn

def get_suburban_db():
    conn = sqlite3.connect("chennai_suburban.db")
    conn.row_factory = sqlite3.Row
    return conn

def get_bus_db():
    conn = sqlite3.connect("chennai_bus.db")
    conn.row_factory = sqlite3.Row
    return conn


# ══════════════════════════════════════════
# TEST ROUTE
# ══════════════════════════════════════════

@app.get("/")
def home():
    return {
        "message": "Smart Chennai Backend is Running!"
    }


# ══════════════════════════════════════════
# METRO ENDPOINTS
# ══════════════════════════════════════════

@app.get("/stations")
def get_metro_stations():
    conn = get_metro_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations")
    stations = cursor.fetchall()
    conn.close()
    return [dict(s) for s in stations]


@app.get("/stations/{line}")
def get_metro_stations_by_line(line: str):
    conn = get_metro_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM stations WHERE line = ?",
        (line,)
    )
    stations = cursor.fetchall()
    conn.close()
    return [dict(s) for s in stations]


@app.get("/connections")
def get_metro_connections():
    conn = get_metro_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM connections")
    connections = cursor.fetchall()
    conn.close()
    return [dict(c) for c in connections]


@app.get("/schedules")
def get_metro_schedules():
    conn = get_metro_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schedules")
    schedules = cursor.fetchall()
    conn.close()
    return [dict(s) for s in schedules]


# ══════════════════════════════════════════
# SUBURBAN TRAIN ENDPOINTS
# ══════════════════════════════════════════

@app.get("/suburban/stations")
def get_suburban_stations():
    conn = get_suburban_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations")
    stations = cursor.fetchall()
    conn.close()
    return [dict(s) for s in stations]


@app.get("/suburban/stations/{line}")
def get_suburban_stations_by_line(line: str):
    conn = get_suburban_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM stations WHERE line = ?",
        (line,)
    )
    stations = cursor.fetchall()
    conn.close()
    return [dict(s) for s in stations]


@app.get("/suburban/connections")
def get_suburban_connections():
    conn = get_suburban_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM connections")
    connections = cursor.fetchall()
    conn.close()
    return [dict(c) for c in connections]


@app.get("/suburban/schedules")
def get_suburban_schedules():
    conn = get_suburban_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schedules")
    schedules = cursor.fetchall()
    conn.close()
    return [dict(s) for s in schedules]


# ══════════════════════════════════════════
# BUS ENDPOINTS
# ══════════════════════════════════════════

@app.get("/bus/stops")
def get_bus_stops():
    conn = get_bus_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bus_stops")
    stops = cursor.fetchall()
    conn.close()
    return [dict(s) for s in stops]


@app.get("/bus/routes")
def get_bus_routes():
    conn = get_bus_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bus_routes")
    routes = cursor.fetchall()
    conn.close()
    return [dict(r) for r in routes]


@app.get("/bus/routes/{route_number}")
def get_bus_route(route_number: str):
    conn = get_bus_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM bus_routes WHERE route_number = ?",
        (route_number,)
    )

    routes = cursor.fetchall()
    conn.close()

    return [dict(r) for r in routes]


@app.get("/bus/schedules")
def get_bus_schedules():
    conn = get_bus_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bus_schedules")
    schedules = cursor.fetchall()
    conn.close()
    return [dict(s) for s in schedules]

# ══════════════════════════════════════════
# GEOAPIFY SEARCH PROXY & CACHE
# ══════════════════════════════════════════
GEOAPIFY_KEY = "2dda0861c4fb4355ab5af2367ac6f72d"
search_cache = {}

@app.get("/api/search")
def search_places(q: str):
    if len(q) < 3:
        return []
    
    q_lower = q.lower().strip()
    if q_lower in search_cache:
        return search_cache[q_lower]

    # Strictly filter results to Chennai metropolitan area (within 40km of center)
    filter_param = "circle:80.235,13.067,40000"
    results = []
    seen_ids = set()

    # 1. Autocomplete (Prefix-based, fast typing)
    try:
        encoded_q = urllib.parse.quote(q)
        url = f"https://api.geoapify.com/v1/geocode/autocomplete?text={encoded_q}&filter={filter_param}&format=json&apiKey={GEOAPIFY_KEY}"
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            for item in response.json().get("results", []):
                pid = item.get("place_id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    results.append(item)
    except Exception as e:
        print(f"Autocomplete Error: {e}")

    # 2. Fuzzy Search fallback (Typo tolerance, e.g. 'syful' -> 'Saiful')
    # Triggered if we have few results and user is typing full terms
    if len(results) < 5:
        try:
            encoded_q = urllib.parse.quote(q)
            url = f"https://api.geoapify.com/v1/geocode/search?text={encoded_q}&filter={filter_param}&format=json&apiKey={GEOAPIFY_KEY}"
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                for item in response.json().get("results", []):
                    pid = item.get("place_id")
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        results.append(item)
        except Exception as e:
            print(f"Fuzzy Search Error: {e}")

    search_cache[q_lower] = results[:10]  # Return max 10 results
    return search_cache[q_lower]

@app.get("/api/reverse")
def reverse_geocode(lat: float, lon: float):
    try:
        url = f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&format=json&apiKey={GEOAPIFY_KEY}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        if results:
            return results[0]
        return {}
    except Exception as e:
        print(f"Reverse geocode error: {e}")
        return {}

@app.get("/status")
def get_system_status():
    # 1. Weather from Open-Meteo
    weather = {
        "temperature": 30.0,
        "condition": "Clear",
        "is_raining": False
    }
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current_weather=true"
        r = requests.get(url, timeout=3)
        if r.status_code == 200:
            current = r.json().get("current_weather", {})
            code = current.get("weathercode", 0)
            temp = current.get("temperature", 30)
            
            # WMO Weather codes for rain/drizzle/thunderstorm
            rain_codes = {51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99}
            
            description = "Clear"
            if code == 0: description = "Clear"
            elif code in {1, 2, 3}: description = "Cloudy"
            elif code in {51, 53, 55}: description = "Drizzle"
            elif code in {61, 63, 65}: description = "Raining"
            elif code in {80, 81, 82}: description = "Rain Showers"
            elif code in {95, 96, 99}: description = "Thunderstorm"

            weather = {
                "temperature": temp,
                "condition": description,
                "is_raining": code in rain_codes
            }
    except Exception as e:
        print(f"Weather fetch failed: {e}")

    # 2. Time & Peak-hours from ZoneInfo
    tz = ZoneInfo("Asia/Kolkata")
    now = datetime.now(tz)
    hour = now.hour
    minute = now.minute
    day_of_week = now.strftime("%A")
    
    # Define peak hours: 8:30 AM - 11:00 AM, 5:00 PM - 8:30 PM
    time_float = hour + minute / 60.0
    is_peak = (8.5 <= time_float <= 11.0) or (17.0 <= time_float <= 20.5)
    
    # Operating status (Metro runs 5 AM to 11 PM)
    metro_open = 5.0 <= time_float <= 23.0
    
    return {
        "weather": weather,
        "time": {
            "formatted": now.strftime("%I:%M %p"),
            "hour": hour,
            "minute": minute,
            "day": day_of_week,
            "is_peak_hours": is_peak,
            "is_night": hour >= 22 or hour < 5,
            "metro_operating": metro_open
        }
    }