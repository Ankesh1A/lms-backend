/**
 * Haversine formula - calculates straight-line distance between two lat/lng points
 * Returns distance in kilometers
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(4));
};

/**
 * Calculate total distance for an array of location points
 * @param {Array} points - Array of { lat, lng } objects
 * @returns {number} Total distance in km
 */
const calculateTotalDistance = (points) => {
    if (!points || points.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += haversineDistance(
            points[i - 1].lat, points[i - 1].lng,
            points[i].lat, points[i].lng
        );
    }
    return parseFloat(total.toFixed(2));
};



const calculateTripStats = (points) => {
    if (!points || points.length < 2) {
        return { distance: 0, duration: 0, maxSpeed: 0, avgSpeed: 0 };
    }

    const distance = calculateTotalDistance(points);

    const startTime = new Date(points[0].time);
    const endTime = new Date(points[points.length - 1].time);
    const duration = Math.round((endTime - startTime) / 60000); // minutes

    const speeds = points.map(p => p.speed || 0).filter(s => s > 0);
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length > 0
        ? parseFloat((speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1))
        : 0;

    return { distance, duration, maxSpeed, avgSpeed };
};

/**
 * Get today's date string in YYYY-MM-DD format
 */


const getTodayStr = () => new Date().toISOString().split('T')[0];


module.exports = {
    haversineDistance,
    calculateTotalDistance,
    calculateTripStats,
    getTodayStr,
};
