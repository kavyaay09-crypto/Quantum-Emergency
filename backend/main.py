from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json
import os
from datetime import datetime

app = FastAPI(
    title="Quantum Emergency Response System",
    version="1.0"
)

# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")


# --------------------------------------------------
# IN-MEMORY SYSTEM STATE
# --------------------------------------------------

ambulance_state = {}
hospital_state = {}
active_assignments = {}


# --------------------------------------------------
# LOAD AMBULANCES
# --------------------------------------------------

def load_ambulances():

    path = os.path.join(
        RAW_DIR,
        "ambulances.csv"
    )

    df = pd.read_csv(path)

    return df


# --------------------------------------------------
# LOAD HOTSPOTS
# --------------------------------------------------

def load_hotspots():

    path = os.path.join(
        PROCESSED_DIR,
        "bengaluru_hotspots.csv"
    )

    df = pd.read_csv(path)

    return df


# --------------------------------------------------
# LOAD HOSPITALS
# --------------------------------------------------

def load_hospitals():

    osm_path = os.path.join(
        RAW_DIR,
        "hospitals_osm.csv"
    )

    capacity_path = os.path.join(
        RAW_DIR,
        "hospital_capacity.csv"
    )

    hospitals = pd.read_csv(osm_path)
    capacity = pd.read_csv(capacity_path)

    # Remove hospitals without coordinates
    hospitals = hospitals.dropna(
        subset=["latitude", "longitude"]
    ).reset_index(drop=True)

    # We only have prototype capacity for 10 hospitals
    number = min(
        len(hospitals),
        len(capacity)
    )

    hospitals = hospitals.iloc[:number].copy()
    capacity = capacity.iloc[:number].copy()

    hospitals["hospital_id"] = [
        f"H{i:03d}"
        for i in range(1, number + 1)
    ]

    capacity["hospital_id"] = [
        f"H{i:03d}"
        for i in range(1, number + 1)
    ]

    hospitals = hospitals.merge(
        capacity,
        on="hospital_id",
        how="left"
    )

    return hospitals


# --------------------------------------------------
# INITIALIZE SYSTEM
# --------------------------------------------------

