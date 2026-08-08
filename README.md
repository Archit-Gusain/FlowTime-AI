# FlowTime AI

FlowTime AI is a travel time prediction app. Pick two points on a map, describe the road and weather conditions, and get an AI-powered estimate of how long the trip will take, including traffic factor, average speed, and confidence score.

The app is split into two parts: a React frontend built with TanStack Start and a Flask backend that serves a trained XGBoost model. If the backend is unavailable, the frontend falls back to an on-device estimator so the UI still works.

---

## What it does

- Click on the OpenStreetMap map to set an origin and destination.
- Search for places by name using Nominatim geocoding.
- Route between points with OSRM and compute the real distance.
- Choose road type, traffic level, weather, road condition, area type, time of day, day type, and vehicle mode (Car or Bike).
- An AI processing animation runs while the model predicts the traffic factor.
- Results are shown in a detailed card: total travel time, traffic factor, average speed, base speed, and generated insights.

---

## Tech stack

Frontend

- React 19
- TanStack Start / TanStack Router
- Tailwind CSS 4
- Framer Motion
- Leaflet (OpenStreetMap tiles)

Backend

- Python 3
- Flask
- Flask-CORS
- XGBoost
- scikit-learn
- NumPy

---

## Project structure

```
backend/
  app.py              # Flask API with /predict and /health
  requirements.txt    # Python dependencies
  model.pkl           # Trained XGBoost model
  columns.pkl         # Model feature column names

src/
  components/flowtime/
    MapPanel.tsx          # Interactive map, routing, vehicle animation
    PredictionPanel.tsx   # Condition and vehicle controls
    ProcessingOverlay.tsx # AI scanning animation
    ResultCard.tsx        # Results display
  lib/
    flowtime.ts          # API client, fallback estimator, formatting
  routes/
    index.tsx            # Main app page
    __root.tsx           # Root layout
  styles.css             # Theme, glassmorphism, gradients
```

---

## Quick start

### 1. Clone the repo

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend will run on `http://localhost:5000`.

### 3. Start the frontend

In a separate terminal, from the project root:

```bash
npm install
npm run dev
```

The frontend will run on `http://localhost:8080` by default.

---

## Environment variables

Create a `.env` file in the project root if you want to point the frontend at a different backend URL.

```env
VITE_FLOWTIME_API=http://localhost:5000
```

If not set, the frontend defaults to `http://localhost:5000`.

---

## Backend API

### Health check

```bash
curl http://localhost:5000/health
```

Response:

```json
{ "status": "ok", "features": 27 }
```

### Predict travel time

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "distance_km": 42.5,
    "traffic_level": "Heavy",
    "road_type": "City Road",
    "weather": "Rain",
    "road_condition": "Average",
    "area_type": "Urban",
    "time_of_day": "Evening",
    "day_type": "Weekday",
    "vehicle": "Car"
  }'
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

The model predicts a traffic factor. The backend then calculates travel time as:

```
travel_time = distance / base_speed * traffic_factor * 60
```

Base speeds by road type:

- Highway: 90 km/h
- City Road: 45 km/h
- Village Road: 40 km/h
- Mountain Road: 35 km/h

Vehicle mode adjusts the effective base speed and traffic sensitivity. For example, a bike is capped at 70 km/h and is less affected by congestion.

---

## About the model

The model was trained on 27 features. It takes categorical inputs like traffic level, road type, weather, road condition, area type, time of day, and day type, and predicts a single numeric traffic factor. The actual ETA is computed from that factor, the road distance, and the vehicle profile.

The frontend also includes a fallback estimator that mirrors the same logic using simple condition weights, so predictions are still available when the Flask backend is not running. Results from the backend are tagged with `"source": "model"`, while fallback results are tagged with `"source": "fallback"`.

## Live Demo: https://lnkd.in/gkMgr_5D

---

## Development scripts

From the project root:

```bash
npm run dev       # Start the frontend dev server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run format    # Format code with Prettier
```

From the `backend` directory:

```bash
python app.py     # Start the Flask dev server
```

---

## Notes

- The map uses OpenStreetMap tiles and the public OSRM demo server for routing. For production use, consider hosting your own OSRM instance or using a commercial routing provider.
- The Nominatim search service is rate-limited; heavy use should point to a dedicated geocoding endpoint.
- The frontend is designed as a dark, glassmorphism UI with blue, cyan, and purple accents. Theme tokens are defined in `src/styles.css`.

---

## License

This project is built for educational and demonstration purposes. Feel free to use and extend it.
