import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ProductionList() {
    const [productions, setProductions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [items, setItems] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [form, setForm] = useState({
        finishedProduct: '', quantityProduced: 1,
        rawMaterials: [{ rawMaterial: '', quantity: 1 }],
        expiryDate: '', notes: ''
    });

    useEffect(() => {
        const fetch = async () => {
            // ... (fetch logic remains same)
        };
        fetch();
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Insert' && showModal) {
                e.preventDefault();
                addMaterial();
            }
            if (!showModal && productions.length > 0) {
                if (e.key.toLowerCase() === 'e') {
                    // No edit view for production yet, but adding shortcut placeholder or mapping to view if exist
                    // toast.info('Edit production not yet implemented');
                }
                if (e.key === 'Delete') {
                    e.preventDefault();
                    // handleDelete(productions[0]._id);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, productions]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/production', form);
            toast.success('Production batch created! Stock updated.');
            setShowModal(false);
            const { data } = await api.get('/production?limit=50');
            setProductions(data.productions);
        } catch (err) { toast.error(err.response?.data?.error || 'Production failed'); }
    };

    const addMaterial = () => setForm(prev => ({ ...prev, rawMaterials: [...prev.rawMaterials, { rawMaterial: '', quantity: 1 }] }));

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">🏭 Production</h1><p className="page-subtitle">Manufacturing batches</p></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Batch</button>
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Batch ID</th><th>Product</th><th>Qty</th><th>Date</th><th>Status</th><th>Materials</th></tr></thead>
                    <tbody>
                        {productions.length === 0 ? (
                            <tr><td colSpan="6"><div className="empty-state"><p>No production batches</p></div></td></tr>
                        ) : productions.map(p => (
                            <tr key={p._id}>
                                <td><code style={{ color: 'var(--primary-light)' }}>{p.batchId}</code></td>
                                <td><strong>{p.productName || p.finishedProduct?.itemName}</strong></td>
                                <td>{p.quantityProduced}</td>
                                <td>{new Date(p.productionDate).toLocaleDateString('en-IN')}</td>
                                <td><span className={`badge ${p.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                                <td>{p.rawMaterials?.length} materials</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">New Production Batch</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-2">
                                <div className="form-group"><label className="form-label">Finished Product *</label>
                                    <select className="form-select" value={form.finishedProduct} onChange={e => setForm({ ...form, finishedProduct: e.target.value })} required>
                                        <option value="">Select product...</option>
                                        {items.map(i => <option key={i._id} value={i._id}>{i.itemName} ({i.itemCode})</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Quantity to Produce *</label>
                                    <input type="number" className="form-input" value={form.quantityProduced} onChange={e => setForm({ ...form, quantityProduced: +e.target.value })} min="1" required /></div>
                            </div>

                            <h4 style={{ margin: '16px 0 8px' }}>Raw Materials (per unit)</h4>
                            {form.rawMaterials.map((mat, i) => (
                                <div key={i} className="form-row form-row-3" style={{ marginBottom: '8px' }}>
                                    <div className="form-group"><select className="form-select" value={mat.rawMaterial} onChange={e => {
                                        const n = [...form.rawMaterials]; n[i].rawMaterial = e.target.value; setForm({ ...form, rawMaterials: n });
                                    }}><option value="">Select raw material...</option>{rawMaterials.map(r => <option key={r._id} value={r._id}>{r.itemName} (Stock: {r.currentStock})</option>)}</select></div>
                                    <div className="form-group"><input type="number" className="form-input" value={mat.quantity} min="0.01" step="0.01" onChange={e => {
                                        const n = [...form.rawMaterials]; n[i].quantity = +e.target.value; setForm({ ...form, rawMaterials: n });
                                    }} placeholder="Qty per unit" /></div>
                                    <div className="form-group"><button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, rawMaterials: form.rawMaterials.filter((_, idx) => idx !== i) })}>Remove</button></div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addMaterial}>+ Add Material</button>

                            <div className="form-row form-row-2" style={{ marginTop: '16px' }}>
                                <div className="form-group"><label className="form-label">Expiry Date</label>
                                    <input type="date" className="form-input" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Notes</label>
                                    <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Batch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
