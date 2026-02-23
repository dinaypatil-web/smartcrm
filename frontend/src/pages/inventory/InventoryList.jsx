import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function InventoryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [] });
    const [showExpired, setShowExpired] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [invRes, alertsRes] = await Promise.all([
                    api.get(`/inventory?search=${search}&lowStockOnly=${lowStockOnly}&page=${page}&limit=30`),
                    api.get('/inventory/alerts')
                ]);
                setItems(invRes.data.items);
                setTotalPages(invRes.data.pages);
                setAlerts(alertsRes.data);
            } catch (err) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        };
        fetch();
    }, [search, lowStockOnly, page]);

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">📋 Inventory</h1><p className="page-subtitle">Real-time stock levels</p></div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <label className="form-checkbox">
                        <input type="checkbox" checked={lowStockOnly} onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }} />
                        <span style={{ color: lowStockOnly ? 'var(--danger)' : 'var(--text-secondary)' }}>⚠️ Low Stock Only</span>
                    </label>
                    <label className="form-checkbox">
                        <input type="checkbox" checked={showExpired} onChange={e => setShowExpired(e.target.checked)} />
                        <span style={{ color: alerts.expired.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>💀 Expired Batches ({alerts.expired.length})</span>
                    </label>
                </div>
            </div>

            {showExpired && alerts.expired.length > 0 && (
                <div className="card fade-in" style={{ marginBottom: '24px', border: '1px solid var(--danger-muted)', background: 'rgba(255, 82, 82, 0.02)' }}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--danger-muted)' }}>
                        <h3 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ Expired Material Stock</h3>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr style={{ background: 'rgba(255, 82, 82, 0.05)' }}>
                                    <th>Item</th><th>Code</th><th>Batch</th><th>Quantity</th><th>Expired Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.expired.map((b, i) => (
                                    <tr key={i}>
                                        <td><strong>{b.itemName}</strong></td>
                                        <td><code>{b.itemCode}</code></td>
                                        <td><code style={{ color: 'var(--danger)' }}>{b.batchNumber}</code></td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{b.quantity}</td>
                                        <td style={{ color: 'var(--danger)' }}>{new Date(b.expiryDate).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginBottom: '16px' }}>
                <input className="form-input" placeholder="🔍 Search by name, code, or barcode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Item</th><th>Code</th><th>Barcode</th><th>Category</th><th>Opening</th><th>Stock</th><th>Low Level</th><th>Status</th><th>Value</th></tr></thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="8"><div className="empty-state"><p>No items found</p></div></td></tr>
                        ) : items.map(item => {
                            const isLow = item.currentStock <= item.lowStockLevel;
                            return (
                                <tr key={item._id}>
                                    <td><strong>{item.itemName}</strong></td>
                                    <td><code style={{ color: 'var(--primary-light)' }}>{item.itemCode}</code></td>
                                    <td><code>{item.barcodeNumber || '—'}</code></td>
                                    <td>{item.category}</td>
                                    <td>{item.openingStock || 0}</td>
                                    <td style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'var(--success)' }}>{item.currentStock} {item.unitOfMeasure}</td>
                                    <td>{item.lowStockLevel}</td>
                                    <td><span className={`badge ${isLow ? (item.currentStock === 0 ? 'badge-danger' : 'badge-warning') : 'badge-success'}`}>
                                        {item.currentStock === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                    </span></td>
                                    <td>₹{(item.currentStock * item.purchasePrice).toLocaleString('en-IN')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                    <span style={{ color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                </div>
            )}
        </div>
    );
}
