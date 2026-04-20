// test-qr.js
const QRCode = require('qrcode');

async function testQR() {
    try {
        const data = JSON.stringify({
            receipt: "TEST123",
            event: "Test Event",
            name: "Test User",
            date: "2026-04-20",
            tickets: 2
        });
        
        const qrDataURL = await QRCode.toDataURL(data, {
            width: 250,
            margin: 2
        });
        
        console.log("QR Code generated successfully!");
        console.log("Length:", qrDataURL.length);
        console.log("First 100 chars:", qrDataURL.substring(0, 100));
        
        // Save to file to view
        const fs = require('fs');
        const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync('test-qr.png', base64Data, 'base64');
        console.log("QR Code saved as test-qr.png - check this file!");
        
    } catch (error) {
        console.error("QR Error:", error);
    }
}

testQR();
