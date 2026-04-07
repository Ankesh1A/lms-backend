const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
        index: true,
    },
    device_id: {
        type: String,
        required: true,
        index: true,
    },
    geofence: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Geofence',
        default: null,
    },
    type: {
        type: String,
        enum: ['BATTERY_LOW', 'HIGH_VOLTAGE', 'HIGH_TEMPERATURE', 'FALL_DETECTED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'SPEEDING'],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    lat: {
        type: Number,
        default: null,
    },
    lng: {
        type: Number,
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    time: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
