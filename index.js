const { sendTicketEmail } = require('./config/email');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const QRCode = require('qrcode');

const { initiateSTKPush } = require("./daraja");
const Transaction = require("./models/Transaction");
const Event = require("./models/Event");
const Admin = require("./models/Admin");
const User = require("./models/User");

// SMS utility - COMMENTED OUT until configured
// const { sendTicketSMS } = require('./utils/sms');

dotenv.config();

const app = express();

// ============================================
// MONGODB CONNECTION
// ============================================
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================
// MIDDLEWARE
// ============================================
const corsOptions = {
    origin: [
        'http://localhost:3000', 
        'https://ticketing-backend-tvoz.onrender.com',
        'https://elaborate-kangaroo-f62471.netlify.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware for admin
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// QR CODE UTILITY FUNCTIONS
// ============================================
const generateQRCode = async (data) => {
    try {
        const ticketData = JSON.stringify({
            receipt: data.receiptNumber,
            event: data.eventName,
            name: data.name,
            date: data.date,
            tickets: data.tickets
        });
        
        const qrCodeDataURL = await QRCode.toDataURL(ticketData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#667eea',
                light: '#ffffff'
            }
        });
        
        return qrCodeDataURL;
    } catch (error) {
        console.error('❌ QR Code generation error:', error);
        return null;
    }
};

