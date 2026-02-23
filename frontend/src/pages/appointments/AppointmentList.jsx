import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiClock, FiUser, FiCalendar, FiActivity, FiClipboard } from 'react-icons/fi';

export default function AppointmentList() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [patientSuggestions, setPatientSuggestions] = useState([]);
    const [isExistingPatient, setIsExistingPatient] = useState(false);

    const [form, setForm] = useState({
        patientName: '',
        age: '',
        gender: 'Male',
        weight: '',
        height: '',
        bloodPressure: '',
        bodyTemperature: '',
        purposeOfVisit: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '10:00'
    });

    useEffect(() => {
        fetchAppointments();
    }, [page, search]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/appointments?patientName=${search}&page=${page}&limit=10`);
            setAppointments(data.appointments);
            setTotalPages(data.pages);
        } catch (err) {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (patientNumber) => {
        try {
            setHistoryLoading(true);
            const { data } = await api.get(`/appointments/history/${patientNumber}`);
            setHistory(data);
            setShowHistory(true);
        } catch (err) {
            toast.error('Failed to load patient history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handlePatientSearch = async (val) => {
        setForm({ ...form, patientName: val });
        if (val.length > 2) {
            try {
                // Fetch recent appointments matching the name
                const { data } = await api.get(`/appointments?patientName=${val}&limit=5`);
                // Get unique patients
                const unique = [];
                const seen = new Set();
                data.appointments.forEach(a => {
                    if (!seen.has(a.patientNumber)) {
                        seen.add(a.patientNumber);
                        unique.push(a);
                    }
                });
                setPatientSuggestions(unique);
            } catch (err) {
                console.error('Search failed');
            }
        } else {
            setPatientSuggestions([]);
        }
    };

    const selectPatient = (p) => {
        setForm({
            ...form,
            patientName: p.patientName,
            age: p.age,
            gender: p.gender,
            patientNumber: p.patientNumber
        });
        setIsExistingPatient(true);
        setPatientSuggestions([]);
    };

    const resetForm = () => {
        setForm({
            patientName: '', age: '', gender: 'Male', weight: '', height: '',
            bloodPressure: '', bodyTemperature: '', purposeOfVisit: '', patientNumber: '',
            appointmentDate: new Date().toISOString().split('T')[0], appointmentTime: '10:00'
        });
        setIsExistingPatient(false);
        setPatientSuggestions([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/appointments', form);
            toast.success('Appointment created successfully');
            setShowModal(false);
            resetForm();
            fetchAppointments();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create appointment');
        }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Appointments</h1>
                    <p className="page-subtitle">Manage patient visits and records</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FiPlus /> New Appointment
                </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="form-input"
                        placeholder="Search by patient name..."
                        style={{ paddingLeft: '36px' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Details</th>
                                <th>Schedule</th>
                                <th>Purpose</th>
                                <th>Vitals (Last)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{a.patientName}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.patientNumber}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px' }}>{a.age}y | {a.gender}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                            <FiCalendar size={12} /> {new Date(a.appointmentDate).toLocaleDateString('en-IN')}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                            <FiClock size={12} /> {a.appointmentTime}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {a.purposeOfVisit}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '11px' }}>BP: {a.bloodPressure} | Temp: {a.bodyTemperature}°F</div>
                                        <div style={{ fontSize: '11px' }}>Wt: {a.weight}kg | Ht: {a.height}cm</div>
                                    </td>
                                    <td>
                                        <button className="btn btn-sm" onClick={() => fetchHistory(a.patientNumber)}>
                                            <FiClipboard size={14} /> History
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && appointments.length === 0 && (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No appointments found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination would go here */}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{isExistingPatient ? 'Book Returning Patient' : 'New Patient Appointment'}</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-2">
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">Patient Name {isExistingPatient && <span className="badge badge-success" style={{ marginLeft: '8px' }}>Existing ID: {form.patientNumber}</span>}</label>
                                    <input
                                        required
                                        className="form-input"
                                        value={form.patientName}
                                        onChange={e => handlePatientSearch(e.target.value)}
                                        placeholder="Type name to find existing..."
                                        disabled={isExistingPatient}
                                    />
                                    {isExistingPatient && (
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm"
                                            style={{ position: 'absolute', right: 0, top: 0, color: 'var(--danger)' }}
                                            onClick={() => setIsExistingPatient(false)}
                                        >
                                            Change Patient
                                        </button>
                                    )}
                                    {patientSuggestions.length > 0 && (
                                        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', padding: '4px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--accent)' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>Match found:</div>
                                            {patientSuggestions.map(p => (
                                                <div
                                                    key={p.id}
                                                    style={{ padding: '8px', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s' }}
                                                    onClick={() => selectPatient(p)}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{p.patientName}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--accent)' }}>{p.patientNumber}</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.age}y | {p.gender} | Last visited: {new Date(p.appointmentDate).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Purpose of Visit</label>
                                    <input required className="form-input" value={form.purposeOfVisit} onChange={e => setForm({ ...form, purposeOfVisit: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Age</label>
                                    <input type="number" className="form-input" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select className="form-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                        <option>Male</option><option>Female</option><option>Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row form-row-4">
                                <div className="form-group">
                                    <label className="form-label">Weight (kg)</label>
                                    <input className="form-input" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Height (cm)</label>
                                    <input className="form-input" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">BP (mmHg)</label>
                                    <input className="form-input" value={form.bloodPressure} onChange={e => setForm({ ...form, bloodPressure: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Temp (°F)</label>
                                    <input className="form-input" value={form.bodyTemperature} onChange={e => setForm({ ...form, bodyTemperature: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Appointment Time</label>
                                <input type="time" className="form-input" value={form.appointmentTime} onChange={e => setForm({ ...form, appointmentTime: e.target.value })} />
                            </div>
                            <div className="modal-footer" style={{ marginTop: '16px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Appointment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Patient History: {history[0]?.patientName} ({history[0]?.patientNumber})</h2>
                            <button className="modal-close" onClick={() => setShowHistory(false)}>×</button>
                        </div>
                        <div>
                            <div className="table-container" style={{ maxHeight: '400px' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th><th>Purpose</th><th>Vitals</th><th>Created By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h) => (
                                            <tr key={h.id}>
                                                <td style={{ fontSize: '12px' }}>{new Date(h.appointmentDate).toLocaleDateString()} {h.appointmentTime}</td>
                                                <td style={{ fontSize: '12px' }}>{h.purposeOfVisit}</td>
                                                <td style={{ fontSize: '11px' }}>
                                                    BP: {h.bloodPressure} | Temp: {h.bodyTemperature}°F<br />
                                                    Wt: {h.weight}kg | Ht: {h.height}cm
                                                </td>
                                                <td style={{ fontSize: '11px' }}>{h.createdBy}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
