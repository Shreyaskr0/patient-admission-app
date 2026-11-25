import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import PatientForm from "./components/PatientForm";
import ConfirmDialog from "./components/ConfirmDialog";

const EMPTY_FILTERS = { search: "", ward: "", department: "", doctor: "" };

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function App() {
  const [options, setOptions] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState(""); // what is typed; copied to filters after a short pause
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formPatient, setFormPatient] = useState(undefined); // undefined = closed, null = add, object = edit
  const [confirm, setConfirm] = useState(null); // { type: "delete" | "discharge", patient }
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setPatients(await api.getPatients(filters));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load the dropdown lists once
  useEffect(() => {
    api.getOptions().then(setOptions).catch((err) => setLoadError(err.message));
  }, []);

  // Reload the list whenever a filter changes
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Search: wait 300 ms after typing stops before asking the server
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function handleFilterChange(e) {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function clearFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  }

  async function handleSave(payload) {
    if (formPatient) {
      await api.updatePatient(formPatient.id, payload);
      showToast("Patient updated");
    } else {
      await api.createPatient(payload);
      showToast("Patient added");
    }
    setFormPatient(undefined);
    loadPatients();
  }

  async function handleConfirm() {
    const { type, patient } = confirm;
    try {
      if (type === "delete") {
        await api.deletePatient(patient.id);
        showToast(`${patient.name} deleted`);
      } else {
        await api.dischargePatient(patient.id);
        showToast(`${patient.name} discharged`);
      }
      loadPatients();
    } catch (err) {
      showToast(err.message, "error");
    }
    setConfirm(null);
  }

  const hasFilters = search || filters.ward || filters.department || filters.doctor;

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">+</span>
            <div>
              <h1>Patient Admissions</h1>
              <p>Manage admitted patients across wards</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setFormPatient(null)} disabled={!options}>
            + Add patient
          </button>
        </div>
      </header>

      <main className="container">

        <section className="filters" aria-label="Search and filters">
          <input
            className="search"
            type="search"
            placeholder="Search by patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by name"
          />
          {options && (
            <>
              <select name="ward" value={filters.ward} onChange={handleFilterChange} aria-label="Filter by ward">
                <option value="">All wards</option>
                {options.wards.map((w) => <option key={w}>{w}</option>)}
              </select>
              <select name="department" value={filters.department} onChange={handleFilterChange} aria-label="Filter by department">
                <option value="">All departments</option>
                {options.departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select name="doctor" value={filters.doctor} onChange={handleFilterChange} aria-label="Filter by doctor">
                <option value="">All doctors</option>
                {options.doctors.map((d) => <option key={d}>{d}</option>)}
              </select>
            </>
          )}
          {hasFilters && (
            <button className="btn btn-ghost" onClick={clearFilters}>
              Clear
            </button>
          )}
        </section>

        {loadError && (
          <div className="alert">
            {loadError}{" "}
            <button className="link-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        <section className="card">
          {loading && patients.length === 0 ? (
            <p className="empty">Loading patients…</p>
          ) : patients.length === 0 ? (
            <div className="empty">
              <p>{hasFilters ? "No patients match these filters." : "No patients yet."}</p>
              {!hasFilters && options && (
                <button className="btn btn-primary" onClick={() => setFormPatient(null)}>
                  Add the first patient
                </button>
              )}
            </div>
          ) : (
            <table className="patients">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age / Gender</th>
                  <th>Ward</th>
                  <th>Department</th>
                  <th>Doctor</th>
                  <th>Admitted on</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Name" className="cell-name">{p.name}</td>
                    <td data-label="Age / Gender" className="nowrap">{p.age} · {p.gender}</td>
                    <td data-label="Ward">{p.ward}</td>
                    <td data-label="Department">{p.department}</td>
                    <td data-label="Doctor">{p.doctor}</td>
                    <td data-label="Admitted on" className="nowrap">{formatDate(p.admission_date)}</td>
                    <td data-label="Status">
                      <span className={`badge ${p.status === "Admitted" ? "badge-admitted" : "badge-discharged"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="actions">
                      <div className="actions-inner">
                      <button className="btn btn-small" onClick={() => setFormPatient(p)}>
                        Edit
                      </button>
                      {p.status === "Admitted" && (
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => setConfirm({ type: "discharge", patient: p })}
                        >
                          Discharge
                        </button>
                      )}
                      <button
                        className="btn btn-small btn-danger-ghost"
                        onClick={() => setConfirm({ type: "delete", patient: p })}
                      >
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {formPatient !== undefined && options && (
        <PatientForm
          patient={formPatient}
          options={options}
          onSave={handleSave}
          onCancel={() => setFormPatient(undefined)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "delete" ? "Delete patient?" : "Discharge patient?"}
          message={
            confirm.type === "delete"
              ? `This will permanently delete ${confirm.patient.name}'s record. This cannot be undone.`
              : `Mark ${confirm.patient.name} as discharged?`
          }
          confirmLabel={confirm.type === "delete" ? "Delete" : "Discharge"}
          danger={confirm.type === "delete"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}
    </div>
  );
}
