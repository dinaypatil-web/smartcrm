import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCalendar, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function EntitiesList() {
    const [entities, setEntities] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        entityName: '', entityCode: '', entityType: 'All',
        address: '', city: '', state: '', phone: '', email: '', gstin: '',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: '', maxUsers: 10, notes: ''
    });

    const fetchEntities = async () => {
        try {
            const { data } = await api.get('/entities', { params: { search, page, limit: 15 } });
            setEntities(data.entities);
            setTotal(data.total);
        } catch (err) {
            toast.error('Failed to load entities');
        }
    };

    useEffect(() => { fetchEntities(); }, [page, search]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showModal && entities.length > 0) {
                if (e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    openEdit(entities[0]);
                }
                if (e.key === 'Delete' && entities[0].isActive) {
                    e.preventDefault();
                    handleDelete(entities[0]._id);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, entities]);

    const resetForm = () => {
        setForm({
            entityName: '', entityCode: '', entityType: 'All',
            address: '', city: '', state: '', phone: '', email: '', gstin: '',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: '', maxUsers: 10, notes: ''
        });
        setEditing(null);
    };

    const openEdit = (entity) => {
        setEditing(entity._id);
        setForm({
            entityName: entity.entityName,
            entityCode: entity.entityCode,
            entityType: entity.entityType,
            address: entity.address || '',
            city: entity.city || '',
            state: entity.state || '',
            phone: entity.phone || '',
            email: entity.email || '',
            gstin: entity.gstin || '',
            validFrom: entity.validFrom?.split('T')[0] || '',
            validTo: entity.validTo?.split('T')[0] || '',
            maxUsers: entity.maxUsers || 10,
            notes: entity.notes || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/entities/${editing}`, form);
                toast.success('Entity updated');
            } else {
                await api.post('/entities', form);
                toast.success('Entity created');
            }
            setShowModal(false);
            resetForm();
            fetchEntities();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save entity');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deactivate this entity? All its users will also be deactivated.')) return;
        try {
            await api.delete(`/entities/${id}`);
            toast.success('Entity deactivated');
            fetchEntities();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to deactivate');
        }
    };

    const isExpired = (validTo) => validTo && new Date(validTo) < new Date();
    const daysLeft = (validTo) => {
        if (!validTo) return null;
        const d = Math.ceil((new Date(validTo) - new Date()) / (1000 * 60 * 60 * 24));
        return d;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>🏢 Entity Management</h1>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FiPlus /> New Entity
                </button>
            </div>

            <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
                <FiSearch />
                <input
                    type="text" placeholder="Search by name, code, or city..."
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Entity</th>
                            <th>Code</th>
                            <th>Type</th>
                            <th>City</th>
                            <th>Validity</th>
                            <th>Users</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entities.length === 0 ? (
                            <tr><td colSpan="8" className="empty-state">No entities found. Create your first entity.</td></tr>
                        ) : entities.map(entity => (
                            <tr key={entity._id}>
                                <td><strong>{entity.entityName}</strong></td>
                                <td><code>{entity.entityCode}</code></td>
                                <td>{entity.entityType}</td>
                                <td>{entity.city || '—'}</td>
                                <td>
                                    <div style={{ fontSize: '0.82rem' }}>
                                        {entity.validFrom?.split('T')[0]} → {entity.validTo?.split('T')[0]}
                                    </div>
                                    {daysLeft(entity.validTo) !== null && (
                                        <span className={`badge ${daysLeft(entity.validTo) <= 0 ? 'badge-danger' : daysLeft(entity.validTo) <= 30 ? 'badge-warning' : 'badge-success'}`}>
                                            {daysLeft(entity.validTo) <= 0 ? 'Expired' : `${daysLeft(entity.validTo)} days left`}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <FiUsers style={{ marginRight: 4 }} />
                                    {entity.userCount || 0} / {entity.maxUsers}
                                </td>
                                <td>
                                    {entity.isActive && !isExpired(entity.validTo) ? (
                                        <span className="badge badge-success"><FiCheckCircle /> Active</span>
                                    ) : (
                                        <span className="badge badge-danger"><FiXCircle /> Inactive</span>
                                    )}
                                </td>
                                <td>
                                    <button className="btn btn-sm" onClick={() => openEdit(entity)} title="Edit"><FiEdit2 /></button>
                                    {entity.isActive && (
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(entity._id)} title="Deactivate"><FiTrash2 /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {total > 15 && (
                <div className="pagination">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                    <span>Page {page} of {Math.ceil(total / 15)}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}>Next</button>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <h2>{editing ? 'Edit Entity' : 'Create New Entity'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Entity Name *</label>
                                    <input type="text" value={form.entityName} onChange={(e) => setForm({ ...form, entityName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Entity Code *</label>
                                    <input type="text" value={form.entityCode} onChange={(e) => setForm({ ...form, entityCode: e.target.value.toUpperCase() })} required placeholder="e.g. CLINIC01" />
                                </div>
                                <div className="form-group">
                                    <label>Entity Type *</label>
                                    <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}>
                                        <option>Clinic</option><option>Store</option><option>Manufacturing</option><option>All</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Max Users</label>
                                    <input type="number" min="1" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) || 10 })} />
                                </div>
                                <div className="form-group">
                                    <label><FiCalendar /> Valid From *</label>
                                    <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label><FiCalendar /> Valid To *</label>
                                    <input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Address</label>
                                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>City</label>
                                    <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>State</label>
                                    <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>GSTIN</label>
                                    <input type="text" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Entity</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
