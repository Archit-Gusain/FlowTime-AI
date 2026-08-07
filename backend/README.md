# FlowTime AI - Flask backend

Serves the trained travel-time model (`model.pkl` + `columns.pkl`).

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                  # http://localhost:5000
```

## Endpoints

`GET /health` -> `{ "status": "ok", "features": 27 }`

`POST /predict`

```json
{
  "distance_km": 42.5,
  "traffic_level": "Heavy",
  "road_type": "City Road",
  "weather": "Rain",
  "road_condition": "Average",
  "area_type": "Urban",
  "time_of_day": "Evening",
  "day_type": "Weekday"
}
```

Response:

```json
{
  "travel_time_minutes": 118.4,
  "traffic_factor": 2.12,
  "average_speed_kmh": 21.5,
  "distance_km": 42.5,
  "base_speed_kmh": 45.0
}
```

The model predicts the **traffic factor**; travel time is
`distance / free-flow speed * traffic factor`, where free-flow speed depends on
the road type (Highway 90, City Road 45, Village Road 40, Mountain Road 35 km/h).

## Connecting the frontend

Set `VITE_FLOWTIME_API` to the backend URL (defaults to `http://localhost:5000`).
If the backend is unreachable the frontend falls back to an equivalent on-device
estimator so the UI stays usable.
