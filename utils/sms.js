// utils/sms.js
const africastalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox'
});

const sms = africastalking.SMS;

const sendTicketSMS = async (phone, ticketData) => {
    try {
        // Format phone number
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '254' + phone.substring(1);
        }
        
        const message = `🎟️ TICKET CONFIRMATION\n\n` +
                       `Event: ${ticketData.eventName}\n` +
                       `Receipt: ${ticketData.receiptNumber}\n` +
                       `Tickets: ${ticketData.tickets}\n` +
                       `Amount: KES ${ticketData.amount}\n\n` +
                       `Show this message at the entrance.\n` +
                       `View ticket: ${process.env.FRONTEND_URL}/ticket/${ticketData.receiptNumber}`;
        
        console.log(`📱 Sending SMS to ${formattedPhone}...`);
        
        const response = await sms.send({
            to: [formattedPhone],
            message: message,
            from: 'TicketMaster'
        });
        
        console.log('✅ SMS sent:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('❌ SMS error:', error);
        return { success: false, error: error.message };
    }
};

// Test function
const testSMS = async () => {
    try {
        const response = await sms.send({
            to: ['254708374149'],
            message: 'Test message from TicketMaster',
            from: 'TicketMaster'
        });
        console.log('✅ SMS test successful:', response);
        return true;
    } catch (error) {
        console.error('❌ SMS test failed:', error);
        return false;
    }
};

module.exports = { sendTicketSMS, testSMS };