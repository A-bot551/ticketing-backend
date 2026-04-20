// config/email.js
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const sendTicketEmail = async (ticketData) => {
    try {
        console.log('📧 Preparing to send ticket email to:', ticketData.email);
        console.log('🔍 Has QR code:', ticketData.qrCode ? '✅ Yes' : '❌ No');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Generate QR code buffer if not provided
        let qrCodeBuffer;
        if (ticketData.qrCode && ticketData.qrCode.startsWith('data:image')) {
            // Convert base64 to buffer
            const base64Data = ticketData.qrCode.replace(/^data:image\/png;base64,/, '');
            qrCodeBuffer = Buffer.from(base64Data, 'base64');
        } else {
            // Generate new QR code
            const qrData = JSON.stringify({
                receipt: ticketData.receiptNumber,
                event: ticketData.event.name,
                name: ticketData.name,
                date: new Date(ticketData.event.date).toLocaleDateString(),
                tickets: ticketData.tickets
            });
            qrCodeBuffer = await QRCode.toBuffer(qrData, { width: 250, margin: 2 });
        }

        const eventDate = new Date(ticketData.event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
        <h1>🎫 Your Ticket is Ready!</h1>
        <p>Thank you for choosing TicketMaster Kenya</p>
    </div>
    <div style="padding: 20px;">
        <h2>Hello ${ticketData.name},</h2>
        <p>Your payment has been confirmed. Here are your ticket details:</p>

        <div style="border: 2px solid #667eea; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #667eea; text-align: center;">${ticketData.event.name}</h3>
            <p><strong>📅 Date:</strong> ${eventDate}</p>
            <p><strong>📍 Venue:</strong> ${ticketData.event.venue}</p>
            <p><strong>🎟️ Tickets:</strong> ${ticketData.tickets}</p>
            <p><strong>💰 Amount:</strong> KES ${ticketData.amount.toLocaleString()}</p>
            <p><strong>🧾 Receipt:</strong> ${ticketData.receiptNumber}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <p><strong>🔍 Your QR Code is attached below</strong></p>
            <p style="font-size: 12px; color: #666;">Please save or print this QR code. It will be scanned at the entrance.</p>
        </div>

        <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 20px;">
            <p style="color: #856404; margin: 0;"><strong>📌 Important:</strong> Please bring this ticket (printed or on your phone) to the event.</p>
        </div>
    </div>
    <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px;">
        <p>© 2026 TicketMaster Kenya</p>
    </div>
</body>
</html>
        `;

        const mailOptions = {
            from: `"TicketMaster Kenya" <${process.env.EMAIL_USER}>`,
            to: ticketData.email,
            subject: `🎟️ Your Ticket for ${ticketData.event.name} - Receipt: ${ticketData.receiptNumber}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `QR_Code_${ticketData.receiptNumber}.png`,
                    content: qrCodeBuffer,
                    cid: 'qrcode'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendTicketEmail };