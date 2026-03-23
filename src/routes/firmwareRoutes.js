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
const { deviceAuth } = require('../middleware/deviceAuth');

router.get('/download/:device_id',deviceAuth, downloadFirmware);
router.get('/latest/:device_id',deviceAuth, getLatestFirmware);
 router.use(protect);
router.post('/upload', uploadFirmware);
router.get('/versions/:device_id', getFirmwareVersions);
router.patch('/status/:device_id', updateFirmwareStatus);
router.get('/:device_id/:version', getFirmwareByVersion);
router.delete('/:device_id/:public_id', deleteFirmware);

module.exports = router;
