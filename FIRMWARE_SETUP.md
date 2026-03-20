# Firmware Upload & Download Feature - Documentation

## Overview
This feature allows users to upload firmware files to Cloudinary and distribute them to GPS devices. The system tracks firmware versions, update status, and provides download endpoints.

## Setup Instructions

### 1. Get Cloudinary Credentials
- Visit [cloudinary.com](https://cloudinary.com)
- Create a free account
- Go to Dashboard → Settings
- Copy:
  - Cloud Name
  - API Key
  - API Secret

### 2. Environment Variables
Create a `.env` file in the backend root directory:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Or copy from `.env.example` and fill in the values.

### 3. Create temp directory
```bash
mkdir temp
```

## API Endpoints

### Upload Firmware
**POST** `/api/firmware/upload`

**Request:**
```bash
curl -X POST http://localhost:5000/api/firmware/upload \
  -H "Authorization: Bearer <token>" \
  -F "firmware=@path/to/firmware.bin" \
  -F "device_id=<device_id>" \
  -F "version=2.0.0"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "device_id": "507f1f77bcf86cd799439011",
    "version": "2.0.0",
    "url": "https://res.cloudinary.com/...",
    "file_size": 1048576,
    "uploaded_at": "2026-03-09T10:30:00Z"
  }
}
```

### Download Firmware
**GET** `/api/firmware/download/:device_id`

Downloads the latest firmware for a device.

### Get Latest Firmware Info
**GET** `/api/firmware/latest/:device_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "device_id": "507f1f77bcf86cd799439011",
    "device_name": "GPS-001",
    "current_version": "2.0.0",
    "firmware_url": "https://res.cloudinary.com/...",
    "firmware_size": 1048576,
    "last_updated": "2026-03-09T10:30:00Z",
    "update_status": "Success"
  }
}
```

### Get All Firmware Versions
**GET** `/api/firmware/versions/:device_id`

Lists all firmware versions uploaded for a device.

### Get Specific Version
**GET** `/api/firmware/:device_id/:version`

Get info about a specific firmware version.

### Update Firmware Status
**PATCH** `/api/firmware/status/:device_id`

**Request Body:**
```json
{
  "status": "In Progress"
}
```

Valid statuses: `None`, `Pending`, `In Progress`, `Failed`, `Success`

### Delete Firmware Version
**DELETE** `/api/firmware/:device_id/:public_id`

Delete a specific firmware version from Cloudinary.

## Device Model Fields

Added fields to track firmware:
```javascript
{
  firmware_version: String,           // Current version (e.g., "2.0.0")
  firmware_url: String,               // Download URL from Cloudinary
  firmware_public_id: String,         // Cloudinary public ID
  firmware_file_name: String,         // Original file name
  firmware_size: Number,              // File size in bytes
  firmware_updated_at: Date,          // Last upload timestamp
  firmware_update_status: String,     // Update status (None, Pending, In Progress, Failed, Success)
}
```

## Frontend Integration Example

### Upload Firmware
```javascript
const uploadFirmware = async (deviceId, file, version) => {
  const formData = new FormData();
  formData.append('firmware', file);
  formData.append('device_id', deviceId);
  formData.append('version', version);

  const response = await fetch('/api/firmware/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};
```

### Download Firmware
```javascript
const downloadFirmware = (deviceId) => {
  window.location.href = `/api/firmware/download/${deviceId}`;
};
```

### Get Latest Firmware
```javascript
const getLatestFirmware = async (deviceId) => {
  const response = await fetch(`/api/firmware/latest/${deviceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

## Folder Structure in Cloudinary

Firmware files are organized as:
```
gps-firmware/
  └── {vehicle_id}/
      ├── firmware-v1.0.0
      ├── firmware-v2.0.0
      └── firmware-v2.1.0
```

This makes it easy to manage and organize firmware for different vehicles.

## Security Notes

1. **Authentication**: All endpoints (except download) require JWT token
2. **File Size Limit**: Maximum 100MB per file
3. **File Type**: Currently accepts any file type (bin, hex, elf, etc.)
4. **Rate Limiting**: Consider adding rate limiting for upload/download endpoints
5. **Authorization**: Add role-based access control (admin only) for upload/delete

## Troubleshooting

### "No firmware file uploaded"
- Ensure file is sent with key name `firmware`
- Check multipart/form-data header is set

### "File size exceeds 100MB limit"
- Split firmware into smaller parts
- Or increase limit in controller

### Cloudinary Connection Error
- Verify environment variables are set correctly
- Check Cloudinary credentials on dashboard
- Ensure internet connection is stable

### File Not Downloading
- Verify firmware_url is valid
- Check Cloudinary account has storage available
- Ensure device has a firmware version uploaded

## Future Enhancements

1. **Automatic Firmware Deployment**: Push firmware to devices automatically
2. **Delta Updates**: Send only changed parts of firmware
3. **Rollback Support**: Allow reverting to previous firmware version
4. **Checksums**: Verify file integrity with MD5/SHA256
5. **Progress Tracking**: Real-time progress of downloads/installations
6. **Scheduled Updates**: Schedule firmware updates for specific times

## Performance Tips

1. **Compress Firmware**: Use gzip to reduce file size
2. **CDN**: Cloudinary automatically uses CDN for fast downloads
3. **Batch Operations**: Use Cloudinary API for bulk operations
4. **Cache**: Implement caching for firmware version lists

---

**Created**: March 9, 2026
**Version**: 1.0.0
