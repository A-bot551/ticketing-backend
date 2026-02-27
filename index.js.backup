const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initiateSTKPush } = require("./daraja");
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// Store transactions in memory (replace with database later)
let transactions = [];

// ✅ CORS configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    next();
});

// Helper function to save transactions to file
const saveTransaction = (transaction) => {
    const filePath = path.join(__dirname, 'transactions.json');
    let transactions = [];
    
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            transactions = JSON.parse(data);
        }
    } catch (error) {
        console.log('Creating new transactions file');
    }
    
    transactions.push({
        ...transaction,
        timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
    console.log('✅ Transaction saved to file');
};

// Test endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "MPesa API is running",
        status: "online",
        version: "2.0.0",
        endpoints: {
            home: "GET /",
            pay: "POST /api/pay",
            callback: "POST /api/mpesa/callback",
            status: "GET /api/payment-status/:checkoutId",
            transactions: "GET /api/transactions",
            stats: "GET /api/stats"
        }
    });
});

// Payment endpoint
app.post("/api/pay", async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
        console.log("📱 Payment request received:", req.body);
        
        const { phone, amount, eventId } = req.body;
        
        if (!phone || !amount) {
            return res.status(400).json({ 
                success: false,
                error: "Phone and amount are required" 
            });
        }

        // Validate phone number
        const phoneRegex = /^254\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number format. Use 254XXXXXXXXX"
            });
        }

        // Validate amount
        if (amount < 1 || amount > 150000) {
            return res.status(400).json({
                success: false,
                error: "Amount must be between 1 and 150,000"
            });
        }

        const reference = `TICKET_${eventId || 'TEST'}_${Date.now()}`;
        console.log("🎟️ Reference:", reference);
        
        const stkResponse = await initiateSTKPush(phone, amount, reference);
        console.log("✅ STK Response:", stkResponse);

        // Store initial transaction
        const transaction = {
            reference: reference,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            merchantRequestId: stkResponse.MerchantRequestID,
            phone: phone,
            amount: amount,
            eventId: eventId || 'TEST',
            status: 'pending',
            responseCode: stkResponse.ResponseCode,
            responseDescription: stkResponse.ResponseDescription,
            timestamp: new Date().toISOString()
        };
        
        transactions.push(transaction);
        saveTransaction(transaction);

        res.json({
            success: true,
            message: "STK Push sent successfully",
            reference: reference,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            data: stkResponse
        });

    } catch (error) {
        console.error("❌ Payment error:", error);
        res.status(500).json({ 
            success: false,
            error: "STK Push failed",
            details: error.message 
        });
    }
});

// Callback endpoint
app.post("/api/mpesa/callback", (req, res) => {
    console.log("📞 Callback received:", JSON.stringify(req.body, null, 2));
    
    try {
        const callbackData = req.body;
        
        if (callbackData.Body.stkCallback.ResultCode === 0) {
            // Payment successful
            const items = callbackData.Body.stkCallback.CallbackMetadata.Item;
            
            const amount = items.find(item => item.Name === 'Amount')?.Value;
            const receiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;
            const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;
            
            console.log("✅ Payment Successful!");
            console.log(`💰 Amount: KES ${amount}`);
            console.log(`🧾 Receipt: ${receiptNumber}`);
            console.log(`📱 Phone: ${phoneNumber}`);
            
            // Update transaction in memory
            const transactionIndex = transactions.findIndex(
                t => t.checkoutRequestId === callbackData.Body.stkCallback.CheckoutRequestID
            );
            
            if (transactionIndex !== -1) {
                transactions[transactionIndex].status = 'completed';
                transactions[transactionIndex].receiptNumber = receiptNumber;
                transactions[transactionIndex].completedAt = new Date().toISOString();
                saveTransaction(transactions[transactionIndex]);
            }
            
        } else {
            console.log("❌ Payment failed:", callbackData.Body.stkCallback.ResultDesc);
            
            // Update transaction as failed
            const transactionIndex = transactions.findIndex(
                t => t.checkoutRequestId === callbackData.Body.stkCallback.CheckoutRequestID
            );
            
            if (transactionIndex !== -1) {
                transactions[transactionIndex].status = 'failed';
                transactions[transactionIndex].errorMessage = callbackData.Body.stkCallback.ResultDesc;
                saveTransaction(transactions[transactionIndex]);
            }
        }
        
        res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
        
    } catch (error) {
        console.error("❌ Callback processing error:", error);
        res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }
});

// Get payment status by checkout ID
app.get("/api/payment-status/:checkoutId", (req, res) => {
    const { checkoutId } = req.params;
    
    const transaction = transactions.find(t => t.checkoutRequestId === checkoutId);
    
    if (transaction) {
        res.json({
            status: transaction.status,
            receiptNumber: transaction.receiptNumber,
            amount: transaction.amount,
            phone: transaction.phone,
            reference: transaction.reference,
            timestamp: transaction.timestamp
        });
    } else {
        res.json({
            status: 'pending',
            message: 'Transaction not found, still processing'
        });
    }
});

// Get all transactions
app.get("/api/transactions", (req, res) => {
    res.json({
        success: true,
        count: transactions.length,
        transactions: transactions.slice(-50) // Return last 50 transactions
    });
});

// Get statistics
app.get("/api/stats", (req, res) => {
    const stats = {
        total: transactions.length,
        completed: transactions.filter(t => t.status === 'completed').length,
        pending: transactions.filter(t => t.status === 'pending').length,
        failed: transactions.filter(t => t.status === 'failed').length,
        totalAmount: transactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount), 0)
    };
    
    res.json(stats);
});

// Get transaction by reference
app.get("/api/transaction/:reference", (req, res) => {
    const transaction = transactions.find(t => t.reference === req.params.reference);
    
    if (transaction) {
        res.json({
            success: true,
            transaction: transaction
        });
    } else {
        res.status(404).json({
            success: false,
            error: "Transaction not found"
        });
    }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        transactions: transactions.length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║         MPesa API Server v2.0                ║
    ╠══════════════════════════════════════════════╣
    ║  🚀 Port:        ${PORT}                           ║
    ║  🔓 CORS:        Enabled                       ║
    ║  📍 Local:       http://localhost:${PORT}        ║
    ║  📊 Transactions: ${transactions.length} stored     ║
    ║                                                ║
    ║  📌 Endpoints:                                 ║
    ║     GET  /                                    ║
    ║     POST /api/pay                              ║
    ║     POST /api/mpesa/callback                   ║
    ║     GET  /api/payment-status/:checkoutId       ║
    ║     GET  /api/transactions                     ║
    ║     GET  /api/stats                            ║
    ║     GET  /api/health                           ║
    ╚════════════════════════════════════════════════╝
    `);
});