const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
        index: true,
    },
    device_id: {
        type: String,
        required: true,
    },
    start_time: {
        type: Date,
        required: true,
    },
    end_time: {
        type: Date,
        default: null,
    },
    start_location: {
        lat: Number,
        lng: Number,
        address: String,
    },
    end_location: {
        lat: Number,
        lng: Number,
        address: String,
    },
    // Total distance in km (calculated via Haversine)
    distance: {
        type: Number,
        default: 0,
    },
    // Duration in minutes
    duration: {
        type: Number,
        default: 0,
    },
    max_speed: {
        type: Number,
        default: 0,
    },
    avg_speed: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['ongoing', 'completed'],
        default: 'ongoing',
    },
    // Snapshot of location points for this trip
    location_count: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

tripSchema.index({ device: 1, start_time: -1 });

module.exports = mongoose.model('Trip', tripSchema);
