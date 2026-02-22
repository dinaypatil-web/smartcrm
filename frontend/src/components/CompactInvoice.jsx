import React, { forwardRef } from 'react';

const CompactInvoice = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            // Handle Firestore Timestamp or ISO string
            const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return 'N/A';
        }
    };

    // Calculate dynamic totals and GST breakup
    const items = data.items || [];
    const gstBreakup = items.reduce((acc, item) => {
        const rate = item.gstPercentage || 0;
        if (!acc[rate]) acc[rate] = { taxable: 0, gst: 0 };
        const taxable = item.taxableAmount || (item.unitPrice * item.quantity) - ((item.unitPrice * item.quantity * (item.discount || 0)) / 100);
        const gst = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
        acc[rate].taxable += taxable;
        acc[rate].gst += gst;
        return acc;
    }, {});

    const subtotal = data.subtotal || 0;
    const totalGST = data.totalGST || 0;
    const totalDiscount = data.totalDiscount || 0;
    const billDiscountAmt = data.billDiscount?.amount || 0;
    const itemDiscount = totalDiscount - billDiscountAmt;

    // Ensure grandTotal is never negative in the display unless it truly is
    const grandTotal = data.grandTotal || (subtotal - billDiscountAmt + totalGST);
    const grossTotal = data.grossTotal || (subtotal + itemDiscount);

    return (
        <div ref={ref} style={{
            width: '80mm',
            padding: '5mm',
            background: '#fff',
            color: '#000',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '10px',
            lineHeight: '1.2'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
                <h2 style={{ margin: '0', fontSize: '14px', color: '#000', fontWeight: '900' }}>SMART CRM</h2>
                <p style={{ margin: '2px 0', color: '#000' }}>Ayurveda ERP Solutions</p>
                <p style={{ margin: '1px 0', fontSize: '9px', color: '#000' }}>GSTIN: 27AAAAA0000A1Z5</p>
            </div>

            {/* Invoice Info */}
            <div style={{ margin: '5px 0', fontSize: '9px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inv: {data.invoiceNumber || 'NEW'}</span>
                    <span>Date: {formatDate(data.saleDate)}</span>
                </div>
                <div style={{ marginTop: '2px' }}>
                    <span>Cust: {data.customer?.name || 'Walk-in Customer'}</span>
                    {data.customer?.phone && <span> ({data.customer.phone})</span>}
                </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '5px 0' }}>
                <thead>
                    <tr style={{ borderBottom: '1px dashed #000', borderTop: '1px dashed #000' }}>
                        <th style={{ textAlign: 'left', padding: '2px 0', color: '#000' }}>Item</th>
                        <th style={{ textAlign: 'right', padding: '2px 0', color: '#000' }}>Taxable</th>
                        <th style={{ textAlign: 'right', padding: '2px 0', color: '#000' }}>GST%</th>
                        <th style={{ textAlign: 'right', padding: '2px 0', color: '#000' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ padding: '2px 0', verticalAlign: 'top' }}>
                                <div style={{ color: '#000', fontWeight: 'bold' }}>{item.itemName}</div>
                                <div style={{ fontSize: '8px', color: '#000' }}>{item.quantity} x {item.unitPrice}</div>
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '2px 0', color: '#000' }}>
                                {(item.taxableAmount || (item.unitPrice * item.quantity)).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '2px 0', color: '#000' }}>
                                {item.gstPercentage}%
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '2px 0', color: '#000' }}>
                                {(item.totalAmount || item.totalWithGST || 0).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* GST Summary Split */}
            <div style={{ margin: '5px 0', padding: '4px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '8.5px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>GST Summary:</div>
                <table style={{ width: '100%' }}>
                    <thead>
                        <tr style={{ fontSize: '7.5px' }}>
                            <th style={{ textAlign: 'left' }}>Rate</th>
                            <th style={{ textAlign: 'right' }}>Taxable</th>
                            <th style={{ textAlign: 'right' }}>GST</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(gstBreakup).map(([rate, vals]) => (
                            <tr key={rate}>
                                <td>GST {rate}%</td>
                                <td style={{ textAlign: 'right' }}>₹{vals.taxable.toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>₹{vals.gst.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ textAlign: 'right', color: '#000' }}>
                <p style={{ margin: '1px 0', color: '#000' }}>Gross Items Total: ₹{grossTotal.toFixed(2)}</p>
                <p style={{ margin: '1px 0', color: '#000' }}>Item Discount (Fixed): -₹{itemDiscount.toFixed(2)}</p>
                {billDiscountAmt > 0 && <p style={{ margin: '1px 0', color: '#000' }}>Bill Discount (Var): -₹{billDiscountAmt.toFixed(2)}</p>}
                <p style={{ margin: '1px 0', color: '#000' }}>GST: ₹{totalGST.toFixed(2)}</p>
                <h3 style={{ margin: '4px 0', fontSize: '12px', color: '#000', fontWeight: '900' }}>GRAND TOTAL: ₹{grandTotal.toFixed(2)}</h3>
            </div>

            <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

            <div style={{ textAlign: 'center', marginTop: '8px', color: '#000' }}>
                <p style={{ margin: '1px 0', color: '#000' }}>Mode: {data.paymentMode || 'N/A'}</p>
                <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#000' }}>Thank You! Visit Again</p>
            </div>

            <style>{`
                @media print {
                    @page { 
                        size: 80mm auto;
                        margin: 0; 
                    }
                    body { 
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .compact-invoice { 
                        width: 100% !important; 
                        margin: 0 !important;
                        padding: 2mm !important;
                        color: #000 !important;
                    }
                    * {
                        color: #000 !important;
                        border-color: #000 !important;
                    }
                }
            `}</style>
        </div>
    );
});

export default CompactInvoice;
