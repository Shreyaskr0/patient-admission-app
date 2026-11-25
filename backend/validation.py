"""Backend validation for patient data.

validate_patient() checks every field and returns (clean_data, errors).
If errors is not empty, the API answers 400 with a clear message for each field.
"""
import re
from datetime import date, datetime, timedelta, timezone

from options import DEPARTMENTS, DOCTORS, GENDERS, STATUSES, WARDS

NAME_PATTERN = re.compile(r"^[A-Za-z]+( [A-Za-z]+)*$")  # letters, single spaces between words
IST = timezone(timedelta(hours=5, minutes=30))  # hospital staff are in India


def today_ist() -> date:
    return datetime.now(IST).date()


def _check_choice(value, allowed, label, errors, key):
    if value is None or str(value).strip() == "":
        errors[key] = f"{label} is required"
    elif value not in allowed:
        errors[key] = f"{label} must be one of: {', '.join(allowed)}"


def validate_patient(data: dict):
    errors = {}
    clean = {}

    # Name: required, letters only (spaces allowed between words)
    name = data.get("name")
    if not isinstance(name, str) or name.strip() == "":
        errors["name"] = "Name is required"
    else:
        name = " ".join(name.split())  # trim and collapse extra spaces
        if not NAME_PATTERN.match(name):
            errors["name"] = "Name must contain letters only"
        elif len(name) > 100:
            errors["name"] = "Name must be at most 100 characters"
        else:
            clean["name"] = name

    # Age: required, whole number between 0 and 120
    age = data.get("age")
    if age is None or (isinstance(age, str) and age.strip() == ""):
        errors["age"] = "Age is required"
    else:
        try:
            if isinstance(age, bool):
                raise ValueError
            if isinstance(age, float) and not age.is_integer():
                raise ValueError
            age_int = int(str(age).strip()) if isinstance(age, str) else int(age)
        except (TypeError, ValueError):
            errors["age"] = "Age must be a whole number"
        else:
            if age_int < 0 or age_int > 120:
                errors["age"] = "Age must be between 0 and 120"
            else:
                clean["age"] = age_int

    # Select fields: required, must be from the fixed lists
    for key, label, allowed in [
        ("gender", "Gender", GENDERS),
        ("ward", "Ward", WARDS),
        ("department", "Department", DEPARTMENTS),
        ("doctor", "Doctor", DOCTORS),
    ]:
        _check_choice(data.get(key), allowed, label, errors, key)
        if key not in errors:
            clean[key] = data[key]

    # Admission date: required, YYYY-MM-DD, not in the future
    raw_date = data.get("admission_date")
    if not raw_date:
        errors["admission_date"] = "Admission date is required"
    else:
        try:
            adm_date = date.fromisoformat(str(raw_date))
        except ValueError:
            errors["admission_date"] = "Admission date must be a valid date (YYYY-MM-DD)"
        else:
            if adm_date > today_ist():
                errors["admission_date"] = "Admission date cannot be in the future"
            else:
                clean["admission_date"] = adm_date

    # Status: optional (defaults to Admitted), must be Admitted or Discharged
    status = data.get("status") or "Admitted"
    if status not in STATUSES:
        errors["status"] = "Status must be Admitted or Discharged"
    else:
        clean["status"] = status

    return clean, errors
