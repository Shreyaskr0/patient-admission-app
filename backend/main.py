"""Patient Admission Management API (FastAPI).

Run locally:  uvicorn main:app --reload
API docs:     http://localhost:8000/docs
"""
import os

from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import Base, Patient, engine, get_db
from options import DEPARTMENTS, DOCTORS, GENDERS, STATUSES, WARDS
from validation import validate_patient

Base.metadata.create_all(bind=engine)  # create the table if it does not exist

app = FastAPI(title="Patient Admission Management API")

# Comma-separated list of frontend URLs allowed to call this API.
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip().rstrip("/") for o in allowed_origins if o.strip()],
    # Also allow the frontend deployed on Vercel (production and preview URLs)
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_methods=["*"],
    allow_headers=["*"],
)


class ValidationFailed(Exception):
    def __init__(self, errors: dict):
        self.errors = errors


@app.exception_handler(ValidationFailed)
def validation_failed_handler(request, exc: ValidationFailed):
    # 400 with one readable sentence plus a message for each wrong field
    return JSONResponse(
        status_code=400,
        content={"detail": "; ".join(exc.errors.values()), "errors": exc.errors},
    )


@app.exception_handler(RequestValidationError)
def bad_request_handler(request, exc: RequestValidationError):
    # e.g. body is not valid JSON, or the id in the URL is not a number
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request: send a JSON object with the patient fields"},
    )


def get_patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient with id {patient_id} not found")
    return patient


@app.get("/")
def health():
    return {"status": "ok", "message": "Patient Admission Management API"}


@app.get("/api/options")
def get_options():
    return {
        "genders": GENDERS,
        "wards": WARDS,
        "departments": DEPARTMENTS,
        "doctors": DOCTORS,
        "statuses": STATUSES,
    }


@app.get("/api/patients")
def list_patients(
    search: str = "",
    ward: str = "",
    department: str = "",
    doctor: str = "",
    status: str = "",
    db: Session = Depends(get_db),
):
    query = db.query(Patient)
    if search.strip():
        query = query.filter(Patient.name.ilike(f"%{search.strip()}%"))
    if ward:
        query = query.filter(Patient.ward == ward)
    if department:
        query = query.filter(Patient.department == department)
    if doctor:
        query = query.filter(Patient.doctor == doctor)
    if status:
        query = query.filter(Patient.status == status)
    patients = query.order_by(Patient.admission_date.desc(), Patient.id.desc()).all()
    return [p.to_dict() for p in patients]


@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    return get_patient_or_404(db, patient_id).to_dict()


@app.post("/api/patients", status_code=201)
def create_patient(payload: dict = Body(...), db: Session = Depends(get_db)):
    clean, errors = validate_patient(payload)
    if errors:
        raise ValidationFailed(errors)
    patient = Patient(**clean)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient.to_dict()


@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    patient = get_patient_or_404(db, patient_id)
    clean, errors = validate_patient(payload)
    if errors:
        raise ValidationFailed(errors)
    for key, value in clean.items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient.to_dict()


@app.patch("/api/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = get_patient_or_404(db, patient_id)
    if patient.status == "Discharged":
        raise HTTPException(status_code=400, detail="Patient is already discharged")
    patient.status = "Discharged"
    db.commit()
    db.refresh(patient)
    return patient.to_dict()


@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = get_patient_or_404(db, patient_id)
    name = patient.name
    db.delete(patient)
    db.commit()
    return {"message": f"Patient {name} deleted"}
