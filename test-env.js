require('dotenv').config();
console.log('MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? '✅ Loaded' : '❌ Missing');
console.log('MPESA_CONSUMER_SECRET:', process.env.MPESA_CONSUMER_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('MPESA_SHORTCODE:', process.env.MPESA_SHORTCODE || '❌ Missing');
console.log('MPESA_PASSKEY:', process.env.MPESA_PASSKEY ? '✅ Loaded' : '❌ Missing');
console.log('MPESA_CALLBACK_URL:', process.env.MPESA_CALLBACK_URL || '❌ Missing');