const purchases = [
    { purchaseNumber: 'P1', purchaseDate: { seconds: 1771632000, nanoseconds: 0 } }, // Newer (Feb 2026)
    { purchaseNumber: 'P2', purchaseDate: '2025-01-01' }, // Older
    { purchaseNumber: 'P3', purchaseDate: new Date('2026-01-01') } // Middle
];

console.log('Original:', purchases.map(p => p.purchaseNumber));

purchases.sort((a, b) => {
    const dateA = a.purchaseDate && a.purchaseDate.seconds ? a.purchaseDate.seconds * 1000 : new Date(a.purchaseDate).getTime();
    const dateB = b.purchaseDate && b.purchaseDate.seconds ? b.purchaseDate.seconds * 1000 : new Date(b.purchaseDate).getTime();
    return dateB - dateA;
});

console.log('Sorted (Desc):', purchases.map(p => p.purchaseNumber));

if (purchases[0].purchaseNumber === 'P1' && purchases[1].purchaseNumber === 'P3' && purchases[2].purchaseNumber === 'P2') {
    console.log('✅ Sorting works correctly!');
} else {
    console.log('❌ Sorting failed!');
    process.exit(1);
}
