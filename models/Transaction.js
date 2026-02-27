const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Transaction IDs
    checkoutRequestId: { type: String, required: true, unique: true },
    merchantRequestId: String,
    reference: { type: String, required: true },
    
    // Payment details
    phone: { type: String, required: true },
    amount: { type: Number, required: true },
    receiptNumber: String,
    
    // Status
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    
    // Event details
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    tickets: { type: Number, default: 1 },
    ticketPrice: { type: Number, default: 2500 },
    
    // Customer details
    email: String,
    name: String,
    
    // QR Code and validation
    qrCode: String, // Store QR code data URL
    used: { type: Boolean, default: false },
    usedAt: Date,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    
    // Callback data
    callbackData: mongoose.Schema.Types.Mixed,
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp on save
transactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for ticket availability check
transactionSchema.virtual('isValid').get(function() {
    return this.status === 'completed' && !this.used;
});

// Ensure virtuals are included in JSON
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);