// ============================================
// ADMIN MIDDLEWARE
// ============================================
const requireAdmin = (req, res, next) => {
    if (!req.session.adminId) {
        return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    next();
};

// ============================================
// TEST ENDPOINTS
// ============================================
app.get("/", (req, res) => {
    res.json({ 
        message: "MPesa API is running",
        version: "4.0.0",
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        features: {
            qrCodes: true,
            adminDashboard: true,
            userAccounts: true,
            sms: false
        },
        endpoints: {
            home: "GET /",
            events: "GET /api/events",
            pay: "POST /api/pay",
            callback: "POST /api/mpesa/callback",
            status: "GET /api/payment-status/:checkoutId",
            transactions: "GET /api/transactions",
            transaction: "GET /api/transaction/:reference",
            stats: "GET /api/stats",
            health: "GET /api/health",
            testEmail: "POST /api/test-email",
            validateTicket: "GET /api/validate-ticket/:receiptNumber",
            useTicket: "POST /api/use-ticket/:receiptNumber",
            admin: "POST /api/admin/login",
            user: "POST /api/auth/register"
        }
    });
});

// ============================================
// TEMPORARY SEED ENDPOINT - REMOVE AFTER USE
// ============================================
app.get("/api/seed-events", async (req, res) => {
    try {
        const count = await Event.countDocuments();
        if (count === 0) {
            const events = [
                {
                    name: "Tech Conference 2026",
                    description: "The biggest tech conference in East Africa featuring keynote speakers from Google, Microsoft, and Safaricom.",
                    shortDescription: "East Africa's premier tech conference",
                    date: new Date("2026-03-15T09:00:00.000Z"),
                    endDate: new Date("2026-03-16T18:00:00.000Z"),
                    venue: "KICC",
                    address: "Harambe Avenue",
                    city: "Nairobi",
                    price: 2500,
                    capacity: 500,
                    ticketsSold: 0,
                    status: 'active',
                    featured: true,
                    category: "Conference"
                },
                {
                    name: "Startup Pitch Night",
                    description: "Watch 10 innovative startups pitch to top investors. Network with founders, VCs, and angel investors.",
                    shortDescription: "Where startups meet investors",
                    date: new Date("2026-04-10T17:00:00.000Z"),
                    endDate: new Date("2026-04-10T21:00:00.000Z"),
                    venue: "iHub",
                    address: "Senteu Plaza",
                    city: "Nairobi",
                    price: 1000,
                    capacity: 200,
                    ticketsSold: 0,
                    status: 'active',
                    featured: true,
                    category: "Networking"
                },
                {
                    name: "Mobile Development Workshop",
                    description: "Hands-on workshop building Android and iOS apps with Kotlin and Swift. Bring your laptop!",
                    shortDescription: "Learn mobile development",
                    date: new Date("2026-05-05T09:00:00.000Z"),
                    endDate: new Date("2026-05-07T17:00:00.000Z"),
                    venue: "Moringa School",
                    city: "Nairobi",
                    price: 5000,
                    capacity: 50,
                    ticketsSold: 0,
                    status: 'active',
                    featured: false,
                    category: "Workshop"
                }
            ];
            
            await Event.insertMany(events);
            res.json({ success: true, message: "Events seeded successfully!", count: events.length });
        } else {
            res.json({ success: true, message: "Events already exist", count });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EVENT ENDPOINTS
// ============================================
app.get("/api/events", async (req, res) => {
    try {
        const events = await Event.find({ status: 'active' })
            .sort({ featured: -1, date: 1 });
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/events/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PAYMENT ENDPOINTS
// ============================================
app.post("/api/pay", async (req, res) => {
    try {
        console.log("📱 Payment request received:", req.body);
        
        const { phone, amount, eventId, email, name, tickets } = req.body;
        
        if (!phone || !amount) {
            return res.status(400).json({ error: "Phone and amount are required" });
        }

        // Validate event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(400).json({ error: "Event not found" });
        }

        // Check ticket availability
        if (event.ticketsAvailable < (tickets || 1)) {
            return res.status(400).json({ error: "Not enough tickets available" });
        }

        const reference = `TICKET_${eventId}_${Date.now()}`;
        console.log("🎟️ Reference:", reference);
        
        const stkResponse = await initiateSTKPush(phone, amount, reference);

        // Generate QR code for the ticket
        const qrCode = await generateQRCode({
            receiptNumber: 'PENDING_' + Date.now(),
            eventName: event.name,
            name: name || 'Customer',
            date: new Date().toISOString(),
            tickets: tickets || 1
        });

        // Save transaction to database
        const transaction = new Transaction({
            checkoutRequestId: stkResponse.CheckoutRequestID,
            merchantRequestId: stkResponse.MerchantRequestID,
            reference: reference,
            phone: phone,
            amount: amount,
            eventId: eventId,
            email: email,
            name: name,
            tickets: tickets || 1,
            ticketPrice: event.price,
            status: 'pending',
            qrCode: qrCode,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        await transaction.save();
        console.log("✅ Transaction saved to database");

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

// ============================================
// MPESA CALLBACK ENDPOINT (WITH EMAIL & QR)
// ============================================
app.post("/api/mpesa/callback", async (req, res) => {
    console.log("📞 Callback received:", JSON.stringify(req.body, null, 2));
    
    try {
        const callbackData = req.body.Body.stkCallback;
        
        // Find transaction
        const transaction = await Transaction.findOne({
            checkoutRequestId: callbackData.CheckoutRequestID
        });
        
        if (transaction) {
            // Get event details
            const event = await Event.findById(transaction.eventId);
            
            if (callbackData.ResultCode === 0) {
                // Payment successful
                const items = callbackData.CallbackMetadata.Item;
                const receiptNumber = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
                const amount = items.find(i => i.Name === 'Amount')?.Value;
                
                // Generate final QR code with receipt number
                const finalQRCode = await generateQRCode({
                    receiptNumber: receiptNumber,
                    eventName: event.name,
                    name: transaction.name,
                    date: new Date().toISOString(),
                    tickets: transaction.tickets
                });
                
                // Update transaction
                transaction.status = 'completed';
                transaction.receiptNumber = receiptNumber;
                transaction.completedAt = new Date();
                transaction.callbackData = callbackData;
                transaction.qrCode = finalQRCode;
                await transaction.save();
                
                // Update event tickets sold
                if (event) {
                    event.ticketsSold += transaction.tickets;
                    await event.save();
                }
                
                console.log(`✅ Payment completed: ${receiptNumber} for KES ${amount}`);
                
                // 📧 SEND EMAIL TICKET WITH QR CODE
                if (transaction.email) {
                    console.log(`📧 Sending ticket email to ${transaction.email}...`);
                    
                    const emailResult = await sendTicketEmail({
                        name: transaction.name || 'Valued Customer',
                        email: transaction.email,
                        phone: transaction.phone,
                        event: event,
                        tickets: transaction.tickets,
                        amount: transaction.amount,
                        receiptNumber: receiptNumber,
                        date: new Date(),
                        qrCode: finalQRCode
                    });
                    
                    if (emailResult.success) {
                        console.log(`✅ Ticket email sent to ${transaction.email}`);
                    } else {
                        console.log(`❌ Failed to send email: ${emailResult.error}`);
                    }
                }
                
                // 📱 SMS DISABLED - Uncomment when ready
                /*
                if (transaction.phone) {
                    console.log(`📱 Would send SMS to ${transaction.phone} (disabled)`);
                    // const smsResult = await sendTicketSMS(transaction.phone, {
                    //     eventName: event.name,
                    //     receiptNumber: receiptNumber,
                    //     tickets: transaction.tickets,
                    //     amount: transaction.amount
                    // });
                }
                */
                
            } else {
                // Payment failed
                transaction.status = 'failed';
                transaction.callbackData = callbackData;
                await transaction.save();
                console.log(`❌ Payment failed: ${callbackData.ResultDesc}`);
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: "Success" });
        
    } catch (error) {
        console.error("Callback error:", error);
        res.json({ ResultCode: 0, ResultDesc: "Success" });
    }
});

// ============================================
// QR CODE VALIDATION ENDPOINTS
// ============================================
app.get("/api/validate-ticket/:receiptNumber", async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            receiptNumber: req.params.receiptNumber
        }).populate('eventId');
        
        if (!transaction) {
            return res.status(404).json({ 
                valid: false, 
                error: "Ticket not found" 
            });
        }
        
        if (transaction.status !== 'completed') {
            return res.status(400).json({ 
                valid: false, 
                error: "Ticket not paid" 
            });
        }
        
        // Check if ticket already used
        if (transaction.used) {
            return res.status(400).json({ 
                valid: false, 
                error: "Ticket already used",
                usedAt: transaction.usedAt
            });
        }
        
        res.json({
            valid: true,
            ticket: {
                receiptNumber: transaction.receiptNumber,
                event: transaction.eventId.name,
                name: transaction.name,
                tickets: transaction.tickets,
                date: transaction.createdAt,
                qrCode: transaction.qrCode
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark ticket as used (scan at entrance)
app.post("/api/use-ticket/:receiptNumber", async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndUpdate(
            { receiptNumber: req.params.receiptNumber, status: 'completed', used: false },
            { used: true, usedAt: new Date() },
            { new: true }
        );
        
        if (!transaction) {
            return res.status(404).json({ 
                error: "Ticket not found or already used" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Ticket validated successfully",
            ticket: {
                receiptNumber: transaction.receiptNumber,
                usedAt: transaction.usedAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TRANSACTION ENDPOINTS
// ============================================
app.get("/api/payment-status/:checkoutId", async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            checkoutRequestId: req.params.checkoutId
        });
        
        if (transaction) {
            res.json({
                status: transaction.status,
                receiptNumber: transaction.receiptNumber,
                amount: transaction.amount,
                phone: transaction.phone,
                reference: transaction.reference,
                eventId: transaction.eventId
            });
        } else {
            res.json({ status: 'pending' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/transactions", async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('eventId');
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/transaction/:reference", async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            reference: req.params.reference
        }).populate('eventId');
        
        if (transaction) {
            res.json({ success: true, transaction });
        } else {
            res.status(404).json({ error: "Transaction not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/transactions/phone/:phone", async (req, res) => {
    try {
        const transactions = await Transaction.find({
            phone: req.params.phone
        })
        .sort({ createdAt: -1 })
        .populate('eventId');
        
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================
app.get("/api/stats", async (req, res) => {
    try {
        const total = await Transaction.countDocuments();
        const completed = await Transaction.countDocuments({ status: 'completed' });
        const pending = await Transaction.countDocuments({ status: 'pending' });
        const failed = await Transaction.countDocuments({ status: 'failed' });
        const used = await Transaction.countDocuments({ used: true });
        
        const completedTransactions = await Transaction.find({ status: 'completed' });
        const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        res.json({
            total,
            completed,
            pending,
            failed,
            used,
            totalAmount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TEST EMAIL ENDPOINT
// ============================================
app.post("/api/test-email", async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        
        const event = await Event.findOne();
        if (!event) {
            return res.status(404).json({ error: "No events found" });
        }
        
        console.log(`📧 Testing email to: ${email}`);
        
        const result = await sendTicketEmail({
            name: name || 'Test User',
            email: email,
            phone: '254708374149',
            event: event,
            tickets: 2,
            amount: 5000,
            receiptNumber: 'TEST' + Date.now(),
            date: new Date()
        });
        
        res.json(result);
    } catch (error) {
        console.error("❌ Test email error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage()
    });
});

// ============================================
// ADMIN AUTHENTICATION ENDPOINTS
// ============================================
app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        req.session.adminId = admin._id;
        admin.lastLogin = new Date();
        await admin.save();
        
        res.json({ 
            success: true, 
            message: "Login successful",
            admin: {
                username: admin.username,
                email: admin.email,
                lastLogin: admin.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/admin/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out" });
});

// ============================================
// ADMIN DASHBOARD ENDPOINTS (Protected)
// ============================================
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
        const totalSales = await Transaction.countDocuments({ status: 'completed' });
        const totalRevenue = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        
        const recentTransactions = await Transaction.find({ status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('eventId');
        
        const events = await Event.find();
        const eventStats = await Promise.all(events.map(async (event) => {
            const sold = await Transaction.countDocuments({ 
                eventId: event._id, 
                status: 'completed' 
            });
            return {
                ...event.toObject(),
                ticketsSold: sold,
                revenue: sold * event.price
            };
        }));
        
        res.json({
            totalSales,
            totalRevenue: totalRevenue[0]?.total || 0,
            recentTransactions,
            eventStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD Operations for Events (Admin only)
app.post("/api/admin/events", requireAdmin, async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Event deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
        const { status, eventId, startDate, endDate } = req.query;
        let query = {};
        
        if (status) query.status = status;
        if (eventId) query.eventId = eventId;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .populate('eventId');
        
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// USER AUTHENTICATION ENDPOINTS - UPDATED WITH AUTO-VERIFY
// ============================================
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        const user = new User({
            name,
            email,
            phone,
            password,
            verificationToken,
            verified: true // 👈 AUTO-VERIFY USERS FOR TESTING
        });
        
        await user.save();
        
        console.log(`✅ User registered and auto-verified: ${email}`);
        
        res.json({ 
            success: true, 
            message: "Registration successful! You can now login." 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Verification check is now optional since we auto-verify
        // But keeping it for future use
        if (!user.verified) {
            return res.status(401).json({ error: "Please verify your email first" });
        }
        
        const token = crypto.randomBytes(32).toString('hex');
        user.lastLogin = new Date();
        await user.save();
        
        console.log(`✅ User logged in: ${email}`);
        
        res.json({ 
            success: true, 
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/user/transactions", async (req, res) => {
    try {
        const { email } = req.query;
        const transactions = await Transaction.find({ email })
            .sort({ createdAt: -1 })
            .populate('eventId');
        
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TEST SMS ENDPOINT - DISABLED
// ============================================
// app.post("/api/test-sms", async (req, res) => {
//     try {
//         const { phone } = req.body;
//         
//         if (!phone) {
//             return res.status(400).json({ error: "Phone number required" });
//         }
//         
//         const event = await Event.findOne();
//         if (!event) {
//             return res.status(404).json({ error: "No events found" });
//         }
//         
//         const result = await sendTicketSMS(phone, {
//             eventName: event.name,
//             receiptNumber: 'TEST' + Date.now(),
//             tickets: 2,
//             amount: 5000
//         });
//         
//         res.json(result);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║         MPesa API Server v4.0                 ║
    ╠══════════════════════════════════════════════╣
    ║  🚀 Port:        ${PORT}                           ║
    ║  🔓 CORS:        Enabled                       ║
    ║  💾 Database:    Connected                     ║
    ║  📧 Email:       Ready                         ║
    ║  📱 QR Codes:    Active                        ║
    ║  👤 Admin:       Configured                    ║
    ║  📍 Local:       http://localhost:${PORT}        ║
    ║                                                ║
    ║  📌 Endpoints:                                 ║
    ║     GET  /                                      ║
    ║     GET  /api/events                            ║
    ║     POST /api/pay                                ║
    ║     POST /api/mpesa/callback                     ║
    ║     GET  /api/validate-ticket/:receipt           ║
    ║     POST /api/use-ticket/:receipt                ║
    ║     GET  /api/transactions                       ║
    ║     GET  /api/stats                              ║
    ║     POST /api/admin/login                         ║
    ║     POST /api/auth/register                       ║
    ║     POST /api/test-email                          ║
    ║     GET  /api/health                             ║
    ╚════════════════════════════════════════════════╝
    `);
});