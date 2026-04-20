const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const admins = await Admin.find({});
        console.log('Admins found:', admins.map(a => ({ username: a.username, email: a.email })));
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkAdmin();