import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiDownload, FiUpload, FiPackage, FiSearch, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function ItemsList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({
        itemName: '', itemCode: '', barcodeNumber: '', itemType: 'Finished Medicine',
        category: '', hsnCode: '', lowStockLevel: 10, openingStock: 0,
        openingStockEntries: [],
        unitOfMeasure: 'Nos', batchEnabled: false, manufacturer: '', description: ''
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const fileInputRef = useRef(null);

    const fetchItems = async () => {
        try {
            const { data } = await api.get(`/items?search=${search}&page=${page}&limit=20`);
            setItems(data.items);
            setTotalPages(data.pages);
        } catch (err) {
            toast.error('Failed to load items');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchItems(); }, [search, page]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showModal && items.length > 0) {
                if (e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    openEdit(items[0]);
                }
                if (e.key === 'Delete') {
                    e.preventDefault();
                    handleDelete(items[0]._id);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Pricing fields will be handled by Purchase entries
            const payload = {
                ...form,
                purchasePrice: editItem?.purchasePrice || 0,
                mrp: editItem?.mrp || 0,
                sellingPrice: editItem?.sellingPrice || 0,
                gstPercentage: editItem?.gstPercentage || 0,
                fixedDiscount: editItem?.fixedDiscount || { enabled: false, percentage: 0 }
            };

            if (editItem) {
                await api.put(`/items/${editItem._id}`, payload);
                toast.success('Item updated');
            } else {
                await api.post('/items', payload);
                toast.success('Item created');
            }
            setShowModal(false);
            setEditItem(null);
            resetForm();
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save item');
        }
    };

    const handleDownloadSample = async () => {
        try {
            const response = await api.get('/items/sample-excel', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'item_master_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error('Failed to download sample');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const { data } = await api.post('/items/upload-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(`Upload complete! Created: ${data.results.created}, Updated: ${data.results.updated}`);
            if (data.results.errors.length > 0) {
                console.error('Upload errors:', data.results.errors);
                toast.error(`${data.results.errors.length} items failed to upload. Check console.`);
            }
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const resetForm = () => {
        setForm({
            itemName: '', itemCode: '', barcodeNumber: '', itemType: 'Finished Medicine',
            category: '', hsnCode: '', lowStockLevel: 10, openingStock: 0,
            openingStockEntries: [],
            unitOfMeasure: 'Nos', batchEnabled: false, manufacturer: '', description: ''
        });
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({
            itemName: item.itemName,
            itemCode: item.itemCode,
            barcodeNumber: item.barcodeNumber || '',
            itemType: item.itemType,
            category: item.category,
            hsnCode: item.hsnCode || '',
            lowStockLevel: item.lowStockLevel,
            openingStock: item.openingStock || 0,
            openingStockEntries: item.openingStockEntries || [],
            unitOfMeasure: item.unitOfMeasure,
            batchEnabled: item.batchEnabled,
            manufacturer: item.manufacturer || '',
            description: item.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deactivate this item?')) return;
        try {
            await api.delete(`/items/${id}`);
            toast.success('Item deactivated');
            fetchItems();
        } catch (err) { toast.error('Failed to delete'); }
    };

    const handleAddOpeningRow = () => {
        setForm(prev => ({
            ...prev,
            openingStockEntries: [
                ...prev.openingStockEntries,
                {
                    quantity: 0, landedPrice: 0, mrp: 0, sellingPrice: 0, salesDiscount: 0,
                    gstPercentage: 0, netPrice: 0, netAmount: 0, batchNumber: '', expiryDate: ''
                }
            ]
        }));
    };

    const handleRemoveOpeningRow = (index) => {
        setForm(prev => ({
            ...prev,
            openingStockEntries: prev.openingStockEntries.filter((_, i) => i !== index)
        }));
    };

    const updateOpeningRow = (index, field, value) => {
        setForm(prev => {
            const newEntries = [...prev.openingStockEntries];
            newEntries[index] = { ...newEntries[index], [field]: value };

            // Auto-calculations
            const entry = newEntries[index];
            if (field === 'landedPrice' || field === 'gstPercentage' || field === 'quantity') {
                const landed = Number(entry.landedPrice) || 0;
                const gst = Number(entry.gstPercentage) || 0;
                const qty = Number(entry.quantity) || 0;

                const netPrice = landed + (landed * gst / 100);
                entry.netPrice = parseFloat(netPrice.toFixed(2));
                entry.netAmount = parseFloat((netPrice * qty).toFixed(2));
            }

            return { ...prev, openingStockEntries: newEntries };
        });
    };

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title"><FiPackage /> Item Master</h1>
                    <p className="page-subtitle">Manage item details (Prices updated from Purchases)</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={handleDownloadSample} title="Download Excel Template">
                        <FiDownload /> Template
                    </button>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()} title="Upload Item Master Excel">
                        <FiUpload /> Upload
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    <button className="btn btn-primary" onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}>
                        <FiPlus /> Add Item
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="search-box">
                    <span className="search-icon"><FiSearch /></span>
                    <input className="form-input" placeholder="Search by name, code, or barcode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '40px' }} />
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Item</th><th>Code</th><th>Barcode</th><th>Type</th><th>Category</th>
                            <th>Price</th><th>MRP</th><th>GST%</th><th>Opening</th><th>Stock</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="10"><div className="empty-state"><p>No items found</p></div></td></tr>
                        ) : items.map(item => (
                            <tr key={item._id}>
                                <td><strong>{item.itemName}</strong></td>
                                <td><code style={{ color: 'var(--primary-light)' }}>{item.itemCode}</code></td>
                                <td><code>{item.barcodeNumber || '—'}</code></td>
                                <td><span className={`badge ${item.itemType === 'Raw Material' ? 'badge-warning' : item.itemType === 'Both' ? 'badge-purple' : 'badge-success'}`}>{item.itemType}</span></td>
                                <td>{item.category}</td>
                                <td>₹{item.sellingPrice}</td>
                                <td>₹{item.mrp}</td>
                                <td>{item.gstPercentage}%</td>
                                <td>{item.openingStock || 0}</td>
                                <td>
                                    <span style={{ color: item.currentStock <= item.lowStockLevel ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                                        {item.currentStock} {item.unitOfMeasure}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} style={{ marginRight: '6px' }} title="Edit"><FiEdit2 /></button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item._id)} title="Deactivate"><FiTrash2 /></button>
                                </td>
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
                            <h3 className="modal-title">{editItem ? 'Edit Item Details' : 'Add New Item'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Item Name *</label>
                                    <input className="form-input" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Item Code *</label>
                                    <input className="form-input" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Barcode</label>
                                    <input className="form-input" value={form.barcodeNumber} onChange={e => setForm({ ...form, barcodeNumber: e.target.value })} placeholder="Auto-generated if empty" />
                                </div>
                            </div>
                            <div className="form-row form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Item Type *</label>
                                    <select className="form-select" value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}>
                                        <option>Raw Material</option><option>Finished Medicine</option><option>Both</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">HSN Code</label>
                                    <input className="form-input" value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Manufacturer</label>
                                    <input className="form-input" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit of Measure</label>
                                    <input className="form-input" value={form.unitOfMeasure} onChange={e => setForm({ ...form, unitOfMeasure: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Low Stock Level</label>
                                    <input type="number" className="form-input" value={form.lowStockLevel} onChange={e => setForm({ ...form, lowStockLevel: +e.target.value })} min="0" />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                                    <label className="form-checkbox">
                                        <input type="checkbox" checked={form.batchEnabled} onChange={e => setForm({ ...form, batchEnabled: e.target.checked })} />
                                        <span>Batch Tracking Enabled</span>
                                    </label>
                                </div>
                            </div>

                            {!editItem && (
                                <div className="opening-stock-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary-light)' }}>Opening Stock Details</h4>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOpeningRow}>
                                            <FiPlus /> Add Batch Row
                                        </button>
                                    </div>

                                    {form.openingStockEntries.length > 0 && (
                                        <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                            <table className="table-sm" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ padding: '8px' }}>Qty</th>
                                                        <th style={{ padding: '8px' }}>Landed Price</th>
                                                        <th style={{ padding: '8px' }}>GST%</th>
                                                        <th style={{ padding: '8px' }}>Net Price</th>
                                                        <th style={{ padding: '8px' }}>Net Amt</th>
                                                        <th style={{ padding: '8px' }}>MRP</th>
                                                        <th style={{ padding: '8px' }}>Sale Price</th>
                                                        <th style={{ padding: '8px' }}>Batch</th>
                                                        <th style={{ padding: '8px' }}>Expiry</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {form.openingStockEntries.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ width: '90px' }}><input type="number" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.quantity} onChange={e => updateOpeningRow(idx, 'quantity', e.target.value)} /></td>
                                                            <td style={{ width: '110px' }}><input type="number" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.landedPrice} onChange={e => updateOpeningRow(idx, 'landedPrice', e.target.value)} /></td>
                                                            <td style={{ width: '80px' }}><input type="number" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.gstPercentage} onChange={e => updateOpeningRow(idx, 'gstPercentage', e.target.value)} /></td>
                                                            <td style={{ fontSize: '12px', fontWeight: 600 }}>₹{row.netPrice}</td>
                                                            <td style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>₹{row.netAmount}</td>
                                                            <td style={{ width: '100px' }}><input type="number" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.mrp} onChange={e => updateOpeningRow(idx, 'mrp', e.target.value)} /></td>
                                                            <td style={{ width: '100px' }}><input type="number" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.sellingPrice} onChange={e => updateOpeningRow(idx, 'sellingPrice', e.target.value)} /></td>
                                                            <td style={{ width: '120px' }}><input className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.batchNumber} onChange={e => updateOpeningRow(idx, 'batchNumber', e.target.value)} placeholder="Batch" /></td>
                                                            <td style={{ width: '150px' }}><input type="date" className="form-input" style={{ height: '36px', padding: '4px 8px' }} value={row.expiryDate} onChange={e => updateOpeningRow(idx, 'expiryDate', e.target.value)} /></td>
                                                            <td><button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => handleRemoveOpeningRow(idx)}>×</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {form.openingStockEntries.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '4px' }}>
                                            No opening stock rows added.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2" />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editItem ? 'Update Item' : 'Create Item'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
