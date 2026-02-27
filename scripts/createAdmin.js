// scripts/createAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const admin = new Admin({
            username: 'admin',
            password: 'Admin123!',
            email: 'admin@ticketing.com'
        });
        
        await admin.save();
        console.log('✅ Admin created successfully');
        console.log('Username: admin');
        console.log('Password: Admin123!');
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createAdmin();