const express = require('express');
const router = express.Router();
const {
    uploadFirmware,
    downloadFirmware,
    getLatestFirmware,
    getFirmwareByVersion,
    deleteFirmware,
    updateFirmwareStatus,
    getFirmwareVersions,
} = require('../controllers/firmwareController');
const { protect } = require('../middleware/auth');

// PUBLIC - Device can download firmware without auth
router.get('/download/:device_id', downloadFirmware);

// PROTECTED - require authentication
// router.use(protect);

// Upload new firmware (POST must come before GET)
router.post('/upload', uploadFirmware);

// More specific routes BEFORE generic /:device_id/:* routes
// Get latest firmware info
router.get('/latest/:device_id', getLatestFirmware);

// Get all versions for device (MORE SPECIFIC - comes before /:device_id/:version)
router.get('/versions/:device_id', getFirmwareVersions);

// Update firmware status (PATCH before DELETE)
router.patch('/status/:device_id', updateFirmwareStatus);

// Get specific version
router.get('/:device_id/:version', getFirmwareByVersion);

// Delete firmware version
router.delete('/:device_id/:public_id', deleteFirmware);

module.exports = router;
