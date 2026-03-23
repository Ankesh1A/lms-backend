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

router.use(protect);
router.post('/:id/power-off', powerOff);
router.post('/:id/power-on', powerOn);
router.patch('/:id/power', powerToggle);
router.post('/:id/find', findDevice);
router.get('/:id', getDevice);
router.get('/', getDevices);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
router.post('/:id/toggle-status', toggleStatus);
router.get('/stats/overview', getDashboardStats);

module.exports = router;