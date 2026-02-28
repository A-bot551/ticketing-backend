// create-admin.js
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function createAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('⚠️ Admin already exists!');
            console.log('Username: admin');
            console.log('Password: Admin123!');
            mongoose.disconnect();
            return;
        }

        // Create new admin
        const admin = new Admin({
            username: 'admin',
            password: 'Admin123!',
            email: 'jamesmathenge154@gmail.com'
        });

        await admin.save();
        console.log('✅ Admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Login Credentials:');
        console.log('   Username: admin');
        console.log('   Password: Admin123!');
        console.log('   Email: jamesmathenge154@gmail.com');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━');

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createAdmin();