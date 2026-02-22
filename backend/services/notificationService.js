const nodemailer = require('nodemailer');
const config = require('../config/env');

// Email transporter
let emailTransporter = null;
try {
    if (config.email.user && config.email.pass) {
        emailTransporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: false,
            auth: {
                user: config.email.user,
                pass: config.email.pass
            }
        });
    }
} catch (error) {
    console.warn('Email transporter not configured:', error.message);
}

/**
 * Send email notification
 */
async function sendEmail(to, subject, html) {
    if (!emailTransporter) {
        console.warn('Email not configured. Skipping email notification.');
        return { sent: false, reason: 'Email not configured' };
    }

    try {
        const info = await emailTransporter.sendMail({
            from: `"${config.company.name}" <${config.email.user}>`,
            to,
            subject,
            html
        });
        return { sent: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error.message);
        return { sent: false, reason: error.message };
    }
}

/**
 * Send SMS via Fast2SMS (free API)
 */
async function sendSMS(phone, message) {
    if (!config.sms.apiKey) {
        console.warn('SMS not configured. Skipping SMS notification.');
        return { sent: false, reason: 'SMS not configured' };
    }

    try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': config.sms.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'q',
                message,
                language: 'english',
                flash: 0,
                numbers: phone
            })
        });

        const data = await response.json();
        return { sent: data.return, messageId: data.request_id };
    } catch (error) {
        console.error('SMS send error:', error.message);
        return { sent: false, reason: error.message };
    }
}

/**
 * Send notification across all configured channels
 */
async function sendNotification(notification) {
    const results = {};

    if (notification.channels?.email) {
        results.email = await sendEmail(
            notification.email,
            notification.title,
            `<h2>${notification.title}</h2><p>${notification.message}</p>`
        );
    }

    if (notification.channels?.sms) {
        results.sms = await sendSMS(notification.phone, `${notification.title}: ${notification.message}`);
    }

    return results;
}

module.exports = { sendEmail, sendSMS, sendNotification };
