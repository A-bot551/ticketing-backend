// utils/etims.js
const axios = require('axios');
const crypto = require('crypto');

// eTIMS Sandbox API - Correct KRA Sandbox URL
const ETIMS_API_URL = 'https://etims-api-sbx.kra.go.ke/etims-api'; // Correct KRA Sandbox URL

// Your eTIMS credentials from .env
const ETIMS_CONSUMER_KEY = process.env.ETIMS_CONSUMER_KEY;
const ETIMS_CONSUMER_SECRET = process.env.ETIMS_CONSUMER_SECRET;
const ETIMS_PIN = process.env.ETIMS_PIN || process.env.ETIMS_TIN; // Your KRA PIN (accepts both)
const ETIMS_BRANCH_ID = process.env.ETIMS_BRANCH_ID || '00'; // Branch ID (default '00')

// Common headers for API requests
const getHeaders = (token = null) => {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

// Generate access token with comprehensive retry logic
const getAccessToken = async (retryCount = 0) => {
    try {
        console.log('🔑 Requesting eTIMS access token...');
        
        // Method 1: OAuth2 token endpoint with Basic Auth
        try {
            const auth = Buffer.from(`${ETIMS_CONSUMER_KEY}:${ETIMS_CONSUMER_SECRET}`).toString('base64');
            
            const response = await axios.post(
                `${ETIMS_API_URL}/token`,
                { grant_type: 'client_credentials' },
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            const token = response.data.access_token || response.data.token;
            if (token) {
                console.log('✅ eTIMS token obtained via OAuth2');
                return token;
            }
        } catch (error) {
            console.log('⚠️ OAuth2 method failed, trying next...');
        }
        
        // Method 2: Direct authentication endpoint
        try {
            const response = await axios.post(
                `${ETIMS_API_URL}/auth/token`,
                {
                    username: ETIMS_CONSUMER_KEY,
                    password: ETIMS_CONSUMER_SECRET
                },
                {
                    headers: getHeaders(),
                    timeout: 10000
                }
            );
            
            const token = response.data.access_token || response.data.token;
            if (token) {
                console.log('✅ eTIMS token obtained via direct auth');
                return token;
            }
        } catch (error) {
            console.log('⚠️ Direct auth failed, trying next...');
        }
        
        // Method 3: Alternative auth format
        try {
            const auth = Buffer.from(`${ETIMS_CONSUMER_KEY}:${ETIMS_CONSUMER_SECRET}`).toString('base64');
            
            const response = await axios.post(
                `${ETIMS_API_URL}/auth`,
                {},
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            const token = response.data.access_token || response.data.token;
            if (token) {
                console.log('✅ eTIMS token obtained via basic auth');
                return token;
            }
        } catch (error) {
            console.log('⚠️ Basic auth failed');
        }
        
        throw new Error('All authentication methods failed');
        
    } catch (error) {
        console.error('❌ eTIMS Token Error:', error.response?.data || error.message);
        
        // Retry logic (max 3 retries)
        if (retryCount < 3) {
            console.log(`🔄 Retrying token request (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return getAccessToken(retryCount + 1);
        }
        
        throw new Error(`Failed to get eTIMS access token after ${retryCount} retries: ${error.message}`);
    }
};

// Validate invoice data before submission
const validateInvoiceData = (data) => {
    const errors = [];
    
    if (!data.tin) errors.push('Missing seller TIN');
    if (!data.bhfId) errors.push('Missing branch ID');
    if (!data.invcNo) errors.push('Missing invoice number');
    if (!data.itemList || data.itemList.length === 0) errors.push('No items in invoice');
    if (!data.itemList[0]?.itemNm) errors.push('Missing item name');
    if (!data.itemList[0]?.qty) errors.push('Missing quantity');
    if (!data.itemList[0]?.prc) errors.push('Missing unit price');
    
    return {
        valid: errors.length === 0,
        errors
    };
};

// Generate tax invoice for ticket sale
const generateTaxInvoice = async (transaction, event, customer) => {
    try {
        console.log('🧾 Starting eTIMS invoice generation...');
        console.log('📊 Transaction:', { amount: transaction.amount, tickets: transaction.tickets });
        
        const token = await getAccessToken();
        
        // Calculate tax (16% VAT)
        const subtotal = transaction.amount;
        const taxAmount = Math.round(subtotal * 0.16); // 16% VAT
        const total = subtotal + taxAmount;
        
        console.log(`💰 Subtotal: KES ${subtotal}, Tax: KES ${taxAmount}, Total: KES ${total}`);
        
        // Generate unique invoice number
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const invoiceNumber = `TMS${timestamp}${random}`;
        
        console.log(`📄 Generated invoice number: ${invoiceNumber}`);
        
        // Get current date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Prepare invoice data according to eTIMS OSCU specification
        const invoiceData = {
            tin: ETIMS_PIN,                          // Taxpayer Identification Number
            bhfId: ETIMS_BRANCH_ID,                   // Branch ID
            invcNo: invoiceNumber,                     // Invoice number
            orgInvcNo: invoiceNumber,                  // Original invoice number
            rcptTyCd: 'N',                             // Receipt type: 'N' for Normal
            salesTyCd: 'S',                             // Sales type: 'S' for Sale
            rcptNb: transaction.tickets,                // Number of items
            cmplTyCd: '1',                              // Completion type
            salesDate: dateStr,                          // YYYYMMDD
            itemList: [{
                itemCd: event._id.toString().substring(0, 20), // Item code (max 20 chars)
                itemNm: event.name.substring(0, 40),           // Item name (max 40 chars)
                qty: transaction.tickets,                       // Quantity
                prc: event.price,                                // Unit price
                splyAmt: subtotal,                               // Supply amount (before tax)
                taxTyCd: 'A',                                     // Tax type: 'A' for VAT 16%
                taxAmt: taxAmount                                 // Tax amount
            }],
            total: {
                taxblAmtA: subtotal,    // Taxable amount for rate A (16%)
                taxAmtA: taxAmount,      // Tax amount for rate A
                taxblAmtB: 0,            // Taxable amount for rate B (0%)
                taxAmtB: 0,
                taxblAmtC: 0,            // Taxable amount for rate C (exempt)
                taxAmtC: 0,
                taxblAmtD: 0,            // Taxable amount for rate D (other)
                taxAmtD: 0
            },
            payment: {
                payTyCd: '01',             // Payment type: '01' for Cash/M-Pesa
                payAmt: total,               // Payment amount
                payDt: dateStr                // Payment date YYYYMMDD
            },
            customer: {
                name: customer.name.substring(0, 60),  // Customer name (max 60 chars)
                email: customer.email,
                phone: customer.phone,
                tin: customer.pin || ""                  // Optional customer KRA PIN
            }
        };
        
        // Validate invoice data
        const validation = validateInvoiceData(invoiceData);
        if (!validation.valid) {
            console.error('❌ Invoice validation failed:', validation.errors);
            throw new Error(`Invoice validation failed: ${validation.errors.join(', ')}`);
        }
        
        console.log('📤 Submitting invoice to eTIMS...');
        
        // Submit to eTIMS OSCU API
        const response = await axios.post(
            `${ETIMS_API_URL}/sales/trns`,
            invoiceData,
            {
                headers: getHeaders(token),
                timeout: 15000
            }
        );
        
        console.log('📥 eTIMS Response:', response.data);
        
        // Check response (KRA returns resultCd '000' for success)
        if (response.data.resultCd === '000' || response.data.success) {
            console.log(`✅ eTIMS Invoice Generated: ${invoiceNumber}`);
            
            // Generate QR code if not provided by KRA
            const qrCode = response.data.qrData || 
                          response.data.qrCode || 
                          generateQRCode(invoiceNumber, total, ETIMS_PIN);
            
            return {
                success: true,
                invoiceNumber: invoiceNumber,
                taxAmount: taxAmount,
                totalAmount: total,
                qrCode: qrCode,
                kraReference: response.data.invcNo || invoiceNumber,
                resultCode: response.data.resultCd,
                rawResponse: response.data
            };
        } else {
            throw new Error(response.data.msg || 'eTIMS submission failed');
        }
        
    } catch (error) {
        console.error('❌ eTIMS Error:', error.response?.data || error.message);
        
        // Detailed error logging
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            console.error('Response data:', error.response.data);
        }
        
        return {
            success: false,
            error: error.response?.data?.msg || error.response?.data?.message || error.message,
            details: error.response?.data || {}
        };
    }
};

// Generate QR code for invoice (fallback if KRA doesn't provide one)
const generateQRCode = (invoiceNumber, amount, pin) => {
    const qrData = `KRA|${invoiceNumber}|${amount}|${pin}|${Date.now()}`;
    return Buffer.from(qrData).toString('base64');
};

// Initialize OSDC (Online Sales Data Controller)
const initializeOsdc = async () => {
    try {
        console.log('🔄 Initializing OSDC...');
        const token = await getAccessToken();
        
        const initData = {
            tin: ETIMS_PIN,
            bhfId: ETIMS_BRANCH_ID,
            dvcSrlNo: `TMS${Date.now().toString().slice(-6)}` // Generate device serial number
        };
        
        const response = await axios.post(
            `${ETIMS_API_URL}/init/osdc`,
            initData,
            {
                headers: getHeaders(token),
                timeout: 10000
            }
        );
        
        console.log('✅ OSDC initialized:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ OSDC Init Error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// Get code list from eTIMS (item codes, tax codes, etc.)
const getCodeList = async () => {
    try {
        console.log('📋 Fetching code list...');
        const token = await getAccessToken();
        
        // Get date 30 days ago in YYYYMMDDHHMMSS format
        const lastReqDt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19)
            .replace(/[-T:]/g, '');
        
        const response = await axios.post(
            `${ETIMS_API_URL}/code/list`,
            {
                tin: ETIMS_PIN,
                bhfId: ETIMS_BRANCH_ID,
                lastReqDt: lastReqDt
            },
            {
                headers: getHeaders(token),
                timeout: 10000
            }
        );
        
        console.log('✅ Code list fetched');
        return response.data;
    } catch (error) {
        console.error('❌ Code List Error:', error.message);
        return { success: false, error: error.message };
    }
};

// Verify invoice with eTIMS
const verifyInvoice = async (invoiceNumber) => {
    try {
        console.log(`🔍 Verifying invoice: ${invoiceNumber}`);
        const token = await getAccessToken();
        
        const response = await axios.get(
            `${ETIMS_API_URL}/sales/verify/${invoiceNumber}`,
            {
                headers: getHeaders(token),
                timeout: 10000
            }
        );
        
        console.log('✅ Invoice verified:', response.data);
        return {
            success: true,
            verified: response.data.verified || response.data.resultCd === '000',
            details: response.data
        };
    } catch (error) {
        console.error('❌ Verification Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

// Check eTIMS service health
const healthCheck = async () => {
    try {
        console.log('🏥 Checking eTIMS API health...');
        const token = await getAccessToken();
        
        const response = await axios.get(
            `${ETIMS_API_URL}/health`,
            {
                headers: getHeaders(token),
                timeout: 5000
            }
        );
        
        return {
            success: true,
            status: 'healthy',
            details: response.data
        };
    } catch (error) {
        return {
            success: false,
            status: 'unhealthy',
            error: error.message
        };
    }
};

module.exports = { 
    generateTaxInvoice, 
    verifyInvoice,
    initializeOsdc,
    getCodeList,
    healthCheck
};