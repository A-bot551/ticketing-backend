// test-email.js
const { sendTicketEmail } = require('./config/email');
const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

async function testEmail() {
    try {
        console.log('🔍 Checking email configuration...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Found' : '❌ Not found');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Found (hidden)' : '❌ Not found');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('❌ Please set EMAIL_USER and EMAIL_PASS in your .env file');
            return;
        }

        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get first event
        const event = await Event.findOne();
        if (!event) {
            console.log('❌ No events found. Please seed events first: node scripts/seed.js');
            return;
        }
        
        console.log('📧 Sending test email to:', 'jamesmathenge154@gmail.com');
        console.log('📅 Event:', event.name);
        
        // Send test email
        const result = await sendTicketEmail({
            name: 'Big Man',
            email: 'jamesmathenge154@gmail.com',
            phone: '254708374149',
            event: event,
            tickets: 2,
            amount: 5000,
            receiptNumber: 'TEST' + Date.now(),
            date: new Date()
        });
        
        console.log('📧 Email result:', result);
        
        if (result.success) {
            console.log('✅ Test email sent successfully! Check your inbox.');
        } else {
            console.log('❌ Email failed:', result.error);
        }
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testEmail();