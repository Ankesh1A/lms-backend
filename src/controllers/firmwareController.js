const cloudinary = require('../config/cloudinary');
const Device = require('../models/Device');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Upload new firmware version
// @route   POST /api/firmware/upload
// @access  Private (Admin only)
exports.uploadFirmware = async (req, res) => {
    let tempPath = null;
    try {
        if (!req.files || !req.files.firmware) {
            return sendError(res, 'No firmware file uploaded', 400);
        }

        const { device_id, version } = req.body;

        if (!device_id || !version) {
            return sendError(res, 'Device ID and version are required', 400);
        }

        const device = await Device.findById(device_id);
        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        const firmwareFile = req.files.firmware;
        const fileExtension = path.extname(firmwareFile.name);

        // Check file size (max 100MB)
        if (firmwareFile.size > 100 * 1024 * 1024) {
            return sendError(res, 'File size exceeds 100MB limit', 400);
        }

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save file temporarily without extension to bypass Cloudinary restrictions
        const timestamp = Date.now();
        tempPath = path.join(tempDir, `${timestamp}_firmware-v${version}`);
        await firmwareFile.mv(tempPath);

        // Upload to Cloudinary without extension in public_id
        const uploadResult = await cloudinary.uploader.upload(tempPath, {
            upload_preset: 'firmware_upload', // Use the Cloudinary preset we created
            resource_type: 'raw',
            public_id: `firmware-v${version}`, // Store without .bin extension
            folder: `gps-firmware/${device.vehicle_id}`,
            overwrite: true,
            tags: ['firmware', device.device_id, `v${version}`],
            context: `original_name=${firmwareFile.name}|file_extension=${fileExtension}`
        });

        // Fix signal validation issue - convert numeric signal to valid enum
        if (device.signal) {
            const validSignals = ['Strong', 'Good', 'Weak', 'No Signal'];
            if (!validSignals.includes(device.signal)) {
                const signalMap = {
                    '1': 'Strong',
                    '2': 'Good',
                    '3': 'Weak',
                    '4': 'No Signal'
                };
                device.signal = signalMap[String(device.signal)] || 'Good';
            }
        }

        // Update device with new firmware info
        device.firmware_version = version;
        device.firmware_url = uploadResult.secure_url;
        device.firmware_public_id = uploadResult.public_id;
        device.firmware_file_name = firmwareFile.name; // Keep original filename
        device.firmware_size = firmwareFile.size;
        device.firmware_updated_at = new Date();
        device.firmware_update_status = 'None';

        await device.save();

        return sendSuccess(res, {
            data: {
                device_id: device._id,
                version: device.firmware_version,
                url: device.firmware_url,
                file_size: device.firmware_size,
                uploaded_at: device.firmware_updated_at,
            }
        }, 'Firmware uploaded successfully');

    } catch (error) {
        // Clean up temp file if exists
        if (tempPath && fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
        return sendError(res, `Upload failed: ${error.message}`, 500);
    }
};

// @desc    Download firmware for device
// @route   GET /api/firmware/download/:device_id
// @access  Private
exports.downloadFirmware = async (req, res) => {
    try {
        const device = await Device.findById(req.params.device_id);

        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        if (!device.firmware_url) {
            return sendError(res, 'No firmware available for this device', 404);
        }

        // Log download
        device.firmware_update_status = 'In Progress';
        await device.save();

        // Get original filename (stored during upload)
        const originalFileName = device.firmware_file_name || `firmware-v${device.firmware_version}.bin`;

        // Fetch file from Cloudinary URL
        const cloudinaryRequest = https.get(device.firmware_url, (cloudinaryResponse) => {
            if (cloudinaryResponse.statusCode !== 200) {
                return sendError(res, `Failed to fetch firmware: ${cloudinaryResponse.statusCode}`, 500);
            }

            // Set response headers BEFORE piping - with proper filename
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', cloudinaryResponse.headers['content-length'] || 0);
            res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
            
            // Pipe Cloudinary response to client response
            cloudinaryResponse.pipe(res);
        });

        cloudinaryRequest.on('error', (error) => {
            if (!res.headersSent) {
                return sendError(res, `Download failed: ${error.message}`, 500);
            }
            res.end();
        });

    } catch (error) {
        if (!res.headersSent) {
            return sendError(res, error.message, 500);
        }
        res.end();
    }
};

// @desc    Get latest firmware info for device
// @route   GET /api/firmware/latest/:device_id
// @access  Private
exports.getLatestFirmware = async (req, res) => {
    try {
        const device = await Device.findById(req.params.device_id);

        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        return sendSuccess(res, {
            data: {
                device_id: device._id,
                device_name: device.device_name,
                current_version: device.firmware_version,
                firmware_url: device.firmware_url,
                firmware_file_name: device.firmware_file_name,
                firmware_size: device.firmware_size,
                last_updated: device.firmware_updated_at,
                update_status: device.firmware_update_status,
            }
        }, 'Firmware info retrieved');

    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// @desc    Get firmware by version
// @route   GET /api/firmware/:device_id/:version
// @access  Private
exports.getFirmwareByVersion = async (req, res) => {
    try {
        const { device_id, version } = req.params;

        const device = await Device.findById(device_id);
        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        // Query Cloudinary for this version
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: `gps-firmware/${device.vehicle_id}/firmware-v${version}`,
        });

        if (result.resources.length === 0) {
            return sendError(res, `Firmware version ${version} not found`, 404);
        }

        const firmwareFile = result.resources[0];

        // derive original filename from context if available
        let origName = firmwareFile.original_filename || firmwareFile.public_id.replace('firmware-v', '');
        if (firmwareFile.context) {
            if (typeof firmwareFile.context === 'string') {
                // parse key=value pairs
                const pairs = firmwareFile.context.split('|');
                pairs.forEach(p => {
                    const [k, v] = p.split('=');
                    if (k === 'original_name' && v) origName = v;
                });
            } else if (firmwareFile.context.custom && firmwareFile.context.custom.original_name) {
                origName = firmwareFile.context.custom.original_name;
            }
        }

        return sendSuccess(res, {
            data: {
                version: version,
                url: firmwareFile.secure_url,
                size: firmwareFile.bytes,
                created_at: firmwareFile.created_at,
                public_id: firmwareFile.public_id,
                original_filename: origName,
            }
        }, 'Firmware version retrieved');

    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// @desc    Delete firmware version
// @route   DELETE /api/firmware/:device_id/:public_id
// @access  Private (Admin only)
exports.deleteFirmware = async (req, res) => {
    try {
        const { device_id, public_id } = req.params;

        const device = await Device.findById(device_id);
        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(public_id, { resource_type: 'raw' });

        // If this was the current firmware, reset it
        if (device.firmware_public_id === public_id) {
            device.firmware_version = '1.0.0';
            device.firmware_url = null;
            device.firmware_public_id = null;
            device.firmware_file_name = null;
            device.firmware_size = 0;
            device.firmware_updated_at = null;
            await device.save();
        }

        return sendSuccess(res, {}, 'Firmware deleted successfully');

    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// @desc    Update firmware status
// @route   PATCH /api/firmware/status/:device_id
// @access  Private
exports.updateFirmwareStatus = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { status } = req.body;

        if (!['None', 'Pending', 'In Progress', 'Failed', 'Success'].includes(status)) {
            return sendError(res, 'Invalid status value', 400);
        }

        const device = await Device.findByIdAndUpdate(
            device_id,
            { firmware_update_status: status },
            { new: true }
        );

        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        return sendSuccess(res, {
            data: {
                device_id: device._id,
                status: device.firmware_update_status,
                updated_at: new Date(),
            }
        }, 'Firmware status updated');

    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// @desc    Get all firmware versions for a device
// @route   GET /api/firmware/versions/:device_id
// @access  Private
exports.getFirmwareVersions = async (req, res) => {
    try {
        const device = await Device.findById(req.params.device_id);

        if (!device) {
            return sendError(res, 'Device not found', 404);
        }

        // Query all firmwares for this device
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: `gps-firmware/${device.vehicle_id}`,
            max_results: 500,
        });

        const versions = result.resources.map(file => {
            // try to get original_name from context metadata
            let origName = file.original_filename || file.public_id.replace('firmware-v', '');
            if (file.context) {
                if (typeof file.context === 'string') {
                    const pairs = file.context.split('|');
                    pairs.forEach(p => {
                        const [k, v] = p.split('=');
                        if (k === 'original_name' && v) origName = v;
                    });
                } else if (file.context.custom && file.context.custom.original_name) {
                    origName = file.context.custom.original_name;
                }
            }
            return {
                version: file.public_id.replace('firmware-v', ''),
                url: file.secure_url,
                size: file.bytes,
                created_at: file.created_at,
                public_id: file.public_id,
                original_filename: origName,
            };
        });

        return sendSuccess(res, {
            data: {
                device_id: device._id,
                vehicle_id: device.vehicle_id,
                total_versions: versions.length,
                versions: versions,
            }
        }, 'Firmware versions retrieved');

    } catch (error) {
        return sendError(res, error.message, 500);
    }
};
