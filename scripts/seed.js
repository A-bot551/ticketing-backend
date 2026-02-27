// scripts/seed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables with explicit path
const envPath = path.join(__dirname, '..', '.env');
console.log('📁 Looking for .env at:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('❌ Error loading .env file:', result.error.message);
    console.log('💡 Using default connection string');
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ticketing';
} else {
    console.log('✅ .env file loaded successfully');
}

// Debug: Check if MONGODB_URI is loaded
console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found' : '❌ Not found');

if (!process.env.MONGODB_URI) {
    console.log('💡 Using default local MongoDB connection');
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ticketing';
}

// Import models AFTER environment is set up
const Event = require('../models/Event');

// Check if Event model is properly imported
console.log('📦 Event model:', Event ? '✅ Loaded' : '❌ Failed to load');

const seedEvents = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        console.log('📦 Connection string:', process.env.MONGODB_URI.replace(/:[^:@]{1,100}@/, ':******@'));
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing events
        const deleteResult = await Event.deleteMany({});
        console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing events`);

        // Create default events
        const events = [
            {
                name: "Tech Conference 2026",
                description: "The biggest tech conference in East Africa featuring keynote speakers from Google, Microsoft, and Safaricom. Network with 500+ tech professionals, attend workshops, and explore the latest in AI, cloud computing, and mobile development.",
                shortDescription: "East Africa's premier tech conference",
                date: new Date("2026-03-15T09:00:00"),
                endDate: new Date("2026-03-16T18:00:00"),
                venue: "KICC",
                address: "Harambe Avenue",
                city: "Nairobi",
                price: 2500,
                earlyBirdPrice: 2000,
                earlyBirdDeadline: new Date("2026-02-28"),
                capacity: 500,
                ticketsSold: 0,
                status: 'active',
                featured: true,
                category: "Conference",
                tags: ["tech", "programming", "AI", "networking"],
                organizer: "Tech Events Kenya",
                organizerEmail: "info@techevents.co.ke",
                organizerPhone: "+254700123456"
            },
            {
                name: "Startup Pitch Night",
                description: "Watch 10 innovative startups pitch to top investors. Network with founders, VCs, and angel investors. Cash prizes for winners!",
                shortDescription: "Where startups meet investors",
                date: new Date("2026-04-10T17:00:00"),
                endDate: new Date("2026-04-10T21:00:00"),
                venue: "iHub",
                address: "Senteu Plaza",
                city: "Nairobi",
                price: 1000,
                capacity: 200,
                ticketsSold: 0,
                status: 'active',
                featured: true,
                category: "Networking",
                tags: ["startup", "investing", "pitch"],
                organizer: "iHub",
                organizerEmail: "events@ihub.co.ke"
            },
            {
                name: "Mobile Development Workshop",
                description: "Hands-on workshop building Android and iOS apps with Kotlin and Swift. Bring your laptop!",
                shortDescription: "Learn mobile development",
                date: new Date("2026-05-05T09:00:00"),
                endDate: new Date("2026-05-07T17:00:00"),
                venue: "Moringa School",
                city: "Nairobi",
                price: 5000,
                capacity: 50,
                ticketsSold: 0,
                status: 'active',
                category: "Workshop",
                tags: ["mobile", "android", "ios", "coding"],
                organizer: "Moringa School"
            }
        ];

        const insertedEvents = await Event.insertMany(events);
        console.log(`✅ Created ${insertedEvents.length} events`);

        // List all events
        const allEvents = await Event.find({});
        console.log('\n📋 Events in database:');
        allEvents.forEach(event => {
            console.log(`   - ${event.name}: KES ${event.price} (${event.capacity - event.ticketsSold} tickets available)`);
            console.log(`     ID: ${event._id}`);
        });

        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error seeding events:', error);
        process.exit(1);
    }
};

seedEvents();