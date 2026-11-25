// Frontend validation. Same rules as backend/validation.py.

const NAME_PATTERN = /^[A-Za-z]+( [A-Za-z]+)*$/;

// Today's date as YYYY-MM-DD in the user's local time zone.
export function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

export function validatePatient(form, options) {
  const errors = {};

  const name = form.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Name is required";
  else if (!NAME_PATTERN.test(name)) errors.name = "Name must contain letters only";
  else if (name.length > 100) errors.name = "Name must be at most 100 characters";

  const age = String(form.age).trim();
  if (age === "") errors.age = "Age is required";
  else if (!/^\d+$/.test(age)) errors.age = "Age must be a whole number";
  else if (Number(age) < 0 || Number(age) > 120) errors.age = "Age must be between 0 and 120";

  const selects = [
    ["gender", "Gender", options.genders],
    ["ward", "Ward", options.wards],
    ["department", "Department", options.departments],
    ["doctor", "Doctor", options.doctors],
  ];
  selects.forEach(([key, label, list]) => {
    if (!form[key]) errors[key] = `${label} is required`;
    else if (!list.includes(form[key])) errors[key] = `Please select a valid ${label.toLowerCase()}`;
  });

  if (!form.admission_date) errors.admission_date = "Admission date is required";
  else if (form.admission_date > todayString())
    errors.admission_date = "Admission date cannot be in the future";

  return errors;
}
