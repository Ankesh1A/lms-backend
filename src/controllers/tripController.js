const Trip = require('../models/Trip');
const Location = require('../models/Location');
const Device = require('../models/Device');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { calculateTripStats } = require('../utils/distanceCalculator');

// @desc    Get all trips for a device
// @route   GET /api/trips/:deviceId
// @access  Private
exports.getDeviceTrips = async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    const filter = { device: req.params.deviceId };
    if (status) filter.status = status;

    const total = await Trip.countDocuments(filter);
    const trips = await Trip.find(filter)
        .sort({ start_time: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    return sendPaginated(res, trips, total, page, limit, 'Trips fetched');
};

// @desc    Get single trip with location points
// @route   GET /api/trips/detail/:tripId
// @access  Private
exports.getTripDetail = async (req, res) => {
    const trip = await Trip.findById(req.params.tripId).populate('device', 'device_name vehicle_id');
    if (!trip) return sendError(res, 'Trip not found', 404);

    // Get location points for this trip
    const locations = await Location.find({
        device: trip.device._id,
        time: { $gte: trip.start_time, $lte: trip.end_time || new Date() }
    }).sort({ time: 1 });

    const stats = calculateTripStats(locations);

    return sendSuccess(res, {
        data: {
            trip,
            locations,
            stats,
        }
    }, 'Trip detail fetched');
};

// @desc    Start a new trip
// @route   POST /api/trips/start/:deviceId
// @access  Private
exports.startTrip = async (req, res) => {
    const device = await Device.findById(req.params.deviceId);
    if (!device) return sendError(res, 'Device not found', 404);

    // End any ongoing trip for this device
    await Trip.updateMany(
        { device: device._id, status: 'ongoing' },
        { status: 'completed', end_time: new Date() }
    );

    const trip = await Trip.create({
        device: device._id,
        device_id: device.device_id,
        start_time: new Date(),
        start_location: {
            lat: device.lat,
            lng: device.lng,
            address: device.address,
        },
        status: 'ongoing',
    });

    return sendSuccess(res, { data: trip }, 'Trip started', 201);
};

// @desc    End a trip
// @route   PUT /api/trips/end/:tripId
// @access  Private
exports.endTrip = async (req, res) => {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return sendError(res, 'Trip not found', 404);
    if (trip.status === 'completed') return sendError(res, 'Trip already ended', 400);

    const device = await Device.findById(trip.device);

    // Calculate stats from location points
    const locations = await Location.find({
        device: trip.device,
        time: { $gte: trip.start_time }
    }).sort({ time: 1 });

    const stats = calculateTripStats(locations);

    trip.end_time = new Date();
    trip.end_location = {
        lat: device?.lat,
        lng: device?.lng,
        address: device?.address || '',
    };
    trip.distance = stats.distance;
    trip.duration = stats.duration;
    trip.max_speed = stats.maxSpeed;
    trip.avg_speed = stats.avgSpeed;
    trip.location_count = locations.length;
    trip.status = 'completed';
    await trip.save();

    return sendSuccess(res, { data: trip, stats }, 'Trip ended');
};
