const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
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
    lat: {
        type: Number,
        required: true,
    },
    lng: {
        type: Number,
        required: true,
    },
    speed: {
        type: Number,
        default: 0,
        min: 0,
    },
    address: {
        type: String,
        default: '',
    },
    // Distance from previous point (km)
    distance_from_prev: {
        type: Number,
        default: 0,
    },
    battery: {
        type: Number,
        default: null,
    },
    voltage: {
        type: Number,
        default: null,
    },
    temperature: {
        type: Number,
        default: null,
    },
    bike_status: {
        type: String,
        enum: ['normal', 'fallen'],
        default: 'normal',
    },
    signal: {
        type: String,
        default: '',
    },
    time: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { timestamps: false });

// Compound index for efficient device history queries
locationSchema.index({ device: 1, time: -1 });
locationSchema.index({ device_id: 1, time: -1 });

module.exports = mongoose.model('Location', locationSchema);
