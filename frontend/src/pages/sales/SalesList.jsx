import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { FiEdit2, FiTrash2, FiPrinter, FiFilter, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import CompactInvoice from '../../components/CompactInvoice';

const SalesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canManage = user?.role === 'admin' || user?.role === 'developer';

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Print State
    const [printData, setPrintData] = useState(null);
    const invoiceRef = useRef(null);

    const handlePrintRequest = (sale) => {
        setPrintData(sale);
        setTimeout(() => handlePrint(), 100);
    };

    const handlePrint = useReactToPrint({
        content: () => invoiceRef.current,
    });

    useEffect(() => {
        fetchSales();
    }, [page, dateRange]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (sales.length > 0) {
                if (e.key.toLowerCase() === 'e' && canManage) {
                    e.preventDefault();
                    navigate(`/pos/${sales[0].id || sales[0]._id}`);
                }
                if (e.key === 'Delete' && canManage) {
                    e.preventDefault();
                    handleDelete(sales[0].id || sales[0]._id);
                }
                if (e.key.toLowerCase() === 'p') {
                    e.preventDefault();
                    handlePrintRequest(sales[0]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sales, canManage, navigate]);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 15,
                customer: searchTerm,
                startDate: dateRange.start,
                endDate: dateRange.end
            };
            const { data } = await api.get('/sales', { params });
            setSales(data.sales);
            setTotalPages(data.pages);
        } catch (err) {
            toast.error('Failed to fetch sales');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this sale? Stock will be reversed.')) return;
        try {
            await api.delete(`/sales/${id}`);
            toast.success('Sale deleted and stock reverted');
            fetchSales();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete sale');
        }
    };

    return (
        <div className="container-fluid">
            {/* Hidden Invoice Component for Printing */}
            <div style={{ display: 'none' }}>
                <CompactInvoice ref={invoiceRef} data={printData} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 className="page-title">📜 Sales History</h1>
            </div>

            {/* Filters */}
            <div className="card mb-4 shadow-sm border-0">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label mb-1 ms-1"><small style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🔍 Search Customer</small></label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0"><FiFilter color="var(--text-muted)" /></span>
                                <input type="text" className="form-control border-start-0 ps-0" style={{ fontSize: '0.9rem' }} placeholder="Ex: John Doe" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && fetchSales()} />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label mb-1 ms-1"><small style={{ fontWeight: 600, color: 'var(--text-muted)' }}>📅 Start Date</small></label>
                            <input type="date" className="form-control" style={{ fontSize: '0.9rem' }} value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label mb-1 ms-1"><small style={{ fontWeight: 600, color: 'var(--text-muted)' }}>📅 End Date</small></label>
                            <input type="date" className="form-control" style={{ fontSize: '0.9rem' }} value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2" onClick={fetchSales} style={{ height: '35px', fontWeight: 600 }}>Apply Filters</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                            <tr>
                                <th className="ps-4">Invoice #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Payment</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : sales.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-5"><div className="text-muted">No sales found matching your criteria.</div></td></tr>
                            ) : sales.map(s => (
                                <tr key={s.id || s._id} style={{ verticalAlign: 'middle' }}>
                                    <td className="ps-4"><code style={{ backgroundColor: 'rgba(52, 115, 230, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{s.invoiceNumber}</code></td>
                                    <td>{new Date(s.saleDate).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{s.customer?.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.customer?.phone}</div>
                                    </td>
                                    <td><span className="badge badge-light" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{s.items?.length} items</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{s.grandTotal?.toFixed(2)}</td>
                                    <td><span className={`badge badge-${s.paymentMode === 'Cash' ? 'success' : 'info'}`} style={{ minWidth: '60px' }}>{s.paymentMode}</span></td>
                                    <td className="text-end pe-4">
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-outline-primary btn-sm btn-icon" title="Print Invoice" onClick={() => handlePrintRequest(s)}>
                                                <FiPrinter />
                                            </button>
                                            {canManage && (
                                                <>
                                                    <button className="btn btn-outline-warning btn-sm btn-icon" title="Edit in POS" onClick={() => navigate(`/pos/${s.id || s._id}`)}>
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="btn btn-outline-danger btn-sm btn-icon" title="Delete Sale" onClick={() => handleDelete(s.id || s._id)}>
                                                        <FiTrash2 />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="d-flex justify-content-between align-items-center mt-4 mb-5 ms-1">
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of <strong>{totalPages}</strong></div>
                <div className="btn-group shadow-sm">
                    <button className="btn btn-white btn-sm px-3" disabled={page === 1} onClick={() => setPage(page - 1)} style={{ fontWeight: 600, border: '1px solid #dee2e6' }}>Prev</button>
                    <button className="btn btn-white btn-sm px-3" disabled={page === totalPages} onClick={() => setPage(page + 1)} style={{ fontWeight: 600, border: '1px solid #dee2e6' }}>Next</button>
                </div>
            </div>
        </div>
    );
};

export default SalesList;
