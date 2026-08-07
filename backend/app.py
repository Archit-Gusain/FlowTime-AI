"""FlowTime AI - Flask prediction service.

Serves the trained XGBoost traffic-factor model to the FlowTime AI frontend.

Run:  python app.py     (defaults to http://localhost:5000)
"""

import os
import pickle

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "model.pkl"), "rb") as f:
    MODEL = pickle.load(f)

with open(os.path.join(BASE_DIR, "columns.pkl"), "rb") as f:
    COLUMNS = pickle.load(f)

# Free-flow speed (km/h) used to convert distance -> base travel time.
BASE_SPEED_KMH = {
    "Highway": 90.0,
    "City Road": 45.0,
    "Village Road": 40.0,
    "Mountain Road": 35.0,
}

# The trained model has no vehicle feature, so vehicle type is applied as a
# post-model adjustment: bikes cruise slower but are less affected by traffic.
VEHICLE_PROFILE = {
    "Car": {"speed_factor": 1.0, "max_speed": 130.0, "traffic_sensitivity": 1.0},
    "Bike": {"speed_factor": 0.82, "max_speed": 70.0, "traffic_sensitivity": 0.7},
}

FEATURE_GROUPS = {
    "traffic_level": ["Low", "Moderate", "Heavy", "Severe"],
    "road_type": ["Highway", "City Road", "Village Road", "Mountain Road"],
    "road_condition": ["Excellent", "Good", "Average", "Poor"],
    "weather": ["Sunny", "Windy", "Rain", "Fog", "Storm"],
    "area_type": ["Rural", "Suburban", "Urban"],
    "time_of_day": ["Morning", "Afternoon", "Evening", "Night"],
    "day_type": ["Weekday", "Weekend", "Holiday"],
}

app = Flask(__name__)
CORS(app)


def build_features(payload):
    row = np.zeros((1, len(COLUMNS)), dtype=float)
    for group, allowed in FEATURE_GROUPS.items():
        value = payload.get(group)
        if value not in allowed:
            raise ValueError("'%s' must be one of %s, got %r" % (group, allowed, value))
        key = "%s_%s" % (group, value)
        if key in COLUMNS:
            row[0, COLUMNS.index(key)] = 1.0
    return row


@app.get("/health")
def health():
    return jsonify({"status": "ok", "features": len(COLUMNS)})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}

    try:
        distance_km = float(payload.get("distance_km", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "distance_km must be a number"}), 400
    if distance_km <= 0:
        return jsonify({"error": "distance_km must be greater than 0"}), 400

    try:
        features = build_features(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    traffic_factor = float(MODEL.predict(features)[0])
    traffic_factor = max(1.0, min(traffic_factor, 5.0))

    vehicle = payload.get("vehicle", "Car")
    profile = VEHICLE_PROFILE.get(vehicle, VEHICLE_PROFILE["Car"])
    traffic_factor = max(1.0, 1.0 + (traffic_factor - 1.0) * profile["traffic_sensitivity"])

    road_speed = BASE_SPEED_KMH.get(payload.get("road_type"), 50.0)
    base_speed = min(road_speed * profile["speed_factor"], profile["max_speed"])
    base_minutes = (distance_km / base_speed) * 60.0
    travel_time_minutes = base_minutes * traffic_factor
    average_speed_kmh = distance_km / (travel_time_minutes / 60.0)

    return jsonify(
        {
            "travel_time_minutes": round(travel_time_minutes, 2),
            "traffic_factor": round(traffic_factor, 3),
            "average_speed_kmh": round(average_speed_kmh, 2),
            "distance_km": round(distance_km, 2),
            "base_speed_kmh": round(base_speed, 1),
            "vehicle": vehicle if vehicle in VEHICLE_PROFILE else "Car",
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
