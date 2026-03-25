const express = require('express');
const router = express.Router();
const { getAlerts, markAsRead, deleteAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAlerts);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteAlert);

module.exports = router;
