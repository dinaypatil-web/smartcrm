const XLSX = require('xlsx');

const ITEM_COLUMNS = [
    { label: 'Item Name *', key: 'itemName' },
    { label: 'Item Code *', key: 'itemCode' },
    { label: 'Barcode', key: 'barcodeNumber' },
    { label: 'Type (Raw Material/Finished Medicine/Both) *', key: 'itemType' },
    { label: 'Category *', key: 'category' },
    { label: 'HSN Code', key: 'hsnCode' },
    { label: 'GST %', key: 'gstPercentage' },
    { label: 'Purchase Price *', key: 'purchasePrice' },
    { label: 'MRP *', key: 'mrp' },
    { label: 'Selling Price *', key: 'sellingPrice' },
    { label: 'Low Stock Level', key: 'lowStockLevel' },
    { label: 'Unit', key: 'unitOfMeasure' },
    { label: 'Manufacturer', key: 'manufacturer' },
    { label: 'Description', key: 'description' }
];

/**
 * Generates a sample Excel buffer for Item Master
 */
const generateSampleExcel = () => {
    const data = [
        {
            'Item Name *': 'Sample Herb 1',
            'Item Code *': 'HERB001',
            'Barcode': '123456789',
            'Type (Raw Material/Finished Medicine/Both) *': 'Raw Material',
            'Category *': 'Herbal',
            'HSN Code': '1211',
            'GST %': 5,
            'Purchase Price *': 100,
            'MRP *': 200,
            'Selling Price *': 180,
            'Low Stock Level': 10,
            'Unit': 'Kg',
            'Manufacturer': 'Nature Bio',
            'Description': 'Fresh dried leaves'
        },
        {
            'Item Name *': 'Medicine A',
            'Item Code *': 'MED001',
            'Barcode': '987654321',
            'Type (Raw Material/Finished Medicine/Both) *': 'Finished Medicine',
            'Category *': 'Tablets',
            'HSN Code': '3004',
            'GST %': 12,
            'Purchase Price *': 50,
            'MRP *': 100,
            'Selling Price *': 90,
            'Low Stock Level': 100,
            'Unit': 'Box',
            'Manufacturer': 'PharmaCo',
            'Description': '10 tablets per strip'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');

    // Set column widths
    const colWidths = ITEM_COLUMNS.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Parses Item Excel buffer into JSON data
 */
const parseItemExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    return rawData.map(row => {
        const item = {};
        ITEM_COLUMNS.forEach(col => {
            let value = row[col.label];

            // Type conversion
            if (col.key === 'gstPercentage' || col.key === 'purchasePrice' || col.key === 'mrp' || col.key === 'sellingPrice' || col.key === 'lowStockLevel') {
                value = value !== undefined ? parseFloat(value) : 0;
            }

            item[col.key] = value;
        });
        return item;
    });
};

module.exports = {
    generateSampleExcel,
    parseItemExcel,
    ITEM_COLUMNS
};
