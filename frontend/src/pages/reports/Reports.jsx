import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
    const [reportType, setReportType] = useState('stock');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            let res;
            switch (reportType) {
                case 'stock':
                    res = await api.get(`/reports/stock?year=${year}&month=${month}`);
                    setData(res.data);
                    break;
                case 'sales':
                    res = await api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);
                    setData(res.data);
                    break;
                case 'purchases':
                    res = await api.get(`/reports/purchases?startDate=${startDate}&endDate=${endDate}`);
                    setData(res.data);
                    break;
                case 'valuation':
                    res = await api.get('/inventory/valuation');
                    setData(res.data);
                    break;
                case 'patientHistory':
                    if (!search) {
                        toast.error('Please enter patient name or number');
                        setLoading(false);
                        return;
                    }
                    // Try to find by name first, then by number
                    let q = `/appointments?patientName=${search}&limit=1`;
                    if (search.startsWith('PAT-')) {
                        q = `/appointments?patientNumber=${search}&limit=1`;
                    }

                    const { data: apptRes } = await api.get(q);
                    if (!apptRes || !apptRes.appointments || apptRes.appointments.length === 0) {
                        toast.error('Patient not found');
                        setLoading(false);
                        return;
                    }
                    const patient = apptRes.appointments[0];
                    const pNumber = patient.patientNumber;
                    res = await api.get(`/appointments/history/${pNumber}`);
                    setData({ history: res.data, patient: patient });
                    break;
            }
        } catch (err) { toast.error('Failed to load report'); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">📈 Reports</h1><p className="page-subtitle">Analytics & stock reports</p></div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Report Type</label>
                        <select className="form-select" value={reportType} onChange={e => { setReportType(e.target.value); setData(null); }}>
                            <option value="stock">Monthly Stock Report</option>
                            <option value="sales">Sales Report</option>
                            <option value="purchases">Purchase Report</option>
                            <option value="valuation">Stock Valuation</option>
                            <option value="patientHistory">Patient History</option>
                        </select>
                    </div>
                    {reportType === 'patientHistory' && (
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Patient Name / Number</label>
                            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." />
                        </div>
                    )}
                    {reportType === 'stock' && <>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Year</label>
                            <input type="number" className="form-input" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Month</label>
                            <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
                            </select>
                        </div>
                    </>}
                    {(reportType === 'sales' || reportType === 'purchases') && <>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Start Date</label>
                            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">End Date</label>
                            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </>}
                    <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : '📊 Generate'}</button>
                </div>
            </div>

            {data && reportType === 'stock' && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: '16px' }}>📦 Monthly Stock Report — {data.year}/{String(data.month).padStart(2, '0')}</h3>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Item</th><th>Barcode</th><th>Category</th><th>Opening</th><th>Purchases</th><th>Sales</th><th>Consumption</th><th>Production</th><th>Closing</th></tr></thead>
                            <tbody>
                                {data.summaries?.map(s => (
                                    <tr key={s.item._id}>
                                        <td><strong>{s.item.itemName}</strong></td>
                                        <td><code>{s.item.barcodeNumber || '—'}</code></td>
                                        <td>{s.item.category}</td>
                                        <td>{s.openingStock}</td>
                                        <td style={{ color: 'var(--success)' }}>+{s.purchases}</td>
                                        <td style={{ color: 'var(--danger)' }}>-{s.sales}</td>
                                        <td style={{ color: 'var(--warning)' }}>-{s.rawMaterialConsumption}</td>
                                        <td style={{ color: 'var(--info)' }}>+{s.production}</td>
                                        <td><strong>{s.closingStock}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {data && (reportType === 'sales' || reportType === 'purchases') && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: '16px' }}>{reportType === 'sales' ? '💰 Sales' : '🛍️ Purchase'} Report</h3>
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data}>
                                <XAxis dataKey="_id" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Bar dataKey={reportType === 'sales' ? 'totalSales' : 'totalPurchases'} fill="#14b8a6" radius={[4, 4, 0, 0]} name="Amount (₹)" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No data for selected period</p></div>}
                </div>
            )}

            {data && reportType === 'valuation' && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: '16px' }}>💰 Stock Valuation</h3>
                    <div className="stats-grid" style={{ marginBottom: '16px' }}>
                        <div className="stat-card"><div className="stat-icon green">💵</div><div className="stat-info"><h3>₹{data.totalCostValue?.toLocaleString('en-IN')}</h3><p>Cost Value</p></div></div>
                        <div className="stat-card"><div className="stat-icon blue">💰</div><div className="stat-info"><h3>₹{data.totalSellingValue?.toLocaleString('en-IN')}</h3><p>Selling Value</p></div></div>
                        <div className="stat-card"><div className="stat-icon purple">🏷️</div><div className="stat-info"><h3>₹{data.totalMRPValue?.toLocaleString('en-IN')}</h3><p>MRP Value</p></div></div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Item</th><th>Barcode</th><th>Stock</th><th>Cost Price</th><th>Cost Value</th><th>Sell Value</th></tr></thead>
                            <tbody>
                                {data.items?.map(v => (
                                    <tr key={v._id}>
                                        <td>{v.itemName}</td>
                                        <td><code>{v.barcodeNumber || '—'}</code></td>
                                        <td>{v.currentStock}</td>
                                        <td>₹{v.purchasePrice}</td>
                                        <td>₹{v.costValue.toLocaleString('en-IN')}</td>
                                        <td>₹{v.sellingValue.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {data && reportType === 'patientHistory' && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: '16px' }}>📝 Patient History: {data.patient?.patientName} ({data.patient?.patientNumber})</h3>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Date</th><th>Purpose</th><th>Vitals</th><th>Diagnosis</th><th>Medicines</th><th>Created By</th></tr></thead>
                            <tbody>
                                {data.history?.map(h => (
                                    <tr key={h.id}>
                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(h.appointmentDate).toLocaleDateString()} {h.appointmentTime}</td>
                                        <td style={{ fontSize: '12px' }}>{h.purposeOfVisit}</td>
                                        <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                            BP: {h.bloodPressure} | Temp: {h.bodyTemperature}°F<br />
                                            Wt: {h.weight}kg | Ht: {h.height}cm
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{h.diagnosis}</td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {h.medicines?.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                                    {h.medicines.map((m, idx) => (
                                                        <li key={idx}>{m.medicineName} ({m.dosage})</li>
                                                    ))}
                                                </ul>
                                            ) : 'None'}
                                        </td>
                                        <td style={{ fontSize: '11px' }}>{h.createdBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
