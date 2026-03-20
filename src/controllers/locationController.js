const Location = require('../models/Location');
const Device = require('../models/Device');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { haversineDistance, calculateTripStats, getTodayStr } = require('../utils/distanceCalculator');

const makeGoogleMapsUrl = (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === null || lng === null) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
};

const makeGoogleMapsDirectionsUrl = (points = []) => {
    if (!Array.isArray(points) || points.length < 2) return null;
    const coords = points.map(p => `${p.lat},${p.lng}`).join('/');
    return `https://www.google.com/maps/dir/${coords}`;
};

const samplePoints = (pts, max = 25) => {
    if (!Array.isArray(pts) || pts.length <= max) return pts;
    const out = [];
    const step = (pts.length - 1) / (max - 1);
    for (let i = 0; i < max; i++) {
        out.push(pts[Math.round(i * step)]);
    }
    return out;
};

// @desc    Push new location for a device (called by GPS hardware / simulator)
// @route   POST /api/locations/:deviceId/push
// @access  Private
exports.pushLocation = async (req, res) => {
    // Handle both single location and batch (array) of locations
    const isBatch = Array.isArray(req.body.locations);
    const locations = isBatch ? req.body.locations : [req.body];

    if (!Array.isArray(locations) || !locations.length) {
        return sendError(res, 'lat and lng are required, or provide locations array', 400);
    }

    const device = await Device.findOne({
        $or: [
            { _id: req.params.deviceId.match(/^[0-9a-fA-F]{24}$/) ? req.params.deviceId : null },
            { device_id: req.params.deviceId },
            { imei: req.params.deviceId },
        ].filter(Boolean)
    });

    if (!device) return sendError(res, 'Device not found', 404);

    const createdLocations = [];
    let totalDistanceAdded = 0;
    let lastLat = device.lat;
    let lastLng = device.lng;
    const today = getTodayStr();

    // Process each location
    for (const locData of locations) {
        const { lat, lng, speed = 0, battery, signal, address = '' } = locData;

        if (!lat || !lng) continue;

        // Calculate distance from last known position
        let distanceFromPrev = 0;
        if (lastLat && lastLng) {
            distanceFromPrev = haversineDistance(lastLat, lastLng, lat, lng);
        }

        // Create location entry
        const location = await Location.create({
            device: device._id,
            device_id: device.device_id,
            lat, lng, speed,
            address,
            distance_from_prev: distanceFromPrev,
            battery: battery ?? device.battery,
            signal: signal || device.signal,
            time: new Date(),
        });

        createdLocations.push(location);
        totalDistanceAdded += distanceFromPrev;
        lastLat = lat;
        lastLng = lng;
    }

    if (!createdLocations.length) {
        return sendError(res, 'No valid locations to record', 400);
    }

    // Update device once with all cumulative data
    const updateData = {
        lat: lastLat,
        lng: lastLng,
        speed: createdLocations[createdLocations.length - 1].speed,
        address: createdLocations[createdLocations.length - 1].address,
        last_seen: new Date(),
        $inc: { total_distance: totalDistanceAdded },
    };

    const allowedSignals = ['Strong','Good','Weak','No Signal'];
    if (locations[0].battery !== undefined) updateData.battery = locations[0].battery;
    if (locations[0].signal && allowedSignals.includes(locations[0].signal)) {
        // only propagate a valid signal value
        updateData.signal = locations[0].signal;
    }
    // invalid values are ignored rather than written to the device document

    // Reset distance_today if date changed
    if (device.distance_today_date !== today) {
        updateData.distance_today = totalDistanceAdded;
        updateData.distance_today_date = today;
    } else {
        updateData.$inc.distance_today = totalDistanceAdded;
    }

    // NOTE: Device status is intentionally NOT changed here.
    // Status (Active/Disabled) must only be changed manually by the user via Power button.

    // runValidators ensures enums (like signal) are checked at update-time.
    await Device.findByIdAndUpdate(device._id, updateData, { runValidators: true });

    // Format response
    const responseLocations = createdLocations.map((location, index) => {
        const locObj = location.toObject ? location.toObject() : location;
        let directionsUrl = null;

        // Build directions from previous position
        if (index === 0 && device.lat && device.lng) {
            directionsUrl = makeGoogleMapsDirectionsUrl([
                { lat: device.lat, lng: device.lng },
                { lat: locObj.lat, lng: locObj.lng }
            ]);
        } else if (index > 0) {
            const prevLoc = createdLocations[index - 1];
            directionsUrl = makeGoogleMapsDirectionsUrl([
                { lat: prevLoc.lat, lng: prevLoc.lng },
                { lat: locObj.lat, lng: locObj.lng }
            ]);
        } else {
            directionsUrl = makeGoogleMapsUrl(locObj.lat, locObj.lng);
        }

        const note = locObj.distance_from_prev ? `Distance from last point: ${parseFloat(locObj.distance_from_prev.toFixed(3))} km` : undefined;
        return { ...locObj, google_maps_url: directionsUrl, note };
    });

    const message = isBatch ? `${createdLocations.length} locations recorded` : 'Location recorded';
    return sendSuccess(res, { 
        data: isBatch ? responseLocations : responseLocations[0],
        count: createdLocations.length 
    }, message, 201);
};

