// simulate-callback.js
const axios = require('axios');

// Use your ngrok URL from the terminal
const CALLBACK_URL = 'https://aerolitic-madge-kernelly.ngrok-free.dev/api/mpesa/callback';

const simulatedCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: "29115-34620561-1",
      CheckoutRequestID: "ws_CO_25022026101026450708374149",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          {
            Name: "Amount",
            Value: 1
          },
          {
            Name: "MpesaReceiptNumber",
            Value: "RKT9QM1WX9"
          },
          {
            Name: "TransactionDate",
            Value: 20250225101530
          },
          {
            Name: "PhoneNumber",
            Value: 254708374149
          }
        ]
      }
    }
  }
};

async function simulateCallback() {
  try {
    console.log('📤 Sending simulated callback...');
    const response = await axios.post(CALLBACK_URL, simulatedCallback);
    console.log('✅ Callback sent successfully!');
    console.log('Response:', response.data);
    console.log('\nCheck your server terminal - you should see the callback logged!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simulateCallback();