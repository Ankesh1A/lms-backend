const Device = require('../models/Device');

/**
 * @desc  GPS Hardware Device Authentication Middleware
 *
 *        Step 1: URL param (:deviceId) = MongoDB _id  → device dhundho
 *        Step 2: Header x-device-imei  = IMEI          → us device ke IMEI se match karo
 *
 *        Dono match karein → authorized (req.device set)
 *        Koi bhi fail ho  → 401 Unauthorized
 */
exports.deviceAuth = async (req, res, next) => {
    try {
        const deviceObjectId = req.params.deviceId;
        const imeiHeader = req.headers['x-device-imei'];

        // --- Step 1: Both fields are required ---
        if (!deviceObjectId) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — URL param mein device _id provide karo',
            });
        }

        if (!imeiHeader) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — Header mein x-device-imei provide karo',
            });
        }

        // Validate: _id must be a valid MongoDB ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(deviceObjectId)) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — URL mein valid MongoDB _id chahiye (24 hex chars)',
            });
        }

        // Validate: IMEI must be exactly 15 digits
        if (!/^\d{15}$/.test(imeiHeader)) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — x-device-imei exactly 15 digits hona chahiye',
            });
        }

        // --- Step 2: Find device by _id ---
        const device = await Device.findById(deviceObjectId);

        if (!device) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — yeh _id registered nahi hai',
            });
        }

        // --- Step 3: IMEI must match this device's stored IMEI ---
        if (device.imei !== imeiHeader) {
            return res.status(401).json({
                success: false,
                message: 'Device not authorized — IMEI is _id ke device se match nahi karta',
            });
        }

        // All checks passed — attach device and proceed
        req.device = device;
        next();

    } catch (err) {
        console.error('[deviceAuth] Error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during device authentication',
        });
    }
};
