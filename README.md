📚 TICKETMASTER KENYA - LOCAL DEPLOYMENT DOCUMENTATION
🎯 Project Overview
TicketMaster Kenya is a complete event ticketing system that runs entirely on localhost for development and testing purposes.

💻 System Architecture (Local Only)
text
┌─────────────────────────────────────────────┐
│           LOCALHOST ENVIRONMENT              │
├─────────────────────────────────────────────┤
│                                             │
│  🌐 Frontend: http://localhost:3000         │
│  🔧 Backend:  http://localhost:3000         │
│  💾 Database: mongodb://localhost:27017     │
│                                             │
└─────────────────────────────────────────────┘
✅ Features (Local Testing)
Feature	Status
User Registration/Login	✅ Working
Event Management	✅ Working
M-Pesa Sandbox Payments	✅ Working
Email Tickets with QR Codes	✅ Working
Admin Dashboard	✅ Working
AI Assistant	✅ Working
Ticket Validation	✅ Working
🛠️ Local Setup Instructions
Prerequisites:
Node.js installed

MongoDB installed locally

Git installed

Start the system:
bash
cd ticketing-backend
npm install
npm run dev
Access the application:
text
Main Site:       http://localhost:3000
Admin Dashboard: http://localhost:3000/admin.html
Test Credentials:
text
Admin Email: admin@ticketmaster.com
Admin Password: Admin123!
Test M-Pesa: 254708374149 (PIN: 174379)
📊 Local Database
Database: MongoDB running on localhost:27017

Database Name: ticketing

Collections: users, events, transactions, admins

🔧 Local Environment Configuration
env
MONGODB_URI=mongodb://localhost:27017/ticketing
PORT=3000
FRONTEND_URL=http://localhost:3000
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/callback
🎯 Project Status (Local Development)
text
✅ All features tested locally
✅ Database running on localhost
✅ Backend running on port 3000
✅ Frontend accessible via localhost
✅ Ready for local demonstration
📅 Date: April 2026
👨‍💻 Developer: James Mathenge
📍 Environment: Localhost Only

