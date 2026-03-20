const express = require('express');
const router = express.Router();
const { getDeviceTrips, getTripDetail, startTrip, endTrip } = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/detail/:tripId', getTripDetail);
router.get('/:deviceId', getDeviceTrips);
router.post('/start/:deviceId', startTrip);
router.put('/end/:tripId', endTrip);

module.exports = router;
