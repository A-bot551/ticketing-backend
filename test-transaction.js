// test-transaction.js
const mongoose = require('mongoose');
require('dotenv').config();

const Transaction = require('./models/Transaction');

console.log('Transaction model type:', typeof Transaction);
console.log('Is Transaction a constructor:', Transaction.prototype ? '✅ Yes' : '❌ No');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        // Try to create a test transaction
        const testTransaction = new Transaction({
            checkoutRequestId: 'test_' + Date.now(),
            reference: 'test_ref_' + Date.now(),
            phone: '254708374149',
            amount: 100,
            eventId: 'test_event',
            status: 'pending'
        });
        
        console.log('✅ Test transaction created:', testTransaction);
        
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    })
    .catch(err => {
        console.error('❌ Error:', err);
    });