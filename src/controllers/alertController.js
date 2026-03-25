const Alert = require('../models/Alert');
const Device = require('../models/Device');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');

// @desc    Get all alerts (can filter by device or user)
// @route   GET /api/alerts
// @access  Private
exports.getAlerts = async (req, res) => {
    const { deviceId, type, isRead, limit = 50, page = 1 } = req.query;
    const filter = {};

    // If user is not super_admin or admin, they can only see alerts for their devices
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        const userDevices = await Device.find({ createdBy: req.user._id }).select('_id');
        filter.device = { $in: userDevices.map(d => d._id) };
    }

    if (deviceId) {
        // If a specific device is requested, verify access
        if (filter.device && !filter.device.$in.find(id => id.toString() === deviceId)) {
            return sendError(res, 'Not authorized to view alerts for this device', 403);
        }
        filter.device = deviceId;
    }

    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const total = await Alert.countDocuments(filter);
    const alerts = await Alert.find(filter)
        .sort({ time: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('device', 'device_name device_id');

    return sendPaginated(res, alerts, total, page, limit, 'Alerts fetched successfully');
};

// @desc    Mark alert as read
// @route   PUT /api/alerts/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return sendError(res, 'Alert not found', 404);

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        const device = await Device.findOne({ _id: alert.device, createdBy: req.user._id });
        if (!device) return sendError(res, 'Not authorized to update this alert', 403);
    }

    alert.isRead = true;
    await alert.save();

    return sendSuccess(res, alert, 'Alert marked as read');
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
exports.deleteAlert = async (req, res) => {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return sendError(res, 'Alert not found', 404);

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        const device = await Device.findOne({ _id: alert.device, createdBy: req.user._id });
        if (!device) return sendError(res, 'Not authorized to delete this alert', 403);
    }

    await alert.deleteOne();

    return sendSuccess(res, null, 'Alert deleted successfully');
};
