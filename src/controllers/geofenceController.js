const Geofence = require('../models/Geofence');
const Device = require('../models/Device');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');

// @desc    Get all geofences
// @route   GET /api/geofences
// @access  Private
exports.getGeofences = async (req, res) => {
    let filter = {};
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        filter.createdBy = req.user._id;
    }

    const { limit = 50, page = 1 } = req.query;
    
    const total = await Geofence.countDocuments(filter);
    const geofences = await Geofence.find(filter)
        .populate('devices', 'device_name device_id')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    return sendPaginated(res, geofences, total, page, limit, 'Geofences fetched');
};

// @desc    Create geofence
// @route   POST /api/geofences
// @access  Private
exports.createGeofence = async (req, res) => {
    const { name, devices, type, circle, polygon, isActive } = req.body;

    if (!name || !type) {
        return sendError(res, 'Name and type are required', 400);
    }

    if (type === 'circle' && (!circle || !circle.lat || !circle.lng || !circle.radius)) {
        return sendError(res, 'Circle parameters (lat, lng, radius) are required', 400);
    }
    if (type === 'polygon' && (!polygon || !Array.isArray(polygon) || polygon.length < 3)) {
        return sendError(res, 'Polygon parameters (array of at least 3 points) are required', 400);
    }

    // Verify devices belong to user (for non-admins)
    if (devices && devices.length > 0 && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        const userDevices = await Device.find({ _id: { $in: devices }, createdBy: req.user._id });
        if (userDevices.length !== devices.length) {
            return sendError(res, 'One or more devices do not belong to you', 403);
        }
    }

    const geofence = await Geofence.create({
        name,
        createdBy: req.user._id,
        devices: devices || [],
        type,
        circle: type === 'circle' ? circle : undefined,
        polygon: type === 'polygon' ? polygon : undefined,
        isActive: isActive !== undefined ? isActive : true,
    });

    return sendSuccess(res, geofence, 'Geofence created', 201);
};

// @desc    Update geofence
// @route   PUT /api/geofences/:id
// @access  Private
exports.updateGeofence = async (req, res) => {
    let geofence = await Geofence.findById(req.params.id);
    
    if (!geofence) {
        return sendError(res, 'Geofence not found', 404);
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && geofence.createdBy.toString() !== req.user._id.toString()) {
        return sendError(res, 'Not authorized', 403);
    }

    // Validate geofence data before updating
    const { name, type, circle, polygon, devices, isActive } = req.body;

    if (name && type) {
        if (type === 'circle' && (!circle || !circle.lat === undefined || !circle.lng === undefined || !circle.radius === undefined)) {
            return sendError(res, 'Circle parameters (lat, lng, radius) are required for circle type', 400);
        }
        if (type === 'polygon' && (!polygon || !Array.isArray(polygon) || polygon.length < 3)) {
            return sendError(res, 'Polygon parameters (array of at least 3 points) are required for polygon type', 400);
        }
    }

    // Verify devices belong to user (for non-admins)
    if (devices && devices.length > 0 && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        const userDevices = await Device.find({ _id: { $in: devices }, createdBy: req.user._id });
        if (userDevices.length !== devices.length) {
            return sendError(res, 'One or more devices do not belong to you', 403);
        }
    }

    geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    return sendSuccess(res, geofence, 'Geofence updated');
};

// @desc    Delete geofence
// @route   DELETE /api/geofences/:id
// @access  Private
exports.deleteGeofence = async (req, res) => {
    const geofence = await Geofence.findById(req.params.id);
    
    if (!geofence) {
        return sendError(res, 'Geofence not found', 404);
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && geofence.createdBy.toString() !== req.user._id.toString()) {
        return sendError(res, 'Not authorized', 403);
    }

    await geofence.deleteOne();
    return sendSuccess(res, null, 'Geofence deleted');
};
