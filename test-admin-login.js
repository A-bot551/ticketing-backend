const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function testAdminLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const admin = await Admin.findOne({ username: 'admin@ticketmaster.com' });
        if (!admin) {
            console.log('Admin not found');
            return;
        }
        
        const isValid = await admin.comparePassword('Admin123!');
        console.log('Password valid:', isValid);
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testAdminLogin();