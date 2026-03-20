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

//  PUBLIC — GPS device bina token ke push kar sakta hai
router.post('/:deviceId/push', pushLocation);
router.get('/:deviceId/history', getHistory);
// 🔒 PROTECTED — in sab ke liye token chahiye
router.use(protect);
router.post('/distance/calculate', calculateDistance);
router.post('/distance/route', calculateRouteDistance);
router.get('/live', getAllLive);
router.get('/:deviceId/current', getCurrentLocation);

router.get('/:deviceId/history/stats', getHistoryWithStats);

module.exports = router;