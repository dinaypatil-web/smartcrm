import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function PrescriptionsList() {
    const { user } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        patient: { name: '', age: '', gender: 'Male', phone: '' },
        diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        followUpDate: '', notes: '', appointmentId: ''
    });
    const [latestAppointment, setLatestAppointment] = useState(null);

    const fetchLatestAppointment = async (name) => {
        if (!name || name.length < 3) return;
        try {
            const { data } = await api.get(`/appointments?patientName=${name}&limit=1`);
            if (data.appointments && data.appointments.length > 0) {
                setLatestAppointment(data.appointments[0]);
                setForm(prev => ({ ...prev, appointmentId: data.appointments[0].id }));
            } else {
                setLatestAppointment(null);
            }
        } catch (err) {
            console.error('Failed to fetch appointment info');
        }
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get('/prescriptions?limit=50');
                setPrescriptions(data.prescriptions);
            } catch (err) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showModal && prescriptions.length > 0) {
                if (e.key === 'Insert' && (user?.role === 'doctor' || user?.role === 'developer')) {
                    e.preventDefault();
                    setShowModal(true);
                }
                if (e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    // openEdit(prescriptions[0]); 
                }
                if (e.key === 'Delete') {
                    e.preventDefault();
                    // handleDelete(prescriptions[0]._id);
                }
                if (e.key.toLowerCase() === 'p') {
                    e.preventDefault();
                    // handlePrint(prescriptions[0]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, prescriptions, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/prescriptions', form);
            toast.success('Prescription created');
            setShowModal(false);
            setLatestAppointment(null);
            const { data } = await api.get('/prescriptions?limit=50');
            setPrescriptions(data.prescriptions);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const addMedicine = () => setForm(prev => ({
        ...prev, medicines: [...prev.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">💊 Prescriptions</h1><p className="page-subtitle">Doctor prescriptions</p></div>
                {(user?.role === 'doctor' || user?.role === 'developer') && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Prescription</button>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Rx #</th><th>Date</th><th>Patient</th><th>Age</th><th>Diagnosis</th><th>Medicines</th><th>Status</th></tr></thead>
                    <tbody>
                        {prescriptions.length === 0 ? (
                            <tr><td colSpan="7"><div className="empty-state"><p>No prescriptions</p></div></td></tr>
                        ) : prescriptions.map(p => (
                            <tr key={p._id}>
                                <td><code style={{ color: 'var(--primary-light)' }}>{p.prescriptionNumber}</code></td>
                                <td>{new Date(p.prescriptionDate).toLocaleDateString('en-IN')}</td>
                                <td><strong>{p.patient?.name}</strong></td>
                                <td>{p.patient?.age} / {p.patient?.gender?.charAt(0)}</td>
                                <td>{p.diagnosis || '—'}</td>
                                <td>{p.medicines?.length} items</td>
                                <td><span className={`badge ${p.isDispensed ? 'badge-success' : 'badge-warning'}`}>{p.isDispensed ? 'Dispensed' : 'Pending'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setLatestAppointment(null); }}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">New Prescription</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setLatestAppointment(null); }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-4">
                                <div className="form-group"><label className="form-label">Patient Name *</label>
                                    <input
                                        className="form-input"
                                        value={form.patient.name}
                                        onChange={e => setForm({ ...form, patient: { ...form.patient, name: e.target.value } })}
                                        onBlur={(e) => fetchLatestAppointment(e.target.value)}
                                        required
                                    /></div>
                                <div className="form-group"><label className="form-label">Age</label>
                                    <input type="number" className="form-input" value={form.patient.age} onChange={e => setForm({ ...form, patient: { ...form.patient, age: +e.target.value } })} /></div>
                                <div className="form-group"><label className="form-label">Gender</label>
                                    <select className="form-select" value={form.patient.gender} onChange={e => setForm({ ...form, patient: { ...form.patient, gender: e.target.value } })}>
                                        <option>Male</option><option>Female</option><option>Other</option></select></div>
                                <div className="form-group"><label className="form-label">Phone</label>
                                    <input className="form-input" value={form.patient.phone} onChange={e => setForm({ ...form, patient: { ...form.patient, phone: e.target.value } })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Diagnosis</label>
                                <input className="form-input" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>

                            {latestAppointment && (
                                <div className="card" style={{ background: 'var(--bg-alt)', border: '1px solid var(--primary-light)', padding: '12px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary)' }}>📊 Latest Vitals (from Appointment)</h4>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date: {new Date(latestAppointment.appointmentDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="grid grid-4">
                                        <div><label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BP</label><div>{latestAppointment.bloodPressure}</div></div>
                                        <div><label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Temp</label><div>{latestAppointment.bodyTemperature}°C</div></div>
                                        <div><label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Weight</label><div>{latestAppointment.weight}kg</div></div>
                                        <div><label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visit Purpose</label><div style={{ fontSize: '12px' }}>{latestAppointment.purposeOfVisit}</div></div>
                                    </div>
                                </div>
                            )}

                            <h4 style={{ margin: '12px 0 8px' }}>Medicines</h4>
                            {form.medicines.map((med, i) => (
                                <div key={i} className="form-row form-row-4" style={{ marginBottom: '8px', alignItems: 'end' }}>
                                    <div className="form-group"><input className="form-input" value={med.medicineName} onChange={e => {
                                        const n = [...form.medicines]; n[i].medicineName = e.target.value; setForm({ ...form, medicines: n });
                                    }} placeholder="Medicine name *" /></div>
                                    <div className="form-group"><input className="form-input" value={med.dosage} onChange={e => {
                                        const n = [...form.medicines]; n[i].dosage = e.target.value; setForm({ ...form, medicines: n });
                                    }} placeholder="Dosage" /></div>
                                    <div className="form-group"><input className="form-input" value={med.frequency} onChange={e => {
                                        const n = [...form.medicines]; n[i].frequency = e.target.value; setForm({ ...form, medicines: n });
                                    }} placeholder="Frequency" /></div>
                                    <div className="form-group"><button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, medicines: form.medicines.filter((_, idx) => idx !== i) })}>×</button></div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicine}>+ Add Medicine</button>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setLatestAppointment(null); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Prescription</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
