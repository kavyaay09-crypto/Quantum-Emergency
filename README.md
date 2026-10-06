from pathlib import Path

readme = """# QuantumResQ 🚑⚛️

**AI + Quantum-Powered Emergency Response & Ambulance Dispatch System**

QuantumResQ is an intelligent emergency response platform designed to improve ambulance dispatch and hospital coordination using **AI-based emergency demand prediction**, **Quantum Approximate Optimization Algorithm (QAOA)**, real-time ambulance tracking, and hospital capacity monitoring.

The system provides separate interfaces for **Dispatchers, Ambulance Teams, and Hospitals**, enabling coordinated emergency response from incident detection to hospital arrival.

---

## 🚨 Problem Statement

Emergency ambulance systems can face challenges such as:

- Uneven distribution of ambulances
- Increasing emergency demand in specific areas
- Delays in ambulance assignment
- Traffic and route uncertainty
- Lack of coordination between ambulances and hospitals
- Limited visibility of hospital emergency/ICU capacity

QuantumResQ addresses these challenges through an integrated AI-powered emergency dispatch platform.

---

## 💡 Proposed Solution

QuantumResQ combines:

```text
Emergency Data
      ↓
AI Demand Prediction
      ↓
Emergency Hotspot Detection
      ↓
QAOA Optimization
      ↓
Optimal Ambulance Assignment
      ↓
Route & Ambulance Tracking
      ↓
Hospital Coordination
      ↓
Emergency Bed Capacity Monitoring
```

The system helps dispatchers select suitable ambulances for predicted emergency hotspots while keeping hospitals informed about incoming ambulances.

---

## ✨ Key Features

### 🧠 AI Emergency Demand Prediction

Predicts emergency demand across different zones and identifies potential high-risk hotspots.

Example:

```text
Whitefield       → High Risk
Koramangala      → High Risk
Electronic City  → Moderate Risk
```

### ⚛️ QAOA-Based Ambulance Dispatch

Uses the **Quantum Approximate Optimization Algorithm (QAOA)** concept to optimize ambulance-to-emergency-zone assignments.

The dispatch plan considers factors such as:

- Ambulance availability
- Emergency hotspot
- Predicted demand
- Distance
- Hospital destination

### 🚑 Ambulance Management

Ambulance teams can:

- View assigned emergency
- View destination
- View receiving hospital
- Update status
- Mark themselves as:
  - Assigned
  - En Route
  - Arrived
  - Completed

### 🏥 Hospital Coordination

Hospitals can monitor:

- Incoming ambulances
- Emergency beds
- ICU beds
- Trauma availability
- Ambulance status

Hospital alerts are synchronized with ambulance status updates.

### 🗺️ Live Emergency Map

The dispatcher dashboard displays:

- Emergency hotspots
- Ambulance locations
- Hospital locations
- Dispatch routes
- Emergency zones

The map uses **OpenStreetMap** data.

### 📊 Dispatcher Dashboard

The dispatcher can monitor:

- Active emergencies
- Critical hotspots
- Available ambulances
- Hospitals
- AI predictions
- QAOA dispatch assignments
- Fleet status

---

## 🏗️ System Architecture

```text
                   ┌─────────────────────┐
                   │   Emergency Data    │
                   └──────────┬──────────┘
                              ↓
                   ┌─────────────────────┐
                   │ AI Demand Prediction│
                   └──────────┬──────────┘
                              ↓
                   ┌─────────────────────┐
                   │ Emergency Hotspots  │
                   └──────────┬──────────┘
                              ↓
                   ┌─────────────────────┐
                   │ QAOA Optimization   │
                   └──────────┬──────────┘
                              ↓
                   ┌─────────────────────┐
                   │ Ambulance Dispatch  │
                   └──────────┬──────────┘
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
        Dispatcher       Ambulance        Hospital
        Dashboard        Interface        Interface
              │               │               │
              └───────────────┼───────────────┘
                              ↓
                   ┌─────────────────────┐
                   │ FastAPI Backend     │
                   └─────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- React Leaflet
- OpenStreetMap

### Backend

- Python
- FastAPI
- REST APIs

### AI / Optimization

- AI-based demand prediction
- Quantum Approximate Optimization Algorithm (QAOA)
- Optimization-based ambulance assignment

### Visualization

- Leaflet
- OpenStreetMap
- Interactive emergency maps
- Real-time status dashboards

---

## 📁 Project Structure

```text
QuantumResQ/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── assets/
│   ├── architecture.png
│   ├── workflow.png
│   ├── qaoa.png
│   └── dashboard.png
│
└── README.md
```

---

## 🔄 System Workflow

```text
1. Emergency demand is analyzed
             ↓
2. High-risk zones are identified
             ↓
3. Available ambulances are detected
             ↓
4. QAOA generates optimized assignments
             ↓
5. Dispatcher accepts an assignment
             ↓
6. Ambulance receives the assignment
             ↓
7. Ambulance status changes
   Assigned → En Route → Arrived → Completed
             ↓
8. Receiving hospital gets live alerts
             ↓
9. Hospital capacity is monitored
```

---

## 🔌 Important API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard` | Dashboard statistics |
| GET | `/hotspots` | Emergency hotspot data |
| GET | `/ambulances` | Ambulance information |
| GET | `/hospitals` | Hospital information |
| GET | `/qaoa` | Optimized dispatch assignments |
| POST | `/assignments/accept` | Accept ambulance dispatch |
| POST | `/ambulances/{id}/status` | Update ambulance status |
| POST | `/hospitals/{id}/incoming` | Send hospital alert |
| POST | `/hospitals/{id}/beds` | Update hospital beds |

---

## 🚑 Ambulance Status Flow

```text
AVAILABLE
    ↓
ASSIGNED
    ↓
EN ROUTE
    ↓
ARRIVED
    ↓
COMPLETED
    ↓
AVAILABLE
```

The receiving hospital can automatically receive updates as the ambulance progresses through these states.

---

## ⚛️ Why Quantum Computing?

Ambulance dispatch can be formulated as an **optimization problem**.

Given:

- Multiple ambulances
- Multiple emergency hotspots
- Different distances
- Different predicted demands
- Hospital constraints

the objective is to find a good ambulance-to-zone assignment.

QAOA is suitable for demonstrating how quantum optimization can be applied to combinatorial optimization problems.

> **Note:** In the prototype, QAOA is used as the optimization component/concept; the system is designed as a hackathon prototype rather than a production quantum deployment.

---

## 🖥️ User Interfaces

### Dispatcher

Provides a centralized command center for:

- Emergency monitoring
- AI predictions
- QAOA dispatch
- Fleet monitoring
- Map visualization

### Ambulance

Provides:

- Current assignment
- Destination
- Receiving hospital
- Emergency status controls
- Hospital coordination

### Hospital

Provides:

- Incoming ambulance alerts
- Emergency bed availability
- ICU capacity
- Trauma availability
- Ambulance status

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd QuantumResQ
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend will run at:

```text
http://127.0.0.1:8000
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

---

## 🧪 Prototype Validation

The prototype demonstrates:

- ✅ AI emergency hotspot prediction
- ✅ QAOA-based dispatch planning
- ✅ Ambulance assignment
- ✅ Ambulance status synchronization
- ✅ Hospital incoming alerts
- ✅ Hospital bed monitoring
- ✅ Interactive emergency map
- ✅ Dispatcher, ambulance, and hospital interfaces
- ✅ End-to-end emergency dispatch workflow

---

## 📸 Prototype

The prototype contains three major interfaces:

```text
┌─────────────────────────────────────────────┐
│             DISPATCHER DASHBOARD            │
│                                             │
│  AI Prediction │ QAOA │ Emergency Map      │
│                                             │
│       Ambulance & Hospital Monitoring       │
└─────────────────────────────────────────────┘

┌──────────────────────┐  ┌───────────────────┐
│ AMBULANCE INTERFACE  │  │ HOSPITAL INTERFACE│
│                      │  │                   │
│ Current Assignment   │  │ Incoming Alerts   │
│ Destination          │  │ Emergency Beds    │
│ Hospital             │  │ ICU Capacity      │
│ Status Updates       │  │ Trauma Capacity   │
└──────────────────────┘  └───────────────────┘
```

---

## 🔮 Future Scope

- Real-time traffic integration
- Real ambulance GPS tracking
- Real hospital APIs
- Historical emergency datasets
- More advanced ML forecasting
- Real quantum hardware execution
- Multi-hospital optimization
- Dynamic ambulance relocation
- ETA prediction
- Emergency severity classification
- Cloud deployment
- Mobile application for ambulance teams

---

## 📚 References

```text
[1] E. Farhi, J. Goldstone, and S. Gutmann,
    “A quantum approximate optimization algorithm,”
    arXiv:1411.4028, 2014.

[2] M. Zahorka et al.,
    “Modeling IN out-of-hospital emergency medical services:
    A scoping review of approaches and applications,” 2026.

[3] “Dynamic ambulance relocation: A scoping review,” 2023.

[4] IBM Quantum,
    “Quantum Approximate Optimization Algorithm.”

[5] OpenStreetMap Foundation,
    “OpenStreetMap.”

[6] Meta Platforms, Inc.,
    “React Documentation.”

[7] S. Ramírez,
    “FastAPI Documentation.”
```

---

## 👩‍💻 Project

**QuantumResQ**  
*AI + Quantum-Powered Emergency Response & Ambulance Dispatch System*

**Built for Q-Hack India 2026** 🚑⚛️
"""

path = Path("/mnt/data/README.md")
path.write_text(readme, encoding="utf-8")
print(f"Created: {path}")