// @desc    Get current/latest location of a device
// @route   GET /api/locations/:deviceId/current
// @access  Private
exports.getCurrentLocation = async (req, res) => {
    const device = await Device.findById(req.params.deviceId);
    if (!device) return sendError(res, 'Device not found', 404);

    const latest = await Location.findOne({ device: req.params.deviceId })
        .sort({ time: -1 });

    const deviceGoogleUrl = makeGoogleMapsUrl(device.lat, device.lng);
    const latestObj = latest ? (latest.toObject ? latest.toObject() : latest) : null;
    if (latestObj) latestObj.google_maps_url = makeGoogleMapsUrl(latestObj.lat, latestObj.lng);

    return sendSuccess(res, {
        data: {
            device_id: device.device_id,
            device_name: device.device_name,
            lat: device.lat,
            lng: device.lng,
            google_maps_url: deviceGoogleUrl,
            speed: device.speed,
            address: device.address,
            last_seen: device.last_seen,
            battery: device.battery,
            signal: device.signal,
            latest_log: latestObj,
        }
    }, 'Current location fetched');
};

// @desc    Get location history for a device
// @route   GET /api/locations/:deviceId/history
// @access  Private
exports.getHistory = async (req, res) => {
    const { from, to, limit = 500, page = 1 } = req.query;

    const filter = { device: req.params.deviceId };

    if (from || to) {
        filter.time = {};
        if (from) {
            filter.time.$gte = from.includes('T')
                ? new Date(from)
                : new Date(`${from}T00:00:00`);
        }
        if (to) {
            filter.time.$lte = to.includes('T')
                ? new Date(to)
                : new Date(`${to}T23:59:59`);
        }
    }

    const total = await Location.countDocuments(filter);
    const history = await Location.find(filter)
        .sort({ time: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Calculate trip stats using Haversine
    const stats = calculateTripStats(history);

    // Build one directions URL for the page of history (sample if too long)
    const coords = history.map(h => ({ lat: h.lat, lng: h.lng }));
    const sampled = samplePoints(coords, 25);
    const route_url = makeGoogleMapsDirectionsUrl(sampled);

    const historyObjs = history.map(h => {
        const obj = h.toObject ? h.toObject() : h;
        return {
            ...obj,
            device_id: obj.device,
            device_name: obj.device_id,
            device: undefined,
        };
    });

    return sendPaginated(res, { points: historyObjs, route_url }, total, page, limit, 'History fetched');
};

// @desc    Get location history WITH distance stats
// @route   GET /api/locations/:deviceId/history/stats
// @access  Private
exports.getHistoryWithStats = async (req, res) => {
    const { from, to } = req.query;

    const filter = { device: req.params.deviceId };
    if (from || to) {
        filter.time = {};
        if (from) {
            filter.time.$gte = from.includes('T')
                ? new Date(from)
                : new Date(`${from}T00:00:00`);
        }
        if (to) {
            filter.time.$lte = to.includes('T')
                ? new Date(to)
                : new Date(`${to}T23:59:59`);
        }
    }

    const history = await Location.find(filter).sort({ time: 1 });

    if (history.length === 0) {
        return sendSuccess(res, {
            data: [],
            stats: { distance: 0, duration: 0, maxSpeed: 0, avgSpeed: 0, pointCount: 0 }
        }, 'No history found for this period');
    }

    // Distance calculated server-side via Haversine
    const stats = calculateTripStats(history);

    const coords = history.map(h => ({ lat: h.lat, lng: h.lng }));
    const sampled = samplePoints(coords, 25);
    const route_url = makeGoogleMapsDirectionsUrl(sampled);

    const historyObjs = history.map(h => {
        const obj = h.toObject ? h.toObject() : h;
        return {
            ...obj,
            device_id: obj.device,
            device_name: obj.device_id,
            device: undefined,
        };
    });

    return sendSuccess(res, {
        data: historyObjs,
        stats: { ...stats, pointCount: history.length },
        route_url,
    }, 'History with stats fetched');
};

// @desc    Get all devices live locations
// @route   GET /api/locations/live
// @access  Private
exports.getAllLive = async (req, res) => {
    const devices = await Device.find({ status: { $ne: 'Disabled' } })
        .select('device_id device_name vehicle_id lat lng speed status battery signal last_seen address distance_today');

    const devicesWithUrls = devices.map(d => {
        const obj = d.toObject ? d.toObject() : d;
        obj.google_maps_url = makeGoogleMapsUrl(obj.lat, obj.lng);
        return obj;
    });

    return sendSuccess(res, { data: devicesWithUrls, count: devicesWithUrls.length }, 'Live locations fetched');
};

// @desc    Calculate distance between two points (utility endpoint)
// @route   POST /api/locations/distance/calculate
// @access  Private
exports.calculateDistance = async (req, res) => {
    const { lat1, lng1, lat2, lng2 } = req.body;

    if (!lat1 || !lng1 || !lat2 || !lng2) {
        return sendError(res, 'lat1, lng1, lat2, lng2 are all required', 400);
    }

    const distance = haversineDistance(
        parseFloat(lat1), parseFloat(lng1),
        parseFloat(lat2), parseFloat(lng2)
    );

    const from = { lat: parseFloat(lat1), lng: parseFloat(lng1) };
    const to = { lat: parseFloat(lat2), lng: parseFloat(lng2) };

    const route_url = makeGoogleMapsDirectionsUrl([from, to]) || makeGoogleMapsUrl(from.lat, from.lng);

    return sendSuccess(res, {
        data: {
            from,
            to,
            distance_km: distance,
            distance_m: parseFloat((distance * 1000).toFixed(1)),
            route_url,
        }
    }, 'Distance calculated');
};

// @desc    Calculate distance for an array of waypoints
// @route   POST /api/locations/distance/route
// @access  Private
exports.calculateRouteDistance = async (req, res) => {
    const { waypoints } = req.body; // Array of { lat, lng }

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
        return sendError(res, 'waypoints must be an array with at least 2 points', 400);
    }

    let totalDistance = 0;
    const segments = [];

    for (let i = 1; i < waypoints.length; i++) {
        const segDist = haversineDistance(
            waypoints[i - 1].lat, waypoints[i - 1].lng,
            waypoints[i].lat, waypoints[i].lng
        );
        totalDistance += segDist;
        segments.push({
            from: waypoints[i - 1],
            to: waypoints[i],
            distance_km: segDist,
        });
    }

    const sampled = samplePoints(waypoints, 25);
    const route_url = makeGoogleMapsDirectionsUrl(sampled);

    return sendSuccess(res, {
        data: {
            waypoints,
            segments,
            total_distance_km: parseFloat(totalDistance.toFixed(2)),
            total_distance_m: parseFloat((totalDistance * 1000).toFixed(1)),
            waypoint_count: waypoints.length,
            route_url,
        }
    }, 'Route distance calculated');
};
