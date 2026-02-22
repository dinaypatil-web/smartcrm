const bwipjs = require('bwip-js');

/**
 * Generate barcode image as PNG buffer
 */
async function generateBarcode(text, format = 'code128', options = {}) {
    const barcodeOptions = {
        bcid: format,         // Barcode type
        text: text,           // Text to encode
        scale: options.scale || 3,
        height: options.height || 10,
        includetext: true,
        textxalign: 'center',
        ...options
    };

    try {
        const png = await bwipjs.toBuffer(barcodeOptions);
        return png;
    } catch (error) {
        throw new Error(`Barcode generation failed: ${error.message}`);
    }
}

/**
 * Generate EAN-13 barcode
 */
async function generateEAN13(text, options = {}) {
    return generateBarcode(text, 'ean13', options);
}

/**
 * Generate Code-128 barcode
 */
async function generateCode128(text, options = {}) {
    return generateBarcode(text, 'code128', options);
}

/**
 * Generate a unique barcode number
 * Format: AYU + timestamp + random
 */
function generateBarcodeNumber() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AYU${timestamp}${random}`;
}

/**
 * Validate barcode format
 */
function validateBarcode(barcode) {
    if (!barcode || typeof barcode !== 'string') return false;
    if (barcode.length < 3 || barcode.length > 20) return false;
    return /^[A-Za-z0-9]+$/.test(barcode);
}

module.exports = {
    generateBarcode,
    generateEAN13,
    generateCode128,
    generateBarcodeNumber,
    validateBarcode
};
