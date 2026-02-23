import React, { forwardRef } from 'react';

const PrescriptionPrint = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            const d = new Date(date);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <div ref={ref} className="prescription-print" style={{
            padding: '20mm',
            background: '#fff',
            color: '#000',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            lineHeight: '1.5',
            minHeight: '297mm' // A4 Height
        }}>
            {/* Clinic Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary)', paddingBottom: '20px', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '24px', fontWeight: 'bold' }}>SMART CRM CLINIC</h1>
                    <p style={{ margin: '5px 0 0', color: '#666' }}>Ayurveda & Wellness Center</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>Contact: +91 98765 43210 | info@smartcrm.com</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Dr. Ayurveda Expert</div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>BAMS, MD (Ayurveda)</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>Reg No: AY-123456</p>
                </div>
            </div>

            {/* Patient Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #eee' }}>
                <div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#666', fontWeight: 600 }}>Patient:</span>
                        <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: 'bold' }}>{data.patient?.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                        <span><span style={{ color: '#666' }}>Age:</span> {data.patient?.age}</span>
                        <span><span style={{ color: '#666' }}>Gender:</span> {data.patient?.gender}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px' }}>
                    <div><span style={{ color: '#666' }}>ID:</span> {data.patient?.patientNumber || data.patientNumber || 'NEW'}</div>
                    <div><span style={{ color: '#666' }}>Date:</span> {formatDate(data.prescriptionDate || new Date())}</div>
                </div>
            </div>

            {/* Vitals Section */}
            {data.vitals && (
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>Clinical Vitals</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        <div style={{ padding: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Blood Pressure</div>
                            <div style={{ fontWeight: 'bold' }}>{data.vitals.bloodPressure || '—'} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>mmHg</span></div>
                        </div>
                        <div style={{ padding: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Temperature</div>
                            <div style={{ fontWeight: 'bold' }}>{data.vitals.bodyTemperature || '—'} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>°F</span></div>
                        </div>
                        <div style={{ padding: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Weight</div>
                            <div style={{ fontWeight: 'bold' }}>{data.vitals.weight || '—'} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>Kg</span></div>
                        </div>
                        <div style={{ padding: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Height</div>
                            <div style={{ fontWeight: 'bold' }}>{data.vitals.height || '—'} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>cm</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnosis */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>Diagnosis</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>{data.diagnosis || 'No specific diagnosis recorded.'}</p>
            </div>

            {/* Prescription Content */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>Rx (Prescription)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9f9f9' }}>
                            <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Medicine</th>
                            <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Dosage</th>
                            <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Frequency</th>
                            <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.medicines?.map((m, i) => (
                            <tr key={i}>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                    <div style={{ fontWeight: 'bold' }}>{m.medicineName}</div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>{m.instructions}</div>
                                </td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{m.dosage}</td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{m.frequency}</td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{m.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes & Follow up */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px' }}>
                <div>
                    {data.notes && (
                        <>
                            <h4 style={{ margin: '0 0 5px', fontSize: '12px', color: '#666' }}>Notes:</h4>
                            <p style={{ margin: 0, fontSize: '12px' }}>{data.notes}</p>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {data.followUpDate && (
                        <div style={{ padding: '10px', border: '1px dashed var(--primary)', borderRadius: '4px', display: 'inline-block' }}>
                            <span style={{ fontWeight: 600 }}>Next Follow-up:</span> {formatDate(data.followUpDate)}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Signature */}
            <div style={{ marginTop: 'auto', paddingTop: '50px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                <div style={{ height: '60px' }}></div>
                <div style={{ fontWeight: 'bold' }}>Digital Signature</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Dr. Ayurveda Expert</div>
            </div>

            <style>{`
                @media print {
                    @page { 
                        size: A4;
                        margin: 0; 
                    }
                    body { 
                        background: #fff;
                        color: #000;
                    }
                    .prescription-print {
                        width: 100% !important;
                        min-height: 100% !important;
                        padding: 15mm !important;
                    }
                }
            `}</style>
        </div>
    );
});

export default PrescriptionPrint;
