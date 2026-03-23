const express = require('express');
const router = express.Router();
const {
    pushLocation,
    getCurrentLocation,
    getHistory,
    getHistoryWithStats,
    getAllLive,
    calculateDistance,
    calculateRouteDistance,
} = require('../controllers/locationController');
const { protect } = require('../middleware/auth');
const { deviceAuth } = require('../middleware/deviceAuth');


router.post('/:deviceId/push',deviceAuth, pushLocation);
router.use(protect);
router.get('/:deviceId/history', getHistory);
router.post('/distance/calculate', calculateDistance);
router.post('/distance/route', calculateRouteDistance);
router.get('/live', getAllLive);
router.get('/:deviceId/current', getCurrentLocation);

router.get('/:deviceId/history/stats', getHistoryWithStats);

module.exports = router;