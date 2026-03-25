const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Geofence name is required'],
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    devices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
    }],
    type: {
        type: String,
        enum: ['circle', 'polygon'],
        required: true,
    },
    circle: {
        lat: Number,
        lng: Number,
        radius: Number, // in meters
    },
    polygon: [{
        lat: Number,
        lng: Number,
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Geofence', geofenceSchema);
