from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

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