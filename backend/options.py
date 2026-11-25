"""Fixed dropdown lists. The backend only accepts values from these lists,
and the frontend loads them from GET /api/options so both always match."""

GENDERS = ["Male", "Female", "Other"]

WARDS = [
    "General Ward",
    "ICU",
    "Emergency",
    "Pediatric Ward",
    "Maternity Ward",
    "Surgical Ward",
]

DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Gynecology",
    "Oncology",
]

DOCTORS = [
    "Dr. Anil Kumar",
    "Dr. Priya Sharma",
    "Dr. Rahul Menon",
    "Dr. Kavya Rao",
    "Dr. Suresh Iyer",
    "Dr. Meera Nair",
]

STATUSES = ["Admitted", "Discharged"]
