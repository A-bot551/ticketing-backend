// final-test.js
// This is a standalone test with no dependencies on your .env file
// Just copy and paste your actual credentials directly

const axios = require('axios');

// PASTE YOUR ACTUAL CREDENTIALS HERE (from your .env file)
const CONSUMER_KEY = 'TlB5lHiDuzl816yxS0SN7ahTAX4lzEKxynfFEv7t7FoGY4KT';
const CONSUMER_SECRET = '0JUQrV5Ably2neSVqrbJ3GIMW5Gl83khqQoXZdAMtGJZcRWKNFNlG9UKI7Y6dneD';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const SHORTCODE = '174379';
const CALLBACK_URL = 'https://aerolitic-madge-kernelly.ngrok-free.dev';

async function testMpesa() {
    console.log('🔵 MPESA DIRECT TEST');
    console.log('====================');
    
    try {
        // Step 1: Get Token
        console.log('1️⃣ Getting access token...');
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        
        const tokenResponse = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const token = tokenResponse.data.access_token;
        console.log('✅ Token obtained:', token.substring(0, 20) + '...');
        console.log('Token expires in:', tokenResponse.data.expires_in, 'seconds');
        
        // Step 2: Generate Timestamp
        const date = new Date();
        const timestamp = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0') +
            date.getHours().toString().padStart(2, '0') +
            date.getMinutes().toString().padStart(2, '0') +
            date.getSeconds().toString().padStart(2, '0');
        
        console.log('2️⃣ Timestamp:', timestamp);
        
        // Step 3: Generate Password
        const passwordString = SHORTCODE + PASSKEY + timestamp;
        const password = Buffer.from(passwordString).toString('base64');
        console.log('3️⃣ Password generated');
        
        // Step 4: Prepare STK Push
        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: 1,
            PartyA: '254708374149',
            PartyB: SHORTCODE,
            PhoneNumber: '254708374149',
            CallBackURL: CALLBACK_URL,
            AccountReference: 'Test',
            TransactionDesc: 'Test Payment'
        };
        
        console.log('4️⃣ STK Push Payload:');
        console.log(JSON.stringify(payload, null, 2));
        
        // Step 5: Send STK Push
        console.log('5️⃣ Sending STK Push request...');
        
        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(stkResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ ERROR:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
            
            // Specific error analysis
            if (error.response.data.errorCode === '404.001.03') {
                console.log('\n🔍 ERROR ANALYSIS:');
                console.log('This "Invalid Access Token" error usually means:');
                console.log('1️⃣ Your Consumer Key/Secret are for PRODUCTION, not SANDBOX');
                console.log('2️⃣ Your app is not activated in Sandbox environment');
                console.log('3️⃣ You need to create a new app specifically for Sandbox');
                
                console.log('\n✅ SOLUTION:');
                console.log('1. Go to https://developer.safaricom.co.ke/');
                console.log('2. Click "My Apps"');
                console.log('3. Create a NEW app and select "Sandbox" environment');
                console.log('4. Copy the NEW Consumer Key and Secret');
                console.log('5. Find the Passkey in the app details');
                console.log('6. Update this script with the NEW credentials');
            }
        } else if (error.request) {
            console.error('No response received from server');
            console.error('Check your internet connection');
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testMpesa();