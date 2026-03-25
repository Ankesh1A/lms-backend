const express = require('express');
const router = express.Router();
const { getGeofences, createGeofence, updateGeofence, deleteGeofence } = require('../controllers/geofenceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getGeofences);
router.post('/', createGeofence);
router.put('/:id', updateGeofence);
router.delete('/:id', deleteGeofence);

module.exports = router;
