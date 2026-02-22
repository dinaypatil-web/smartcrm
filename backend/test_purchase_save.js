const { PurchaseRepository, ItemRepository, UserRepository } = require('./repositories');
const firebase = require('./config/firebase');

async function testSave() {
    console.log('--- Purchase Save Test ---');
    try {
        // 1. Get an item
        const items = await ItemRepository.findAll();
        if (items.length === 0) {
            console.log('No items found. Create an item first.');
            process.exit(0);
        }
        const item = items[0];
        console.log(`Using item: ${item.itemName} (${item.id})`);

        // 2. Mock purchase data
        const purchaseData = {
            purchaseNumber: 'TEST-' + Date.now(),
            supplier: { name: 'Test Supplier', phone: '1234567890' },
            items: [{
                item: item.id,
                itemName: item.itemName,
                itemCode: item.itemCode,
                quantity: 1,
                unitPrice: 100,
                grossPrice: 100,
                totalAmount: 118,
                gstPercentage: 18,
                landedPrice: 100
            }],
            subtotal: 100,
            totalGST: 18,
            totalDiscount: 0,
            grandTotal: 118,
            paymentMode: 'Cash',
            paymentStatus: 'Paid',
            purchaseDate: new Date()
        };

        console.log('Attempting to create purchase...');
        const result = await PurchaseRepository.create(purchaseData);
        console.log('✅ SUCCESS: Purchase created with ID:', result.id);

        // 3. Verify it exists
        const found = await PurchaseRepository.findById(result.id);
        if (found) {
            console.log('✅ SUCCESS: Purchase found in DB');
        } else {
            console.log('❌ FAILED: Purchase NOT found after creation');
        }

    } catch (err) {
        console.error('❌ FAILED:', err.message);
    }
    process.exit();
}

testSave();
