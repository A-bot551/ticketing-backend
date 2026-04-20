const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function addAdmin() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ticketing');
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Check if admin exists
        const existing = await usersCollection.findOne({ email: 'admin@ticketmaster.com' });
        
        if (existing) {
            console.log('Admin already exists!');
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            
            // Insert admin
            await usersCollection.insertOne({
                name: 'Administrator',
                email: 'admin@ticketmaster.com',
                phone: '254700000000',
                password: hashedPassword,
                verified: true,
                createdAt: new Date()
            });
            console.log('✅ Admin created!');
        }
        
        // List all users
        const users = await usersCollection.find({}).toArray();
        console.log('Users in database:');
        users.forEach(u => console.log(`  - ${u.email}`));
        
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

addAdmin();