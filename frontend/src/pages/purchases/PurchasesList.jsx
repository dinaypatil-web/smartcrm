import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function PurchasesList() {
    const { user: currentUser } = useAuth();
    const canManage = currentUser?.role === 'admin' || currentUser?.role === 'developer';
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [form, setForm] = useState({
        supplier: { name: '', gstin: '', phone: '' },
        items: [{ item: '', quantity: 1, grossPrice: 0, discount: 0, saleDiscount: 0, gstPercentage: 0, mrp: 0, sellingPrice: 0, batchNumber: '', expiryDate: '' }],
        paymentMode: 'Cash', paymentStatus: 'Paid', invoiceNumber: '', notes: '', purchaseDate: new Date().toISOString().split('T')[0],
        billUrl: '', billFile: null,
        freight: 0, packingForwarding: 0
    });
    const [itemOptions, setItemOptions] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');

    const fetchPurchases = async () => {
        try {
            const { data } = await api.get(`/purchases?page=${page}&limit=20`);
            setPurchases(data.purchases);
            setTotalPages(data.pages);
        } catch (err) { toast.error('Failed to load purchases'); }
        finally { setLoading(false); }
    };

    const fetchItems = async () => {
        try {
            const { data } = await api.get('/items?limit=500');
            setItemOptions(data.items);
        } catch (err) { /* */ }
    };

    useEffect(() => { fetchPurchases(); fetchItems(); }, [page]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Insert' && showModal) {
                e.preventDefault();
                addRow();
            }
            // List View Shortcuts (when modal is closed)
            if (!showModal && purchases.length > 0) {
                if (e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    openEdit(purchases[0]); // Targets first item
                }
                if (e.key === 'Delete' && canManage) {
                    e.preventDefault();
                    handleDelete(purchases[0].id || purchases[0]._id);
                }
                if (e.key.toLowerCase() === 'p' && purchases[0].billUrl) {
                    e.preventDefault();
                    window.open(`${api.defaults.baseURL}${purchases[0].billUrl}`, '_blank');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, purchases, canManage]);

    const handleBarcodeScan = async (e) => {
        if (e.key === 'Enter' && barcodeInput) {
            try {
                const { data: item } = await api.get(`/items/barcode/${barcodeInput}`);
                const newItem = {
                    item: item._id,
                    quantity: 1,
                    grossPrice: item.purchasePrice || 0,
                    discount: 0,
                    saleDiscount: item.fixedDiscount?.percentage || 0,
                    gstPercentage: item.gstPercentage || 0,
                    mrp: item.mrp || 0,
                    sellingPrice: item.sellingPrice || 0,
                    batchNumber: '',
                    expiryDate: '',
                    _itemData: item
                };
                setForm(prev => ({ ...prev, items: [...prev.items.filter(i => i.item), newItem] }));
                setBarcodeInput('');
                toast.success(`Added: ${item.itemName}`);
            } catch (err) { toast.error('Item not found for barcode'); }
        }
    };

    // Real-time Landed Cost Calculation
    const calculateTotals = () => {
        // totalBaseValue = sum of (unitBaseValue * quantity)
        const totalBaseValue = form.items.reduce((acc, i) => {
            const unitBase = i.grossPrice - (i.grossPrice * i.discount / 100);
            return acc + (unitBase * i.quantity);
        }, 0);

        const totalCharges = (Number(form.freight) || 0) + (Number(form.packingForwarding) || 0);

        const itemsWithExtras = form.items.map(i => {
            const unitBase = i.grossPrice - (i.grossPrice * i.discount / 100);
            const totalItemBase = unitBase * i.quantity;

            // High precision distribution
            const allocation = totalBaseValue > 0 ? (totalItemBase / totalBaseValue) * totalCharges : 0;
            const landedPrice = unitBase + (allocation / i.quantity);

            // GST calculated on the line total landed cost
            const lineLandedTotal = landedPrice * i.quantity;
            const lineGST = (lineLandedTotal * i.gstPercentage / 100);
            const netAmount = lineLandedTotal + lineGST;
            const netPrice = netAmount / i.quantity;

            return { ...i, landedPrice, netPrice, netAmount };
        });

        const grandTotal = itemsWithExtras.reduce((acc, i) => acc + (i.netAmount || 0), 0);
        return { itemsWithExtras, grandTotal };
    };

    const { itemsWithExtras, grandTotal } = calculateTotals();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let billUrl = form.billUrl;
            if (form.billFile) {
                const formData = new FormData();
                formData.append('bill', form.billFile);
                const { data: uploadRes } = await api.post('/purchases/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                billUrl = uploadRes.fileUrl;
            }

            const items = form.items.filter(i => i.item).map(({ _itemData, ...rest }) => ({
                ...rest,
                quantity: Number(rest.quantity) || 0,
                grossPrice: Number(rest.grossPrice) || 0,
                discount: Number(rest.discount) || 0,
                gstPercentage: Number(rest.gstPercentage) || 0,
                mrp: Number(rest.mrp) || 0,
                sellingPrice: Number(rest.sellingPrice) || 0,
                saleDiscount: Number(rest.saleDiscount) || 0
            }));
            const payload = { ...form, items, billUrl };
            delete payload.billFile;

            if (isEditing) {
                await api.put(`/purchases/${editId}`, payload);
                toast.success('Purchase updated! All Item Master prices updated.');
            } else {
                await api.post('/purchases', payload);
                toast.success('Purchase created! All Item Master prices updated.');
            }
            setShowModal(false);
            setIsEditing(false);
            setEditId(null);
            setForm({
                supplier: { name: '', gstin: '', phone: '' },
                items: [{ item: '', quantity: 1, grossPrice: 0, discount: 0, saleDiscount: 0, gstPercentage: 0, mrp: 0, sellingPrice: 0, batchNumber: '', expiryDate: '' }],
                paymentMode: 'Cash', paymentStatus: 'Paid', invoiceNumber: '', notes: '', purchaseDate: new Date().toISOString().split('T')[0],
                billUrl: '', billFile: null,
                freight: 0, packingForwarding: 0
            });
            fetchPurchases();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save purchase'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? Stock will be reversed for all items.')) return;
        try {
            await api.delete(`/purchases/${id}`);
            toast.success('Purchase deleted and stock reverted');
            fetchPurchases();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
    };

    const openCreate = () => {
        setIsEditing(false);
        setEditId(null);
        setForm({
            supplier: { name: '', gstin: '', phone: '' },
            items: [{ item: '', quantity: 1, grossPrice: 0, discount: 0, saleDiscount: 0, gstPercentage: 0, mrp: 0, sellingPrice: 0, batchNumber: '', expiryDate: '' }],
            paymentMode: 'Cash', paymentStatus: 'Paid', invoiceNumber: '', notes: '', purchaseDate: new Date().toISOString().split('T')[0],
            billUrl: '', billFile: null,
            freight: 0, packingForwarding: 0
        });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setIsEditing(true);
        setEditId(p._id);

        let formattedDate = new Date().toISOString().split('T')[0];
        if (p.purchaseDate) {
            try {
                const d = p.purchaseDate && p.purchaseDate.seconds
                    ? new Date(p.purchaseDate.seconds * 1000)
                    : p.purchaseDate._seconds
                        ? new Date(p.purchaseDate._seconds * 1000)
                        : new Date(p.purchaseDate);
                if (!isNaN(d.getTime())) formattedDate = d.toISOString().split('T')[0];
            } catch (e) { console.error('Date parsing failed', e); }
        }

        setForm({
            supplier: p.supplier || { name: '', gstin: '', phone: '' },
            items: p.items.map(i => ({
                item: i.item, quantity: i.quantity, grossPrice: i.grossPrice || i.unitPrice || 0,
                discount: i.discount || 0,
                saleDiscount: i.saleDiscount || (i.fixedDiscount?.enabled ? i.fixedDiscount.percentage : 0) || 0,
                gstPercentage: i.gstPercentage || 0, mrp: i.mrp || 0,
                sellingPrice: i.sellingPrice || 0,
                batchNumber: i.batchNumber || '', expiryDate: i.expiryDate || ''
            })),
            paymentMode: p.paymentMode || 'Cash',
            paymentStatus: p.paymentStatus || 'Paid',
            invoiceNumber: p.invoiceNumber || '',
            notes: p.notes || '',
            purchaseDate: formattedDate,
            billUrl: p.billUrl || '',
            billFile: null,
            freight: p.freight || 0,
            packingForwarding: p.packingForwarding || 0
        });
        setShowModal(true);
    };

    const addRow = () => setForm(prev => ({ ...prev, items: [...prev.items, { item: '', quantity: 1, grossPrice: 0, discount: 0, saleDiscount: 0, gstPercentage: 0, mrp: 0, sellingPrice: 0, batchNumber: '', expiryDate: '' }] }));
    const removeRow = (i) => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));


    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div><h1 className="page-title">🛍️ Purchases</h1><p className="page-subtitle">Advanced Purchase Entry (Pricing updates Item Master)</p></div>
                <button className="btn btn-primary" onClick={openCreate}>+ New Purchase</button>
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Purchase #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Grand Total</th><th>Bill</th><th>Payment</th>{canManage && <th>Actions</th>}</tr></thead>
                    <tbody>
                        {purchases.length === 0 ? (
                            <tr><td colSpan={canManage ? "8" : "7"}><div className="empty-state"><p>No purchases yet</p></div></td></tr>
                        ) : purchases.map(p => (
                            <tr key={p._id}>
                                <td><code style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.purchaseNumber}</code></td>
                                <td>{(() => {
                                    const d = p.purchaseDate && p.purchaseDate.seconds
                                        ? new Date(p.purchaseDate.seconds * 1000)
                                        : p.purchaseDate._seconds
                                            ? new Date(p.purchaseDate._seconds * 1000)
                                            : new Date(p.purchaseDate);
                                    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-IN');
                                })()}</td>
                                <td>{p.supplier?.name}</td>
                                <td>{p.items?.length} items</td>
                                <td><strong>₹{p.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                                <td>{p.billUrl ? <a href={`${api.defaults.baseURL}${p.billUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '12px' }}>📄 View Bill</a> : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>}</td>
                                <td><span className={`badge ${p.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{p.paymentStatus}</span></td>
                                {canManage && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p.id || p._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
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

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{isEditing ? 'Edit Purchase Entry' : 'New Purchase Entry'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-4">
                                <div className="form-group"><label className="form-label">Purchase Date *</label>
                                    <input type="date" className="form-input" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Supplier Name *</label>
                                    <input className="form-input" value={form.supplier.name} onChange={e => setForm({ ...form, supplier: { ...form.supplier, name: e.target.value } })} required /></div>
                                <div className="form-group"><label className="form-label">Payment Mode</label>
                                    <select className="form-select" value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                                        <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option><option>Credit</option>
                                    </select></div>
                                <div className="form-group"><label className="form-label">Invoice Number</label>
                                    <input className="form-input" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
                            </div>

                            <div className="form-row form-row-3" style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                                <div className="form-group"><label className="form-label">Freight</label>
                                    <input type="number" className="form-input" value={form.freight} onChange={e => setForm({ ...form, freight: +e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Packing & Forwarding</label>
                                    <input type="number" className="form-input" value={form.packingForwarding} onChange={e => setForm({ ...form, packingForwarding: +e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Attach Bill</label>
                                    <input type="file" className="form-input" accept="image/*,.pdf" onChange={e => setForm({ ...form, billFile: e.target.files[0] })} />
                                    {form.billUrl && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current: <a href={`${api.defaults.baseURL}${form.billUrl}`} target="_blank" rel="noreferrer">View</a></span>}
                                </div>
                            </div>

                            <div className="barcode-input-container">
                                <input value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} placeholder="📷 Scan barcode or type and press Enter..." autoFocus />
                                <span className="scan-icon">📷</span>
                            </div>

                            <div className="table-container" style={{ marginBottom: '16px', maxHeight: '400px' }}>
                                <table>
                                    <thead><tr><th style={{ minWidth: '180px' }}>Item</th><th>Qty</th><th>Gross</th><th>Disc%</th><th>Landed</th><th>GST%</th><th>MRP</th><th>Sale Price</th><th>Sale Disc%</th><th>Net Price</th><th>Net Amt</th><th>Batch</th><th>Expiry</th><th></th></tr></thead>
                                    <tbody>
                                        {itemsWithExtras.map((row, i) => (
                                            <tr key={i}>
                                                <td><select className="form-select" value={row.item} onChange={e => {
                                                    const item = itemOptions.find(o => o._id === e.target.value);
                                                    const newItems = [...form.items]; newItems[i] = {
                                                        ...newItems[i],
                                                        item: e.target.value,
                                                        grossPrice: item?.purchasePrice || 0,
                                                        gstPercentage: item?.gstPercentage || 0,
                                                        mrp: item?.mrp || 0,
                                                        sellingPrice: item?.sellingPrice || 0,
                                                        saleDiscount: item?.fixedDiscount?.percentage || 0,
                                                        _itemData: item
                                                    };
                                                    setForm({ ...form, items: newItems });
                                                }} required><option value="">Select Item</option>{itemOptions.map(o => <option key={o._id} value={o._id}>{o.itemName} ({o.itemCode})</option>)}</select></td>
                                                <td><input type="number" className="form-input" value={row.quantity} onChange={e => { const newItems = [...form.items]; newItems[i].quantity = +e.target.value; setForm({ ...form, items: newItems }); }} min="1" style={{ width: '60px' }} /></td>
                                                <td><input type="number" className="form-input" value={row.grossPrice} onChange={e => { const newItems = [...form.items]; newItems[i].grossPrice = +e.target.value; setForm({ ...form, items: newItems }); }} min="0" step="0.01" style={{ width: '80px' }} /></td>
                                                <td><input type="number" className="form-input" value={row.discount} onChange={e => { const newItems = [...form.items]; newItems[i].discount = +e.target.value; setForm({ ...form, items: newItems }); }} min="0" max="100" step="0.001" style={{ width: '50px' }} /></td>
                                                <td style={{ fontSize: '12px', fontWeight: 600 }}>₹{row.landedPrice?.toFixed(2)}</td>
                                                <td><select className="form-select" value={row.gstPercentage} onChange={e => { const newItems = [...form.items]; newItems[i].gstPercentage = +e.target.value; setForm({ ...form, items: newItems }); }} style={{ width: '70px' }}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></td>
                                                <td><input type="number" className="form-input" value={row.mrp} onChange={e => { const newItems = [...form.items]; newItems[i].mrp = +e.target.value; setForm({ ...form, items: newItems }); }} min="0" step="0.01" style={{ width: '80px' }} /></td>
                                                <td><input type="number" className="form-input" value={row.sellingPrice} onChange={e => { const newItems = [...form.items]; newItems[i].sellingPrice = +e.target.value; setForm({ ...form, items: newItems }); }} min="0" step="0.01" style={{ width: '80px' }} /></td>
                                                <td><input type="number" className="form-input" value={row.saleDiscount} onChange={e => { const newItems = [...form.items]; newItems[i].saleDiscount = +e.target.value; setForm({ ...form, items: newItems }); }} min="0" max="100" step="0.001" style={{ width: '50px' }} /></td>
                                                <td style={{ fontSize: '12px', fontWeight: 600 }}>₹{row.netPrice?.toFixed(2)}</td>
                                                <td style={{ fontSize: '12px', fontWeight: 700 }}>₹{row.netAmount?.toFixed(2)}</td>
                                                <td><input className="form-input" value={row.batchNumber} onChange={e => { const newItems = [...form.items]; newItems[i].batchNumber = e.target.value; setForm({ ...form, items: newItems }); }} placeholder="Batch" style={{ width: '80px' }} /></td>
                                                <td><input type="date" className="form-input" value={row.expiryDate} onChange={e => { const newItems = [...form.items]; newItems[i].expiryDate = e.target.value; setForm({ ...form, items: newItems }); }} style={{ width: '130px' }} /></td>
                                                <td><button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(i)}>×</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginBottom: '16px' }}>+ Add Row</button>

                            <div className="form-group"><label className="form-label">Internal Notes</label>
                                <textarea className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" /></div>

                            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Grand Total:</span><br /><strong style={{ fontSize: '24px', color: 'var(--primary)' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Purchase Entry</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