def initialize_system():

    global ambulance_state
    global hospital_state

    ambulances = load_ambulances()
    hospitals = load_hospitals()

    ambulance_state = {}

    for _, row in ambulances.iterrows():

        ambulance_state[row["ambulance_id"]] = {
            "ambulance_id": row["ambulance_id"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "status": row["status"],
            "current_assignment": None
        }

    hospital_state = {}

    for _, row in hospitals.iterrows():

        hospital_state[row["hospital_id"]] = {
            "hospital_id": row["hospital_id"],
            "name": row["name"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "available_emergency_beds": int(
                row["available_emergency_beds"]
            ),
            "available_icu_beds": int(
                row["available_icu_beds"]
            ),
            "trauma_available": int(
                row["trauma_available"]
            ),
            "incoming": []
        }


initialize_system()


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "system": "Quantum Emergency Response System",
        "status": "online",
        "components": [
            "AI Demand Prediction",
            "Emergency Hotspot Detection",
            "QAOA Ambulance Optimization",
            "Hospital Capacity",
            "Dispatcher",
            "Ambulance",
            "Hospital"
        ]
    }


# --------------------------------------------------
# DASHBOARD SUMMARY
# --------------------------------------------------

@app.get("/dashboard")
def dashboard():

    hotspots = load_hotspots()

    available = sum(
        1
        for a in ambulance_state.values()
        if a["status"] == "available"
    )

    busy = sum(
        1
        for a in ambulance_state.values()
        if a["status"] == "busy"
    )

    return {
        "hotspots": len(hotspots),
        "ambulances_total": len(ambulance_state),
        "ambulances_available": available,
        "ambulances_busy": busy,
        "hospitals": len(hospital_state),
        "active_assignments": len(active_assignments),
        "system_status": "Operational"
    }


# --------------------------------------------------
# HOTSPOTS
# --------------------------------------------------

@app.get("/hotspots")
def hotspots():

    df = load_hotspots()

    return df.to_dict(
        orient="records"
    )


# --------------------------------------------------
# AMBULANCES
# --------------------------------------------------

@app.get("/ambulances")
def ambulances():

    return list(
        ambulance_state.values()
    )


# --------------------------------------------------
# HOSPITALS
# --------------------------------------------------

@app.get("/hospitals")
def hospitals():

    return list(
        hospital_state.values()
    )


# --------------------------------------------------
# QAOA RESULTS
# --------------------------------------------------

@app.get("/qaoa")
def qaoa():

    path = os.path.join(
        PROCESSED_DIR,
        "qaoa_assignments.json"
    )

    if not os.path.exists(path):

        return {
            "algorithm": "QAOA",
            "status": "not_available",
            "assignments": []
        }

    with open(path, "r") as file:

        data = json.load(file)

    return data


# --------------------------------------------------
# ACTIVE ASSIGNMENTS
# --------------------------------------------------

@app.get("/assignments")
def assignments():

    return list(
        active_assignments.values()
    )


# --------------------------------------------------
# ACCEPT ASSIGNMENT
# --------------------------------------------------

class AssignmentRequest(BaseModel):

    ambulance_id: str
    zone_id: str
    zone_name: str
    hospital_id: str | None = None


@app.post("/assignments/accept")
def accept_assignment(
    request: AssignmentRequest
):

    ambulance_id = request.ambulance_id

    if ambulance_id not in ambulance_state:

        raise HTTPException(
            status_code=404,
            detail="Ambulance not found"
        )

    ambulance = ambulance_state[
        ambulance_id
    ]

    ambulance["status"] = "assigned"

    ambulance["current_assignment"] = {
        "zone_id": request.zone_id,
        "zone_name": request.zone_name,
        "hospital_id": request.hospital_id,
        "status": "assigned"
    }

    assignment = {
        "ambulance_id": ambulance_id,
        "zone_id": request.zone_id,
        "zone_name": request.zone_name,
        "hospital_id": request.hospital_id,
        "status": "assigned",
        "created_at": datetime.now().isoformat()
    }

    active_assignments[
        ambulance_id
    ] = assignment

    return {
        "success": True,
        "message": "Assignment accepted",
        "assignment": assignment
    }


# --------------------------------------------------
# UPDATE AMBULANCE STATUS
# --------------------------------------------------

class StatusRequest(BaseModel):

    status: str


@app.post("/ambulances/{ambulance_id}/status")
def update_ambulance_status(
    ambulance_id: str,
    request: StatusRequest
):

    if ambulance_id not in ambulance_state:
        raise HTTPException(
            status_code=404,
            detail="Ambulance not found"
        )

    allowed = [
        "available",
        "assigned",
        "en_route",
        "arrived",
        "completed",
        "busy"
    ]

    if request.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Invalid ambulance status"
        )

    ambulance = ambulance_state[ambulance_id]

    # Update ambulance status
    ambulance["status"] = request.status

    # Get current assignment
    assignment = ambulance.get(
        "current_assignment"
    )

    # --------------------------------------------------
    # SEND STATUS TO RECEIVING HOSPITAL
    # --------------------------------------------------

    if assignment:

        hospital_id = assignment.get(
            "hospital_id"
        )

        if hospital_id in hospital_state:

            hospital = hospital_state[
                hospital_id
            ]

            # Find existing alert for this ambulance
            existing_alert = None

            for alert in hospital["incoming"]:

                if (
                    alert["ambulance_id"]
                    == ambulance_id
                ):
                    existing_alert = alert
                    break

            # Create alert if it doesn't exist
            if existing_alert is None:

                existing_alert = {
                    "ambulance_id": ambulance_id,
                    "zone_name": assignment.get(
                        "zone_name",
                        "Emergency Hotspot"
                    ),
                    "time": datetime.now().isoformat(),
                    "status": request.status
                }

                hospital["incoming"].append(
                    existing_alert
                )

            # Update existing alert
            else:

                existing_alert["status"] = (
                    request.status
                )

                existing_alert[
                    "updated_at"
                ] = datetime.now().isoformat()

                existing_alert["zone_name"] = (
                    assignment.get(
                        "zone_name",
                        existing_alert.get(
                            "zone_name",
                            "Emergency Hotspot"
                        )
                    )
                )

    # --------------------------------------------------
    # UPDATE ASSIGNMENT
    # --------------------------------------------------

    if request.status == "completed":

        ambulance["current_assignment"] = None

        active_assignments.pop(
            ambulance_id,
            None
        )

    else:

        if ambulance.get(
            "current_assignment"
        ):

            ambulance[
                "current_assignment"
            ]["status"] = request.status

        if ambulance_id in active_assignments:

            active_assignments[
                ambulance_id
            ]["status"] = request.status

    return {
        "success": True,
        "ambulance_id": ambulance_id,
        "status": request.status,
        "hospital_id": (
            assignment.get("hospital_id")
            if assignment
            else None
        )
    }


# --------------------------------------------------
# HOSPITAL BED UPDATE
# --------------------------------------------------

class BedUpdate(BaseModel):

    emergency_beds: int
    icu_beds: int
    trauma_available: int


@app.post("/hospitals/{hospital_id}/beds")
def update_beds(
    hospital_id: str,
    request: BedUpdate
):

    if hospital_id not in hospital_state:

        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    hospital_state[
        hospital_id
    ]["available_emergency_beds"] = request.emergency_beds

    hospital_state[
        hospital_id
    ]["available_icu_beds"] = request.icu_beds

    hospital_state[
        hospital_id
    ]["trauma_available"] = request.trauma_available

    return {
        "success": True,
        "message": "Hospital capacity updated",
        "hospital": hospital_state[hospital_id]
    }


# --------------------------------------------------
# HOSPITAL INCOMING ALERT
# --------------------------------------------------

@app.post("/hospitals/{hospital_id}/incoming")
def incoming_patient(
    hospital_id: str,
    ambulance_id: str
):

    if hospital_id not in hospital_state:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    if ambulance_id not in ambulance_state:
        raise HTTPException(
            status_code=404,
            detail="Ambulance not found"
        )

    ambulance = ambulance_state[ambulance_id]

    assignment = ambulance.get(
        "current_assignment"
    )

    alert = {
        "ambulance_id": ambulance_id,
        "zone_name": (
            assignment.get("zone_name")
            if assignment
            else "Emergency Hotspot"
        ),
        "time": datetime.now().isoformat(),
        "status": ambulance.get(
            "status",
            "incoming"
        )
    }

    hospital_state[hospital_id]["incoming"].append(
        alert
    )

    return {
        "success": True,
        "message": "Incoming ambulance alert sent",
        "alert": alert
    }

# --------------------------------------------------
# RESET DEMO
# --------------------------------------------------

@app.post("/reset")
def reset_demo():

    active_assignments.clear()

    initialize_system()

    return {
        "success": True,
        "message": "Demo system reset"
    }