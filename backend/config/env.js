require('dotenv').config();

// Sanitize JWT timespan values — strip surrounding quotes and validate format
const sanitizeTimespan = (value, fallback) => {
  if (!value) return fallback;
  // Strip surrounding single/double quotes (common Vercel env var issue)
  const cleaned = value.replace(/^["']|["']$/g, '').trim();
  // Validate: must be a number (seconds) or a timespan string like "1d", "20h", "60s"
  if (/^\d+$/.test(cleaned) || /^\d+[smhdwy]$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
};

module.exports = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ayurveda_erp',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  jwtExpire: sanitizeTimespan(process.env.JWT_EXPIRE, '1d'),
  jwtRefreshExpire: sanitizeTimespan(process.env.JWT_REFRESH_EXPIRE, '7d'),
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  sms: {
    apiKey: process.env.FAST2SMS_API_KEY
  },
  company: {
    name: process.env.COMPANY_NAME || 'Ayurveda Clinic',
    gstin: process.env.COMPANY_GSTIN || '',
    address: process.env.COMPANY_ADDRESS || '',
    phone: process.env.COMPANY_PHONE || '',
    email: process.env.COMPANY_EMAIL || ''
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '')
      : undefined
  }
};
