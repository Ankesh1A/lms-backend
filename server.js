const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
require('express-async-errors');

// Load env vars
dotenv.config();

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route files
const authRoutes = require('./src/routes/authRoutes');
const deviceRoutes = require('./src/routes/deviceRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const tripRoutes = require('./src/routes/tripRoutes');
const firmwareRoutes = require('./src/routes/firmwareRoutes');

// Connect to DB
connectDB();

const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet());

// Rate limiting
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 200,
//     message: { success: false, message: 'Too many requests, please try again later.' }
// });
// app.use('/api', limiter);

// ─── Core Middleware ───────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── File Upload Middleware ─────────────────────────────
app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    tempFileDir: './temp',
    createParentPath: true,
    useTempFiles: true,
}));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── Health Check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'GPS Tracker API is running ',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── API Routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/firmware', firmwareRoutes);

// ─── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`\n GPS Tracker Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`  Health: http://localhost:${PORT}/api/health\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(' Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
});
