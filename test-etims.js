// At the top of test-etims.js, add this to accept both PIN and TIN
const ETIMS_PIN = process.env.ETIMS_PIN || process.env.ETIMS_TIN;
// test-etims.js
require('dotenv').config();
const { generateTaxInvoice, healthCheck, initializeOsdc, getCodeList } = require('./utils/etims');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(color + message + colors.reset);
}

function logSuccess(message) {
    log('✅ ' + message, colors.green);
}

function logError(message) {
    log('❌ ' + message, colors.red);
}

function logInfo(message) {
    log('ℹ️ ' + message, colors.cyan);
}

function logWarning(message) {
    log('⚠️ ' + message, colors.yellow);
}

async function testETIMS() {
    console.log('\n' + colors.bright + colors.blue + '╔══════════════════════════════════════════════╗');
    console.log('║      eTIMS Integration Test Suite            ║');
    console.log('╚══════════════════════════════════════════════╝' + colors.reset + '\n');

// Check environment variables
logInfo('Checking eTIMS configuration...');

// Check for both TIN and PIN (they're the same thing)
const tin = process.env.ETIMS_TIN || process.env.ETIMS_PIN;
const requiredEnvVars = ['ETIMS_CONSUMER_KEY', 'ETIMS_CONSUMER_SECRET', 'ETIMS_BRANCH_ID'];
let missingVars = [];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
});

if (!tin) {
    missingVars.push('ETIMS_TIN/ETIMS_PIN');
}

if (missingVars.length > 0) {
    logError(`Missing environment variables: ${missingVars.join(', ')}`);
    logInfo('Please add them to your .env file:');
    console.log(`
ETIMS_CONSUMER_KEY=your_consumer_key
ETIMS_CONSUMER_SECRET=your_consumer_secret
ETIMS_TIN=A016690117K     # Your KRA PIN
ETIMS_BRANCH_ID=00
    `);
    return;
}

// Set ETIMS_PIN from either source for the rest of the code
process.env.ETIMS_PIN = tin;
logSuccess('Environment variables loaded');
logInfo(`Using KRA PIN: ${tin}`);
    if (missingVars.length > 0) {
        logError(`Missing environment variables: ${missingVars.join(', ')}`);
        logInfo('Please add them to your .env file:');
        console.log(`
ETIMS_CONSUMER_KEY=your_consumer_key
ETIMS_CONSUMER_SECRET=your_consumer_secret
ETIMS_PIN=P051123456R
ETIMS_BRANCH_ID=00
        `);
        return;
    }

    logSuccess('Environment variables loaded');

    // Test 1: Health Check
    logInfo('\n📡 Test 1: Checking eTIMS API health...');
    try {
        const health = await healthCheck();
        if (health.success) {
            logSuccess('eTIMS API is healthy');
            console.log('   Details:', health.details);
        } else {
            logWarning('Health check failed, but continuing tests...');
            console.log('   Error:', health.error);
        }
    } catch (error) {
        logWarning('Health check endpoint not available, continuing...');
    }

    // Test 2: Initialize OSDC (Optional)
    logInfo('\n🔄 Test 2: Initializing OSDC (Optional)...');
    try {
        const initResult = await initializeOsdc();
        if (initResult.success !== false) {
            logSuccess('OSDC initialization attempted');
            console.log('   Result:', initResult);
        } else {
            logWarning('OSDC initialization skipped (may need first-time setup)');
        }
    } catch (error) {
        logWarning('OSDC initialization not required yet');
    }

    // Test 3: Get Code List
    logInfo('\n📋 Test 3: Fetching code list...');
    try {
        const codes = await getCodeList();
        if (codes.success !== false) {
            logSuccess('Successfully fetched code list');
        } else {
            logWarning('Could not fetch code list, but continuing...');
        }
    } catch (error) {
        logWarning('Code list fetch failed, continuing with test invoice');
    }

    // Test 4: Generate Test Invoice
    logInfo('\n🧾 Test 4: Generating test tax invoice...');
    
    // Create test data
    const testTransaction = {
        amount: 3500,
        tickets: 2,
        reference: 'TEST' + Date.now(),
        receiptNumber: 'RKT' + Math.floor(Math.random() * 1000000)
    };
    
    const testEvent = {
        _id: 'test-event-123',
        name: 'Sauti Sol - Live in Concert',
        price: 1750 // 3500/2 = 1750 per ticket
    };
    
    const testCustomer = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '254708374149',
        pin: '' // Optional KRA PIN
    };
    
    console.log('\n📊 Test Data:');
    console.log(`   Event: ${testEvent.name}`);
    console.log(`   Tickets: ${testTransaction.tickets}`);
    console.log(`   Total Amount: KES ${testTransaction.amount}`);
    console.log(`   Per Ticket: KES ${testEvent.price}`);
    console.log(`   Reference: ${testTransaction.reference}`);
    
    // Generate invoice
    logInfo('\n📤 Sending to eTIMS...');
    const result = await generateTaxInvoice(testTransaction, testEvent, testCustomer);
    
    // Display results
    console.log('\n' + colors.bright + '═════════════════════ RESULTS ═════════════════════' + colors.reset);
    
    if (result.success) {
        logSuccess('eTIMS INVOICE GENERATED SUCCESSFULLY! 🎉\n');
        
        console.log(colors.bright + '📄 Invoice Details:' + colors.reset);
        console.log(`   Invoice Number: ${result.invoiceNumber}`);
        console.log(`   Tax Amount (16%): KES ${result.taxAmount.toLocaleString()}`);
        console.log(`   Total Amount: KES ${result.totalAmount.toLocaleString()}`);
        
        if (result.qrCode) {
            console.log(`\n🔍 QR Code: ${result.qrCode.substring(0, 50)}...`);
        }
        
        if (result.kraReference) {
            console.log(`\n🔖 KRA Reference: ${result.kraReference}`);
        }
        
        if (result.resultCode) {
            console.log(`\n📋 Result Code: ${result.resultCode}`);
        }
        
        logSuccess('\n✅ Integration is WORKING!');
        
    } else {
        logError('eTIMS Invoice Generation Failed\n');
        console.log(colors.bright + '❌ Error Details:' + colors.reset);
        console.log(`   ${result.error || 'Unknown error'}`);
        
        if (result.details) {
            console.log('\n📋 Server Response:');
            console.log(JSON.stringify(result.details, null, 2));
        }
        
        logWarning('\n⚠️ Troubleshooting Tips:');
        console.log('   1. Check your Consumer Key and Secret in .env');
        console.log('   2. Verify your KRA PIN (ETIMS_PIN) is correct');
        console.log('   3. Ensure you have internet connection');
        console.log('   4. Check if eTIMS sandbox is accessible');
        console.log('   5. Try running the test again in a few minutes');
    }
    
    console.log('\n' + colors.bright + colors.blue + '══════════════════ Test Complete ══════════════════' + colors.reset + '\n');
}

// Run the test
testETIMS().catch(error => {
    logError('Unexpected error:');
    console.error(error);
});