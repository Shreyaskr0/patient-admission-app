import { useState } from "react";
import { todayString, validatePatient } from "../validation";

const EMPTY_FORM = {
  name: "",
  age: "",
  gender: "",
  ward: "",
  department: "",
  doctor: "",
  admission_date: todayString(),
  status: "Admitted",
};

// Used for both "Add patient" (patient = null) and "Edit patient".
export default function PatientForm({ patient, options, onSave, onCancel }) {
  const isEdit = Boolean(patient);
  const [form, setForm] = useState(patient ? { ...patient } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((errs) => ({ ...errs, [name]: undefined })); // clear that field's error
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const found = validatePatient(form, options);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      name: form.name.trim().replace(/\s+/g, " "),
      age: Number(form.age),
      gender: form.gender,
      ward: form.ward,
      department: form.department,
      doctor: form.doctor,
      admission_date: form.admission_date,
      status: form.status,
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch (err) {
      // Show backend validation errors next to the fields too
      setErrors(err.fieldErrors || {});
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function selectField(name, label, list) {
    return (
      <div className={`field ${errors[name] ? "has-error" : ""}`}>
        <label htmlFor={name}>{label} *</label>
        <select id={name} name={name} value={form[name]} onChange={handleChange}>
          <option value="">Select {label.toLowerCase()}</option>
          {list.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {errors[name] && <span className="error">{errors[name]}</span>}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-header">
          <h2 id="form-title">{isEdit ? "Edit patient" : "Add patient"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="alert">{serverError}</div>}

          <div className="form-grid">
            <div className={`field span-2 ${errors.name ? "has-error" : ""}`}>
              <label htmlFor="name">Full name *</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Ravi Kumar"
                autoFocus
              />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>

            <div className={`field ${errors.age ? "has-error" : ""}`}>
              <label htmlFor="age">Age *</label>
              <input
                id="age"
                name="age"
                type="number"
                min="0"
                max="120"
                inputMode="numeric"
                value={form.age}
                onChange={handleChange}
                placeholder="0 – 120"
              />
              {errors.age && <span className="error">{errors.age}</span>}
            </div>

            {selectField("gender", "Gender", options.genders)}
            {selectField("ward", "Ward", options.wards)}
            {selectField("department", "Department", options.departments)}
            {selectField("doctor", "Doctor", options.doctors)}

            <div className={`field ${errors.admission_date ? "has-error" : ""}`}>
              <label htmlFor="admission_date">Admission date *</label>
              <input
                id="admission_date"
                name="admission_date"
                type="date"
                max={todayString()}
                value={form.admission_date}
                onChange={handleChange}
              />
              {errors.admission_date && <span className="error">{errors.admission_date}</span>}
            </div>

            {isEdit && (
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form.status} onChange={handleChange}>
                  {options.statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
