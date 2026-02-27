// utils/qrCode.js
const QRCode = require('qrcode');

// Generate QR code as data URL
const generateQRCode = async (data) => {
    try {
        // Create a JSON string with ticket info
        const ticketData = JSON.stringify({
            id: data.receiptNumber,
            event: data.eventName,
            name: data.name,
            date: data.date
        });
        
        // Generate QR code as data URL
        const qrCodeDataURL = await QRCode.toDataURL(ticketData);
        return qrCodeDataURL;
    } catch (error) {
        console.error('QR Code generation error:', error);
        return null;
    }
};

// Generate QR code as buffer (for downloads)
const generateQRCodeBuffer = async (data) => {
    try {
        const ticketData = JSON.stringify(data);
        const buffer = await QRCode.toBuffer(ticketData);
        return buffer;
    } catch (error) {
        console.error('QR Code buffer error:', error);
        return null;
    }
};

module.exports = { generateQRCode, generateQRCodeBuffer };