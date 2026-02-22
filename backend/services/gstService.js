/**
 * GST Calculation Service
 * Handles CGST, SGST, IGST calculations per Indian GST rules
 */

const GST_RATES = [0, 5, 12, 18, 28]; // Standard GST slabs

/**
 * Calculate GST split (CGST + SGST for intra-state, IGST for inter-state)
 */
function calculateGST(amount, gstPercentage, isInterState = false) {
    const taxableAmount = amount;
    const gstAmount = (taxableAmount * gstPercentage) / 100;

    if (isInterState) {
        return {
            taxableAmount,
            cgst: 0,
            sgst: 0,
            igst: parseFloat(gstAmount.toFixed(2)),
            totalGST: parseFloat(gstAmount.toFixed(2)),
            totalWithGST: parseFloat((taxableAmount + gstAmount).toFixed(2))
        };
    }

    const halfGST = gstAmount / 2;
    return {
        taxableAmount,
        cgst: parseFloat(halfGST.toFixed(2)),
        sgst: parseFloat(halfGST.toFixed(2)),
        igst: 0,
        totalGST: parseFloat(gstAmount.toFixed(2)),
        totalWithGST: parseFloat((taxableAmount + gstAmount).toFixed(2))
    };
}

/**
 * Calculate line item totals with discount and GST
 */
function calculateLineItem(unitPrice, quantity, discountPercentage = 0, gstPercentage = 0, isInterState = false) {
    const grossAmount = unitPrice * quantity;
    const discountAmount = (grossAmount * discountPercentage) / 100;
    const taxableAmount = grossAmount - discountAmount;
    const gst = calculateGST(taxableAmount, gstPercentage, isInterState);

    return {
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        ...gst
    };
}

/**
 * Calculate invoice totals from line items
 */
function calculateInvoiceTotals(items) {
    const totals = items.reduce((acc, item) => {
        // Use fallbacks for property mapping mismatches
        const itemGross = (item.unitPrice * item.quantity) || item.grossAmount || 0;
        const itemTaxable = item.taxableAmount || (itemGross - (item.discountAmount || 0));
        const itemGST = item.totalGST || (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
        const itemWithGST = item.totalWithGST || item.totalAmount || (itemTaxable + itemGST);

        acc.grossTotal += itemGross;
        acc.subtotal += itemTaxable;
        acc.totalCGST += item.cgst || 0;
        acc.totalSGST += item.sgst || 0;
        acc.totalIGST += item.igst || 0;
        acc.totalGST += itemGST;
        acc.totalDiscount += item.discountAmount || 0;
        acc.grandTotal += itemWithGST;
        return acc;
    }, {
        grossTotal: 0,
        subtotal: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
        totalGST: 0,
        totalDiscount: 0,
        grandTotal: 0
    });

    // Round all values to 2 decimal places
    Object.keys(totals).forEach(key => {
        totals[key] = parseFloat(totals[key].toFixed(2));
    });

    return totals;
}

/**
 * Calculate landed cost and GST for a purchase line item
 * billCharges: { freight, packingForwarding } - distributed proportionally
 * totalBaseValue: Total sum of (grossPrice - discount) * quantity for the entire bill
 */
function calculateLandedLineItem(grossPrice, quantity, discountPercentage = 0, gstPercentage = 0, billCharges = { freight: 0, packingForwarding: 0 }, totalBaseValue = 0, isInterState = false) {
    // 1. Calculate Unit Base Value (Gross - Discount)
    const unitDiscountAmount = (grossPrice * discountPercentage) / 100;
    const itemBaseValue = grossPrice - unitDiscountAmount;

    // 2. High Precision Allocation
    let allocatedChargesPerUnit = 0;
    if (totalBaseValue > 0) {
        const totalLineBaseValue = itemBaseValue * quantity;
        const totalBillCharges = (Number(billCharges.freight) || 0) + (Number(billCharges.packingForwarding) || 0);

        // Use higher precision for internal calculation to avoid rounding errors when multiplied by quantity
        const lineAllocation = (totalLineBaseValue / totalBaseValue) * totalBillCharges;
        allocatedChargesPerUnit = lineAllocation / quantity;
    }

    const landedPrice = itemBaseValue + allocatedChargesPerUnit;

    // 3. GST calculated on Total Landed Value for the line
    const totalLineLanded = landedPrice * quantity;
    const gstData = calculateGST(totalLineLanded, gstPercentage, isInterState);

    return {
        unitBaseValue: parseFloat(itemBaseValue.toFixed(4)), // Store with more precision for audits
        unitDiscountAmount: parseFloat(unitDiscountAmount.toFixed(4)),
        allocatedChargesPerUnit: parseFloat(allocatedChargesPerUnit.toFixed(6)), // High precision for trace
        landedPrice: parseFloat(landedPrice.toFixed(6)),
        ...gstData,
        netPrice: parseFloat((landedPrice + (gstData.totalGST / quantity)).toFixed(2)),
        netAmount: parseFloat(gstData.totalWithGST.toFixed(2))
    };
}

module.exports = { calculateGST, calculateLineItem, calculateLandedLineItem, calculateInvoiceTotals, GST_RATES };
