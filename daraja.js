// daraja.js
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

// Helper function to format phone numbers
const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    return "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("7")) {
    return "254" + cleaned;
  } else if (cleaned.startsWith("254")) {
    return cleaned;
  } else {
    return "254" + cleaned;
  }
};

const getAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { 
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Error getting token:", error.response?.data || error.message);
    throw error;
  }
};

const initiateSTKPush = async (phone, amount, reference, retries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`STK Push attempt ${attempt}/${retries} for ${phone}`);
      
      const formattedPhone = formatPhoneNumber(phone);
      const token = await getAccessToken();

      // Generate timestamp in format YYYYMMDDHHmmss
      const date = new Date();
      const timestamp = 
        date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        date.getDate().toString().padStart(2, "0") +
        date.getHours().toString().padStart(2, "0") +
        date.getMinutes().toString().padStart(2, "0") +
        date.getSeconds().toString().padStart(2, "0");

      // Generate password
      const passwordString = process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp;
      const password = Buffer.from(passwordString).toString("base64");

      const payload = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.floor(Number(amount)),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL.trim(),
        AccountReference: (reference || "Ticket").substring(0, 12),
        TransactionDesc: "Event Ticket Payment",
      };

      console.log(`Payload:`, { ...payload, Password: '***' });

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      console.log(`✅ STK Push successful on attempt ${attempt}:`, response.data);
      return response.data;
      
    } catch (error) {
      lastError = error;
      const errorMessage = error.response?.data?.errorMessage || error.response?.data || error.message;
      const statusCode = error.response?.status;
      
      console.error(`❌ STK Push attempt ${attempt} failed (${statusCode}):`, errorMessage);
      
      if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 503) {
        throw error;
      }
      
      if (attempt < retries) {
        const waitTime = 2000 * attempt;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error(`All ${retries} STK Push attempts failed. Final error:`, lastError);
  throw lastError;
};

module.exports = { initiateSTKPush };