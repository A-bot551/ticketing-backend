// test-email.js
const { sendTicketEmail } = require('./config/email');
require('dotenv').config();

async function test() {
    const testEvent = {
        name: "Test Event",
        date: new Date(),
        venue: "Test Venue",
        city: "Nairobi"
    };
    
    const result = await sendTicketEmail({
        name: "Test User",
        email: "jamesmathenge154@gmail.com",
        phone: "254708374149",
        event: testEvent,
        tickets: 2,
        amount: 5000,
        receiptNumber: "TEST" + Date.now(),
        date: new Date()
    });
    
    console.log("Email result:", result);
}

test();