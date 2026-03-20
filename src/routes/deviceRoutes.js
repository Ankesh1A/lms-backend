const express = require('express');
const router = express.Router();
const {
    getDevices,
    getDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    toggleStatus,
    powerOff,
    powerOn,
    powerToggle,
    findDevice,
    getDashboardStats,
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

// PUBLIC — power on/off ke liye token nahi chahiye
router.post('/:id/power-off', powerOff);
router.post('/:id/power-on', powerOn);
// also expose a single toggle endpoint (new)
router.patch('/:id/power', powerToggle);
// Find device (vibrate on/off) — public
router.post('/:id/find', findDevice);
// Device status check bhi public kar diya (power status check ke liye)
router.get('/:id', getDevice);

// PROTECTED — iske liye token chahiye
router.use(protect);
router.get('/', getDevices);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
router.post('/:id/toggle-status', toggleStatus);
router.get('/stats/overview', getDashboardStats);

module.exports = router;