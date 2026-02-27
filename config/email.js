// config/email.js
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Generate QR code as data URL
const generateQRCode = async (data) => {
    try {
        // Create ticket data for QR
        const ticketData = JSON.stringify({
            receipt: data.receiptNumber,
            event: data.event.name,
            name: data.name,
            date: data.date,
            tickets: data.tickets
        });
        
        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(ticketData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#667eea',
                light: '#ffffff'
            }
        });
        
        return qrCodeDataURL;
    } catch (error) {
        console.error('❌ QR Code generation error:', error);
        return null;
    }
};

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Generate beautiful ticket email HTML with QR code
const generateTicketHTML = async (ticketData) => {
    const { name, event, tickets, amount, receiptNumber, date, phone } = ticketData;
    
    // Generate QR code
    const qrCodeDataURL = await generateQRCode(ticketData);
    
    // Format date nicely
    const eventDate = new Date(event.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const eventTime = new Date(event.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 32px;
                margin-bottom: 10px;
            }
            .header p {
                margin: 0;
                opacity: 0.9;
                font-size: 18px;
            }
            .content {
                padding: 30px;
            }
            .ticket {
                background: #f8f9fa;
                border: 3px dashed #667eea;
                border-radius: 15px;
                padding: 25px;
                margin: 20px 0;
                position: relative;
            }
            .ticket:before {
                content: '🎟️';
                position: absolute;
                top: -15px;
                left: 20px;
                background: white;
                padding: 0 10px;
                font-size: 24px;
            }
            .event-name {
                color: #667eea;
                font-size: 24px;
                font-weight: bold;
                margin: 0 0 15px 0;
            }
            .detail-row {
                display: flex;
                margin-bottom: 12px;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 8px;
            }
            .detail-label {
                flex: 0 0 120px;
                font-weight: bold;
                color: #555;
            }
            .detail-value {
                flex: 1;
                color: #333;
            }
            .qr-section {
                text-align: center;
                margin: 25px 0 15px;
                padding: 20px;
                background: white;
                border-radius: 10px;
            }
            .qr-code {
                width: 200px;
                height: 200px;
                margin: 0 auto 15px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .qr-code img {
                width: 100%;
                height: 100%;
                border-radius: 10px;
            }
            .qr-placeholder {
                width: 150px;
                height: 150px;
                background: #e9ecef;
                margin: 0 auto 15px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
            }
            .button {
                display: inline-block;
                background: #28a745;
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 25px;
                font-weight: bold;
                margin-top: 20px;
                border: none;
                cursor: pointer;
                font-size: 16px;
            }
            .button.secondary {
                background: #6c757d;
                margin-left: 10px;
            }
            .button-group {
                text-align: center;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                color: #666;
                font-size: 12px;
            }
            .badge {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 14px;
                margin-bottom: 15px;
            }
            .validation-link {
                background: #e8f5e9;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
            .validation-link a {
                color: #28a745;
                text-decoration: none;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Your E-Ticket is Ready!</h1>
                <p>Thank you for your purchase</p>
            </div>
            
            <div class="content">
                <p>Hello <strong>${name}</strong>,</p>
                <p>Your payment was successful! Here are your ticket details:</p>
                
                <div class="ticket">
                    <div class="event-name">${event.name}</div>
                    
                    <div class="detail-row">
                        <span class="detail-label">📅 Date:</span>
                        <span class="detail-value">${eventDate}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">⏰ Time:</span>
                        <span class="detail-value">${eventTime}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">📍 Venue:</span>
                        <span class="detail-value">${event.venue}, ${event.city || 'Nairobi'}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">🎫 Tickets:</span>
                        <span class="detail-value">${tickets} ticket(s)</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">💰 Amount:</span>
                        <span class="detail-value">KES ${amount.toLocaleString()}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">🧾 Receipt:</span>
                        <span class="detail-value">${receiptNumber}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">📱 Phone:</span>
                        <span class="detail-value">${phone || 'N/A'}</span>
                    </div>
                    
                    <div class="qr-section">
                        ${qrCodeDataURL ? 
                            `<div class="qr-code">
                                <img src="${qrCodeDataURL}" alt="Ticket QR Code">
                            </div>` : 
                            `<div class="qr-placeholder">📱</div>`
                        }
                        <p style="color: #666; margin: 10px 0;">Scan this QR code at the entrance</p>
                        <span class="badge">PAID</span>
                    </div>
                    
                    <div class="validation-link">
                        <p>📱 <strong>Mobile Ticket:</strong></p>
                        <p><a href="${process.env.FRONTEND_URL}/ticket/${receiptNumber}" target="_blank">View your ticket online</a></p>
                    </div>
                </div>
                
                <div class="button-group">
                    <a href="#" class="button" onclick="window.print()">🖨️ Print Ticket</a>
                    <a href="${process.env.FRONTEND_URL}/download/${receiptNumber}" class="button secondary">📥 Download</a>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; color: #856404; margin: 20px 0;">
                    <p><strong>📌 Important Instructions:</strong></p>
                    <ul style="margin-left: 20px;">
                        <li>Bring this ticket (printed or on your phone) to the event</li>
                        <li>The QR code will be scanned for entry</li>
                        <li>Arrive at least 30 minutes before the event starts</li>
                        <li>This ticket is non-refundable and non-transferable</li>
                    </ul>
                </div>
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; color: #004085; margin: 20px 0;">
                    <p><strong>📍 Event Location:</strong></p>
                    <p>${event.venue}<br>${event.address || 'Nairobi'}, Kenya</p>
                    <p><a href="https://maps.google.com/?q=${encodeURIComponent(event.venue + ', Nairobi')}" style="color: #004085;">View on Google Maps →</a></p>
                </div>
                
                <p>We look forward to seeing you at the event!</p>
                
                <p>Best regards,<br><strong>Tech Events Team</strong></p>
                
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                    For any queries, contact us at support@techevents.co.ke or call +254 700 123456
                </p>
            </div>
            
            <div class="footer">
                <p>© 2026 Tech Events Kenya. All rights reserved.</p>
                <p>This email was sent to ${ticketData.email}</p>
                <p style="margin-top: 10px;">
                    <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #666;">Unsubscribe</a> | 
                    <a href="${process.env.FRONTEND_URL}/privacy" style="color: #666;">Privacy Policy</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Send ticket email with QR code
const sendTicketEmail = async (ticketData) => {
    try {
        console.log('📧 Preparing to send email to:', ticketData.email);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Generate HTML with QR code
        const htmlContent = await generateTicketHTML(ticketData);

        const mailOptions = {
            from: `"Tech Events" <${process.env.EMAIL_USER}>`,
            to: ticketData.email,
            subject: `🎟️ Your Ticket for ${ticketData.event.name} - Receipt: ${ticketData.receiptNumber}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `ticket-${ticketData.receiptNumber}.txt`,
                    content: `TICKET FOR ${ticketData.event.name}\n\nReceipt: ${ticketData.receiptNumber}\nName: ${ticketData.name}\nTickets: ${ticketData.tickets}\nAmount: KES ${ticketData.amount}\nDate: ${new Date(ticketData.date).toLocaleString()}`,
                    contentType: 'text/plain'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        
        return { 
            success: true, 
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code
        };
    }
};

// Send bulk emails (for admin use)
const sendBulkEmails = async (emailsList) => {
    const results = [];
    for (const emailData of emailsList) {
        const result = await sendTicketEmail(emailData);
        results.push(result);
        // Wait 1 second between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
};

// Test email configuration
const testEmailConfig = async () => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        await transporter.verify();
        console.log('✅ Email configuration is valid');
        return true;
    } catch (error) {
        console.error('❌ Email configuration invalid:', error);
        return false;
    }
};

module.exports = { 
    sendTicketEmail, 
    sendBulkEmails,
    testEmailConfig,
    generateQRCode 
};