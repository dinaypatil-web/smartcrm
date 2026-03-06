import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { FiSearch, FiShoppingCart } from 'react-icons/fi';
import './POSTerminal.css';
import CompactInvoice from '../../components/CompactInvoice';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiCamera, FiX } from 'react-icons/fi';

export default function POSTerminal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [billDiscountValue, setBillDiscountValue] = useState(0);
    const [billDiscountType, setBillDiscountType] = useState('percentage'); // or 'amount'
    const [processing, setProcessing] = useState(false);
    const [lastInvoice, setLastInvoice] = useState(null);

    // Search Modal States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);

    const barcodeRef = useRef(null);
    const searchRef = useRef(null);
    const invoiceRef = useRef(null);

    const handlePrint = useReactToPrint({
        content: () => invoiceRef.current,
        onAfterPrint: () => barcodeRef.current?.focus()
    });

    useEffect(() => {
        barcodeRef.current?.focus();
        if (id) fetchSale(id);
    }, [id]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Insert') {
                e.preventDefault();
                barcodeRef.current?.focus();
            }
            if (e.key.toLowerCase() === 'p' && lastInvoice) {
                e.preventDefault();
                handlePrint();
            }
            // Toggle Search with 'f' or 'F' when barcode is focused
            if (e.key.toLowerCase() === 'f' && !isSearchOpen && document.activeElement === barcodeRef.current) {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // Navigate search results
            if (isSearchOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % searchResults.length);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
                }
                if (e.key === 'Enter' && searchResults[selectedIndex]) {
                    e.preventDefault();
                    addToCart(searchResults[selectedIndex]);
                    setIsSearchOpen(false);
                }
                if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lastInvoice, isSearchOpen, searchResults, selectedIndex]);

    useEffect(() => {
        if (isSearchOpen) {
            searchRef.current?.focus();
            setSearchQuery('');
            setSearchResults([]);
            setSelectedIndex(0);
        } else {
            barcodeRef.current?.focus();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const performSearch = async () => {
        setSearching(true);
        try {
            const { data } = await api.get(`/items?search=${searchQuery}&limit=10`);
            setSearchResults(data.items || []);
            setSelectedIndex(0);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const fetchSale = async (saleId) => {
        try {
            const { data } = await api.get(`/sales/${saleId}`);
            setCustomer(data.customer || { name: '', phone: '' });
            setPaymentMode(data.paymentMode || 'Cash');
            setBillDiscountValue(data.billDiscount?.value || 0);
            setBillDiscountType(data.billDiscount?.type || 'percentage');

            // Map backend items to frontend cart items
            const cartItems = await Promise.all(data.items.map(async (i) => {
                const { data: item } = await api.get(`/items/${i.item}`);
                return {
                    item,
                    quantity: i.quantity,
                    discount: i.discount || 0
                };
            }));
            setCart(cartItems);
            setLastInvoice(data);
        } catch (err) {
            toast.error('Failed to load sale data');
            navigate('/sales');
        }
    };

    const handleBarcodeScan = async (e) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            processBarcode(barcodeInput.trim());
        }
    };

    const processBarcode = async (code) => {
        if (!code) return;
        try {
            const { data: item } = await api.get(`/items/barcode/${code}`);
            addToCart(item);
            setBarcodeInput('');
        } catch (err) {
            toast.error('Item not found!');
            setBarcodeInput('');
        }
        barcodeRef.current?.focus();
    };

    // Camera Scanner Logic
    useEffect(() => {
        let scanner = null;
        if (showScanner) {
            scanner = new Html5QrcodeScanner('reader', {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
                formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] // Supports all barcode formats
            });

            scanner.render((decodedText) => {
                processBarcode(decodedText);
                setShowScanner(false);
                scanner.clear();
            }, (error) => {
                // Ignore scan errors for better UX
            });
        }
        return () => {
            if (scanner) {
                scanner.clear().catch(err => console.error("Scanner clear failed", err));
            }
        };
    }, [showScanner]);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(c => c.item._id === item._id);
            if (existing) {
                if (existing.quantity + 1 > item.currentStock) {
                    toast.error(`Only ${item.currentStock} in stock!`);
                    return prev;
                }
                return prev.map(c => c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            if (item.currentStock < 1) {
                toast.error('Out of stock!');
                return prev;
            }
            const discount = item.fixedDiscount?.enabled ? item.fixedDiscount.percentage : 0;
            return [...prev, { item, quantity: 1, discount, variableDiscount: 0 }];
        });
        toast.success(`${item.itemName} added`, { duration: 1000 });
    };

    const updateQty = (itemId, delta) => {
        setCart(prev => prev.map(c => {
            if (c.item._id !== itemId) return c;
            const newQty = c.quantity + delta;
            if (newQty < 1) return c;
            // Optimization: If editing, the current stock in the item object is AFTER the previous sale deduction.
            // However, the backend PUT route reverts stock first, so we should be okay with basic check or fetching fresh stock.
            // For now, let's keep it simple.
            if (newQty > c.item.currentStock + (id ? cart.find(x => x.item._id === itemId)?.quantity || 0 : 0)) {
                toast.error('Not enough stock!');
                return c;
            }
            return { ...c, quantity: newQty };
        }));
    };

    const removeFromCart = (itemId) => setCart(prev => prev.filter(c => c.item._id !== itemId));

    const calcItemTotal = (c) => {
        const gross = c.item.sellingPrice * c.quantity;
        const disc = c.discount || 0;
        const afterDisc = gross - (gross * disc / 100);
        const gst = afterDisc * c.item.gstPercentage / 100;
        return { gross, discAmt: gross * disc / 100, afterDisc, gst, total: afterDisc + gst };
    };

    const grossTotal = cart.reduce((s, c) => s + (c.item.sellingPrice * c.quantity), 0);
    const itemDiscountTotal = cart.reduce((s, c) => s + (c.item.sellingPrice * c.quantity * (c.discount || 0) / 100), 0);
    const taxableAfterItemDisc = grossTotal - itemDiscountTotal;

    const billDiscountAmount = billDiscountType === 'percentage'
        ? (taxableAfterItemDisc * billDiscountValue / 100)
        : billDiscountValue;

    const netTaxable = taxableAfterItemDisc - billDiscountAmount;

    // GST is calculated on net taxable value
    const totalGST = cart.reduce((s, c) => {
        const itemTaxable = (c.item.sellingPrice * c.quantity) - (c.item.sellingPrice * c.quantity * (c.discount || 0) / 100);
        const itemBillDisc = taxableAfterItemDisc > 0 ? (itemTaxable / taxableAfterItemDisc) * billDiscountAmount : 0;
        const itemNetTaxable = itemTaxable - itemBillDisc;
        return s + (itemNetTaxable * c.item.gstPercentage / 100);
    }, 0);

    const grandTotal = netTaxable + totalGST;

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty!');
        setProcessing(true);
        try {
            const items = cart.map(c => ({
                item: c.item._id,
                quantity: c.quantity,
                expiryDate: c.item.expiryDate
            }));
            const salePayload = {
                customer: customer.name ? customer : undefined,
                items,
                paymentMode,
                billDiscountValue,
                billDiscountType
            };

            const { data } = id
                ? await api.put(`/sales/${id}`, salePayload)
                : await api.post('/sales', salePayload);

            setLastInvoice(data);
            toast.success(id ? 'Sale updated!' : `Sale complete! Invoice: ${data.invoiceNumber}`);

            if (!id) {
                setCart([]);
                setCustomer({ name: '', phone: '' });
                setBillDiscountValue(0);
            }

            // Trigger print automatically
            setTimeout(() => {
                handlePrint();
            }, 500);

            if (id) {
                setTimeout(() => navigate('/sales'), 2000);
            }

        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed');
        } finally { setProcessing(false); }
    };

    const canEditDiscount = user?.role === 'developer' || user?.role === 'admin' || user?.permissions?.variableDiscount;

    return (
        <div>
            {/* Hidden Invoice Component for Printing */}
            <div style={{ display: 'none' }}>
                <CompactInvoice ref={invoiceRef} data={lastInvoice} />
            </div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{id ? '📝 Edit Sale' : '🛒 POS Billing'}</h1>
                    <p className="page-subtitle">{id ? `Updating Invoice: ${lastInvoice?.invoiceNumber}` : 'Scan barcode to start billing'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {id && <button className="btn btn-secondary" onClick={() => navigate('/sales')}>Cancel</button>}
                    {lastInvoice && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>Last: {lastInvoice.invoiceNumber}</span>
                            <button className="btn btn-primary btn-sm" onClick={handlePrint} title="Reprint Last Invoice">🖨️ Reprint</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pos-layout">
                <div className="pos-scanner">
                    <div className="barcode-input-container">
                        <input ref={barcodeRef} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} placeholder="📷 Scan barcode or type item barcode... (Press 'F' to search)" autoFocus />
                        <button className="scan-icon-btn" onClick={() => setShowScanner(true)} title="Open Camera Scanner">
                            <FiCamera />
                        </button>
                        <button
                            className="search-shortcut-btn"
                            onClick={() => setIsSearchOpen(true)}
                            title="Search Item (F)"
                            style={{
                                position: 'absolute',
                                right: '44px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent)',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <FiSearch />
                        </button>
                    </div>

                    <div className="card" style={{ marginTop: '16px' }}>
                        <h3 className="card-title" style={{ marginBottom: '12px' }}>📋 Cart Items</h3>
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Disc%</th><th>GST%</th><th>Total</th><th></th></tr></thead>
                                <tbody>
                                    {cart.length === 0 ? (
                                        <tr><td colSpan="7"><div className="empty-state" style={{ padding: '30px' }}><div className="empty-icon">📷</div><h3>Scan a barcode to start</h3></div></td></tr>
                                    ) : cart.map(c => {
                                        const t = calcItemTotal(c);
                                        return (
                                            <tr key={c.item._id}>
                                                <td><strong>{c.item.itemName}</strong><br /><small style={{ color: 'var(--text-muted)' }}>{c.item.barcodeNumber}</small></td>
                                                <td>₹{c.item.sellingPrice}</td>
                                                <td>
                                                    <div className="pos-cart-item-qty">
                                                        <button onClick={() => updateQty(c.item._id, -1)}>−</button>
                                                        <span>{c.quantity}</span>
                                                        <button onClick={() => updateQty(c.item._id, 1)}>+</button>
                                                    </div>
                                                </td>
                                                <td>{c.discount || 0}%</td>
                                                <td>{c.item.gstPercentage}%</td>
                                                <td><strong>₹{t.total.toFixed(2)}</strong></td>
                                                <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => removeFromCart(c.item._id)}>×</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="pos-cart">
                    <div className="pos-cart-header">
                        <h3 style={{ fontWeight: 700 }}>🧾 Bill Summary</h3>
                        <span className="badge badge-info">{cart.length} items</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Scrollable middle section */}
                        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label className="form-label">Customer Name</label>
                                <input className="form-input" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Walk-in Customer" />
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="Optional" />
                            </div>

                            <hr style={{ margin: '12px 0', borderColor: 'var(--border-color)', opacity: 0.1 }} />

                            <div className="form-group" style={{ marginBottom: '4px' }}>
                                <label className="form-label">Variable Bill Discount</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={billDiscountValue}
                                        onChange={e => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                                        disabled={!canEditDiscount}
                                        min="0"
                                        step="0.001"
                                        placeholder="0"
                                        style={{ height: '32px' }}
                                    />
                                    <select
                                        className="form-select"
                                        style={{ width: '80px', height: '32px' }}
                                        value={billDiscountType}
                                        onChange={e => setBillDiscountType(e.target.value)}
                                        disabled={!canEditDiscount}
                                    >
                                        <option value="percentage">%</option>
                                        <option value="amount">₹</option>
                                    </select>
                                </div>
                                {!canEditDiscount && <small style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>Permission required</small>}
                            </div>
                        </div>

                        {/* Fixed bottom summary section */}
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                            <div className="pos-summary-row" style={{ padding: '2px 0' }}><span>Gross Items Total</span><span>₹{grossTotal.toFixed(2)}</span></div>
                            <div className="pos-summary-row" style={{ padding: '2px 0' }}><span>Item Discount (Fixed)</span><span style={{ color: 'var(--success)' }}>-₹{itemDiscountTotal.toFixed(2)}</span></div>
                            <div className="pos-summary-row" style={{ padding: '2px 0' }}><span>Bill Discount (Var)</span><span style={{ color: 'var(--success)', fontWeight: 600 }}>-₹{billDiscountAmount.toFixed(2)}</span></div>
                            <div className="pos-summary-row" style={{ padding: '2px 0' }}><span>Taxable Amount</span><span>₹{netTaxable.toFixed(2)}</span></div>
                            <div className="pos-summary-row" style={{ padding: '2px 0' }}><span>GST</span><span>₹{totalGST.toFixed(2)}</span></div>
                            <div className="pos-summary-row total" style={{ marginTop: '8px', paddingTop: '8px' }}><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>

                    <div className="pos-cart-footer" style={{ padding: '12px 16px' }}>
                        <label className="form-label" style={{ marginBottom: '4px' }}>Payment Mode</label>
                        <div className="pos-payment-modes" style={{ marginBottom: '12px' }}>
                            {['Cash', 'Card', 'UPI', 'Bank Transfer'].map(m => (
                                <button key={m} type="button" className={`pos-payment-btn ${paymentMode === m ? 'active' : ''}`} onClick={() => setPaymentMode(m)}>{m}</button>
                            ))}
                        </div>
                        <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={handleCheckout} disabled={processing || cart.length === 0}>
                            {processing ? 'Processing...' : (id ? `🔄 Update Sale — ₹${grandTotal.toFixed(2)}` : `✅ Complete Sale — ₹${grandTotal.toFixed(2)}`)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Item Search Modal */}
            {isSearchOpen && (
                <div className="search-modal-overlay" onClick={() => setIsSearchOpen(false)}>
                    <div className="search-modal" onClick={e => e.stopPropagation()}>
                        <div className="search-modal-header">
                            <h3 style={{ margin: 0 }}>🔍 Search Items</h3>
                            <div className="search-modal-input-container">
                                <FiSearch />
                                <input
                                    ref={searchRef}
                                    className="search-modal-input"
                                    placeholder="Type item name, code, or brand..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="search-results-list">
                            {searching ? (
                                <div className="p-4 text-center">Searching...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-muted">
                                    {searchQuery.length < 2 ? 'Type at least 2 characters...' : 'No items found'}
                                </div>
                            ) : (
                                searchResults.map((item, index) => (
                                    <div
                                        key={item._id}
                                        className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        onClick={() => {
                                            addToCart(item);
                                            setIsSearchOpen(false);
                                        }}
                                    >
                                        <div className="search-result-info">
                                            <div className="search-result-name">{item.itemName}</div>
                                            <div className="search-result-meta">
                                                <span>Code: {item.itemCode}</span>
                                                <span>•</span>
                                                <span>Stock: {item.currentStock || 0}</span>
                                            </div>
                                        </div>
                                        <div className="search-result-price">₹{item.sellingPrice}</div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="search-modal-footer">
                            <div className="search-shortcut-hint">
                                <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Close
                            </div>
                            <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                {searchResults.length} items found
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Camera Scanner Modal */}
            {showScanner && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <div className="scanner-header">
                            <h3>📷 Camera Scanner</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}><FiX /></button>
                        </div>
                        <div id="reader" className="scanner-viewfinder"></div>
                        <div className="scanner-footer">
                            <p>Point camera at the barcode</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
