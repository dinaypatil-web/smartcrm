import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import { FiPrinter, FiEdit2, FiSearch } from 'react-icons/fi';
import PrescriptionPrint from '../../components/prescriptions/PrescriptionPrint';

export default function PrescriptionsList() {
    const { user } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        patient: { name: '', age: '', gender: 'Male', phone: '' },
        diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        followUpDate: '', notes: '', appointmentId: '',
        vitals: { bloodPressure: '', bodyTemperature: '', weight: '', height: '' }
    });
    const [latestAppointment, setLatestAppointment] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [showAppointmentPicker, setShowAppointmentPicker] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Print State
    const [printData, setPrintData] = useState(null);
    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => setPrintData(null)
    });

    const triggerPrint = (data) => {
        setPrintData(data);
        setTimeout(() => handlePrint(), 100);
    };

    const fetchTodayAppointments = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await api.get(`/appointments?startDate=${today}&limit=50`);
            setAppointments(data.appointments);
            setShowAppointmentPicker(true);
        } catch (err) { toast.error('Failed to fetch appointments'); }
    };

    const selectAppointment = (appt) => {
        setLatestAppointment(appt);
        setForm({
            patient: {
                name: appt.patientName,
                age: appt.age || '',
                gender: appt.gender || 'Male',
                phone: appt.phone || ''
            },
            diagnosis: '',
            medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
            followUpDate: '',
            notes: '',
            appointmentId: appt.id,
            vitals: {
                bloodPressure: appt.bloodPressure || '',
                bodyTemperature: appt.bodyTemperature || '',
                weight: appt.weight || '',
                height: appt.height || ''
            }
        });
        setShowAppointmentPicker(false);
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
            if (editingId) {
                await api.put(`/prescriptions/${editingId}`, form);
                toast.success('Prescription updated');
            } else {
                await api.post('/prescriptions', form);
                toast.success('Prescription created');
            }
            setShowModal(false);
            setEditingId(null);
            setLatestAppointment(null);
            const { data } = await api.get('/prescriptions?limit=50');
            setPrescriptions(data.prescriptions);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const openEdit = (p) => {
        setEditingId(p._id);
        setForm({
            patient: p.patient || { name: '', age: '', gender: 'Male', phone: '' },
            diagnosis: p.diagnosis || '',
            medicines: p.medicines || [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
            followUpDate: p.followUpDate || '',
            notes: p.notes || '',
            appointmentId: p.appointmentId || '',
            vitals: p.vitals || { bloodPressure: '', bodyTemperature: '', weight: '', height: '' }
        });
        setShowModal(true);
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
                    <button className="btn btn-primary" onClick={() => {
                        setEditingId(null);
                        setForm({
                            patient: { name: '', age: '', gender: 'Male', phone: '' },
                            diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
                            followUpDate: '', notes: '', appointmentId: '',
                            vitals: { bloodPressure: '', bodyTemperature: '', weight: '', height: '' }
                        });
                        setShowModal(true);
                    }}>+ New Prescription</button>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Rx #</th><th>Date</th><th>Patient</th><th>Age</th><th>Diagnosis</th><th>Medicines</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
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
                                <td className="text-end">
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-sm" onClick={() => openEdit(p)} title="Edit">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button className="btn btn-sm" onClick={() => triggerPrint(p)} title="Print">
                                            <FiPrinter size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setLatestAppointment(null); }}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingId ? 'Edit Prescription' : 'New Prescription'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setLatestAppointment(null); setEditingId(null); }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-4">
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">Patient Name *</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            className="form-input"
                                            value={form.patient.name}
                                            onChange={e => setForm({ ...form, patient: { ...form.patient, name: e.target.value } })}
                                            required
                                        />
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchTodayAppointments} title="Select from today's appointments">
                                            <FiSearch size={14} />
                                        </button>
                                    </div>
                                </div>
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
                                        <div><label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Temp</label><div>{latestAppointment.bodyTemperature}°F</div></div>
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
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setLatestAppointment(null); setEditingId(null); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingId ? 'Update Prescription' : 'Create Prescription'}</button>
                            </div>
                            {showAppointmentPicker && (
                                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowAppointmentPicker(false)}>
                                    <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                                        <div className="modal-header">
                                            <h3 className="modal-title">Select Appointment</h3>
                                            <button type="button" className="modal-close" onClick={() => setShowAppointmentPicker(false)}>×</button>
                                        </div>
                                        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
                                            {appointments.length === 0 ? (
                                                <div className="empty-state"><p>No appointments found for today</p></div>
                                            ) : appointments.map(a => (
                                                <div
                                                    key={a.id}
                                                    className="card"
                                                    style={{ marginBottom: '8px', cursor: 'pointer', padding: '10px' }}
                                                    onClick={() => selectAppointment(a)}
                                                >
                                                    <div style={{ fontWeight: 'bold' }}>{a.patientName}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {a.purposeOfVisit} | {a.patientNumber}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
            {/* Hidden component for printing */}
            <div style={{ display: 'none' }}>
                <PrescriptionPrint ref={componentRef} data={printData} />
            </div>
        </div>
    );
}
