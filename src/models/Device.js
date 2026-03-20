const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: [true, 'Device ID is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    device_name: {
        type: String,
        required: [true, 'Device name is required'],
        trim: true,
        maxlength: [100, 'Device name cannot exceed 100 characters'],
    },
    imei: {
        type: String,
        required: [true, 'IMEI is required'],
        unique: true,
        trim: true,
        match: [/^\d{15}$/, 'IMEI must be exactly 15 digits'],
    },
    mobile_num: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true,
    },
    vehicle_id: {
        type: String,
        required: [true, 'Vehicle registration ID is required'],
        trim: true,
        uppercase: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Disabled'],
        default: 'Active',
    },
    plan_validity: {
        type: Date,
        required: [true, 'Plan validity date is required'],
    },
    battery: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
    },
    signal: {
        type: String,
        enum: ['Strong', 'Good', 'Weak', 'No Signal'],
        default: 'Good',
    },
    speed: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Current location
    lat: {
        type: Number,
        default: null,
    },
    lng: {
        type: Number,
        default: null,
    },
    address: {
        type: String,
        default: '',
    },
    last_seen: {
        type: Date,
        default: null,
    },
    // Total distance driven (km) - updated on each location push
    total_distance: {
        type: Number,
        default: 0,
    },
    // Distance driven today (km)
    distance_today: {
        type: Number,
        default: 0,
    },
    distance_today_date: {
        type: String, // YYYY-MM-DD
        default: '',
    },
    registered_on: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Firmware management
    firmware_version: {
        type: String,
        default: '1.0.0',
    },
    firmware_url: {
        type: String,
        default: null,
    },
    firmware_public_id: {
        type: String,
        default: null,
    },
    firmware_file_name: {
        type: String,
        default: null,
    },
    firmware_size: {
        type: Number,
        default: 0,
    },
    firmware_updated_at: {
        type: Date,
        default: null,
    },
    firmware_update_status: {
        type: String,
        enum: ['None', 'Pending', 'In Progress', 'Failed', 'Success'],
        default: 'None',
    },
    // Find Device (vibrate) status
    findStatus: {
        type: String,
        enum: ['on', 'off'],
        default: 'off',
    },
}, { timestamps: true });

// Virtual for days until plan expiry
deviceSchema.virtual('plan_days_remaining').get(function () {
    if (!this.plan_validity) return null;
    const diff = (new Date(this.plan_validity) - new Date()) / 86400000;
    return Math.ceil(diff);
});

deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Device', deviceSchema);
