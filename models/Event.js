const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    shortDescription: String,
    date: Date,
    endDate: Date,
    venue: String,
    address: String,
    city: String,
    price: { type: Number, required: true },
    earlyBirdPrice: Number,
    earlyBirdDeadline: Date,
    capacity: { type: Number, required: true },
    ticketsSold: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    featured: { type: Boolean, default: false },
    category: String,
    tags: [String],
    organizer: String,
    organizerEmail: String,
    organizerPhone: String
}, { timestamps: true });

// Virtual for available tickets
eventSchema.virtual('ticketsAvailable').get(function() {
    return this.capacity - this.ticketsSold;
});

// Ensure virtuals are included in JSON output
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);