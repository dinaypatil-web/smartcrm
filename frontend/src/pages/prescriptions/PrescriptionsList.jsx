import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiEdit2, FiSearch, FiUser, FiActivity, FiClock, FiCheckCircle, FiMinusCircle } from 'react-icons/fi';
import PrescriptionPrint from '../../components/prescriptions/PrescriptionPrint';

export default function PrescriptionsList() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        patient: { name: '', age: '', gender: 'Male', phone: '' },
        diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        followUpDate: '', notes: '', appointmentId: '',
        vitals: { bloodPressure: '', bodyTemperature: '', weight: '', height: '' }
    });

    // Print Logic
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const { data } = await api.get(`/appointments?startDate=${today}&limit=50`);
            setAppointments(data.appointments);
            return data.appointments;
        } catch (err) {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const [history, setHistory] = useState([]);

    const fetchHistory = async (pNumber) => {
        try {
            const { data: historyData } = await api.get(`/appointments/history/${pNumber}`);
            const validHistory = historyData.filter(h => h.id !== selectedId);

            // Enrich with diagnoses
            const enriched = await Promise.all(validHistory.map(async h => {
                try {
                    const { data: pRes } = await api.get(`/prescriptions?appointmentId=${h.id}`);
                    return { ...h, diagnosis: pRes.prescriptions?.[0]?.diagnosis || 'No prescription recorded' };
                } catch { return { ...h, diagnosis: 'N/A' }; }
            }));
            setHistory(enriched);
        } catch (err) { console.error('History load failed'); }
    };

    const handleSelect = async (appt) => {
        setSelectedId(appt.id);
        setIsEditing(false);
        fetchHistory(appt.patientNumber);
        if (appt.status === 'completed') {
            try {
                const { data } = await api.get(`/prescriptions?appointmentId=${appt.id}`);
                if (data.prescriptions && data.prescriptions.length > 0) {
                    const p = data.prescriptions[0];
                    setSelectedPrescription(p);
                    setForm({
                        patient: p.patient || { name: appt.patientName, age: appt.age, gender: appt.gender, phone: appt.phone },
                        diagnosis: p.diagnosis || '',
                        medicines: p.medicines || [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
                        followUpDate: p.followUpDate || '',
                        notes: p.notes || '',
                        appointmentId: appt.id,
                        vitals: p.vitals || { bloodPressure: appt.bloodPressure, bodyTemperature: appt.bodyTemperature, weight: appt.weight, height: appt.height }
                    });
                }
            } catch (err) {
                toast.error('Failed to load prescription');
            }
        } else {
            setSelectedPrescription(null);
            setForm({
                patient: { name: appt.patientName, age: appt.age || '', gender: appt.gender || 'Male', phone: appt.phone || '' },
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
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedPrescription) {
                await api.put(`/prescriptions/${selectedPrescription._id}`, form);
                toast.success('Prescription updated');
            } else {
                await api.post('/prescriptions', form);
                toast.success('Diagnosis completed');
            }
            const freshAppts = await fetchData();
            const updatedAppt = freshAppts.find(a => a.id === form.appointmentId);
            if (updatedAppt) handleSelect(updatedAppt);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save');
        }
    };

    const addMedicine = () => setForm(prev => ({
        ...prev, medicines: [...prev.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const filteredAppointments = appointments.filter(a =>
        a.patientName.toLowerCase().includes(search.toLowerCase()) ||
        a.patientNumber.toLowerCase().includes(search.toLowerCase())
    );

    const selectedAppt = appointments.find(a => a.id === selectedId);

    return (
        <div className="page-container fade-in" style={{ maxWidth: '1400px' }}>
            <div className="page-header">
                <div><h1 className="page-title">💊 Clinical Diagnosis</h1><p className="page-subtitle">Examine patients and issue prescriptions</p></div>
            </div>

            <div className="split-layout">
                {/* Left Sidebar: Patient List */}
                <div className="split-sidebar">
                    <div className="split-sidebar-header">
                        <div style={{ position: 'relative' }}>
                            <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                placeholder="Search patients..."
                                style={{ paddingLeft: '32px', height: '36px' }}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="split-sidebar-content">
                        {filteredAppointments.length === 0 ? (
                            <div className="empty-state"><p>No patients today</p></div>
                        ) : filteredAppointments.map(a => (
                            <div
                                key={a.id}
                                className={`patient-card ${selectedId === a.id ? 'active' : ''}`}
                                onClick={() => handleSelect(a)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: selectedId === a.id ? 'var(--accent)' : 'var(--text-primary)' }}>{a.patientName}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.patientNumber}</div>
                                    </div>
                                    <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                        {a.status === 'completed' ? 'Diagnosed' : 'Pending'}
                                    </span>
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <span><FiClock size={10} /> {a.appointmentTime}</span>
                                    <span>{a.age}y | {a.gender}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Detail/Form */}
                <div className="split-main">
                    {!selectedId ? (
                        <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <FiUser size={48} style={{ color: 'var(--border-strong)', marginBottom: '16px' }} />
                            <h3>Select a patient to begin diagnosis</h3>
                            <p>Pick a patient from the left sidebar to view vitals or write a prescription.</p>
                        </div>
                    ) : (
                        <div className="split-main-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{selectedAppt?.patientName}</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>{selectedAppt?.patientNumber} | {selectedAppt?.purposeOfVisit}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedPrescription && !isEditing && (
                                        <>
                                            <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                                                <FiEdit2 /> Edit
                                            </button>
                                            <button className="btn btn-primary" onClick={() => triggerPrint(selectedPrescription)}>
                                                <FiPrinter /> Print
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ gap: '20px', marginBottom: '32px' }}>
                                <div className="card" style={{ background: 'var(--bg-elevated)' }}>
                                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity color="var(--accent)" /> Clinical Vitals</h4>
                                    <div className="grid grid-4">
                                        <div><label>BP</label><div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedAppt?.bloodPressure || '—'}</div></div>
                                        <div><label>Temp</label><div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedAppt?.bodyTemperature ? `${selectedAppt.bodyTemperature}°F` : '—'}</div></div>
                                        <div><label>Weight</label><div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedAppt?.weight ? `${selectedAppt.weight}kg` : '—'}</div></div>
                                        <div><label>Height</label><div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedAppt?.height ? `${selectedAppt.height}cm` : '—'}</div></div>
                                    </div>
                                </div>
                                <div className="card" style={{ background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiClock color="var(--accent)" /> Medical History</h4>
                                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '120px' }}>
                                        {history.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>First time visiting</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {history.map(h => (
                                                    <div key={h.id} style={{ fontSize: '11px', borderLeft: '2px solid var(--border)', paddingLeft: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <div style={{ fontWeight: 600 }}>{new Date(h.appointmentDate).toLocaleDateString()}</div>
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>BP: {h.bloodPressure}</div>
                                                        </div>
                                                        <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}><strong>Dx:</strong> {h.diagnosis}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedPrescription && !isEditing ? (
                                <div className="fade-in">
                                    <div className="card" style={{ marginBottom: '20px' }}>
                                        <h4 style={{ marginBottom: '12px' }}>Diagnosis</h4>
                                        <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{selectedPrescription.diagnosis || 'No diagnosis recorded'}</p>
                                    </div>
                                    <h4 style={{ marginBottom: '12px' }}>Prescribed Medicines</h4>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Instructions</th></tr>
                                            </thead>
                                            <tbody>
                                                {selectedPrescription.medicines?.map((m, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{m.medicineName}</strong></td>
                                                        <td>{m.dosage}</td>
                                                        <td>{m.frequency}</td>
                                                        <td>{m.instructions}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {selectedPrescription.notes && (
                                        <div className="card" style={{ marginTop: '20px' }}>
                                            <h4 style={{ marginBottom: '8px' }}>Notes</h4>
                                            <p style={{ color: 'var(--text-secondary)' }}>{selectedPrescription.notes}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="fade-in">
                                    <div className="form-group">
                                        <label className="form-label">Diagnosis / Impression *</label>
                                        <textarea
                                            className="form-input"
                                            rows="3"
                                            style={{ resize: 'none' }}
                                            value={form.diagnosis}
                                            onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                                            required
                                            placeholder="Enter clinical findings..."
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' }}>
                                        <h4 style={{ margin: 0 }}>Medications</h4>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicine}>+ Add Medicine</button>
                                    </div>

                                    {form.medicines.map((med, i) => (
                                        <div key={i} className="form-row form-row-4" style={{ marginBottom: '12px', alignItems: 'end', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Medicine *</label>
                                                <input className="form-input" value={med.medicineName} onChange={e => {
                                                    const n = [...form.medicines]; n[i].medicineName = e.target.value; setForm({ ...form, medicines: n });
                                                }} placeholder="e.g. Paracetamol" required />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Dosage</label>
                                                <input className="form-input" value={med.dosage} onChange={e => {
                                                    const n = [...form.medicines]; n[i].dosage = e.target.value; setForm({ ...form, medicines: n });
                                                }} placeholder="e.g. 500mg" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Frequency</label>
                                                <input className="form-input" value={med.frequency} onChange={e => {
                                                    const n = [...form.medicines]; n[i].frequency = e.target.value; setForm({ ...form, medicines: n });
                                                }} placeholder="e.g. 1-0-1" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <button type="button" className="btn btn-danger btn-icon" onClick={() => setForm({ ...form, medicines: form.medicines.filter((_, idx) => idx !== i) })}>
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="form-row form-row-2" style={{ marginTop: '24px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Follow-up Date</label>
                                            <input type="date" className="form-input" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Clinical Notes</label>
                                            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional instructions..." />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        {isEditing && <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>}
                                        <button type="submit" className="btn btn-primary btn-lg" style={{ padding: '0 40px' }}>
                                            {selectedPrescription ? 'Update Prescription' : 'Complete Diagnosis'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden component for printing */}
            <div style={{ display: 'none' }}>
                <PrescriptionPrint ref={componentRef} data={printData} />
            </div>
        </div>
    );
}
