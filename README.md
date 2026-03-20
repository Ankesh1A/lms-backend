#  GPS Tracker Backend - Node.js + MongoDB

## 📁 Folder Structure

```
gps-backend/
├── server.js                    # Entry point
├── package.json
├── .env                         # Environment variables
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Login, Register, Me
│   │   ├── deviceController.js # Full CRUD + toggle + poweroff + stats
│   │   ├── locationController.js # Push, History, Live, Distance calc
│   │   └── tripController.js   # Trip start/end/stats
│   ├── middleware/
│   │   ├── auth.js             # JWT protect + authorize
│   │   └── errorHandler.js     # Global error handler
│   ├── models/
│   │   ├── User.js             # Auth user model
│   │   ├── Device.js           # GPS device model
│   │   ├── Location.js         # Location history model
│   │   └── Trip.js             # Trip model
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── locationRoutes.js
│   │   └── tripRoutes.js
│   └── utils/
│       ├── distanceCalculator.js  # Haversine formula (server-side)
│       ├── apiResponse.js         # Standardized responses
│       └── seeder.js              # Demo data seeder
└── frontend-integration/        # Drop these files into your frontend src/
    ├── api.js                   # Updated with JWT interceptor
    ├── deviceService.js         # Updated for backend
    ├── locationService.js       # New - with distance endpoints
    ├── authService.js           # New - login/register/logout
    └── DeviceDetail_changes.js  # How to integrate backend stats
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd gps-backend
npm install
```

### 2. Setup .env
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gps_tracker
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173
```

### 3. Seed demo data
```bash
npm run seed
# Creates: 4 demo devices + location history
# Login: admin@gps-track.io / admin123
```

### 4. Start server
```bash
npm run dev   # Development (nodemon)
npm start     # Production
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get logged in user |

### Devices
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/devices` | List all devices |  Yes |
| POST | `/api/devices` | Add new device |  Yes |
| GET | `/api/devices/:id` | Get device by ID (status check) |  No (Public) |
| PUT | `/api/devices/:id` | Update device |  Yes |
| DELETE | `/api/devices/:id` | Delete device |  Yes |
| PATCH | `/api/devices/:id/status` | Toggle status |  Yes |
| PATCH | `/api/devices/:id/power` | Remote power on/off (body { action: 'on'|'off' }) |  No (Public) |
| POST | `/api/devices/:id/power-off` | Remote power off |  No (Public) |
| GET | `/api/devices/stats/overview` | Dashboard stats |  Yes |

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations/live` | All devices live positions |
| POST | `/api/locations/:deviceId/push` | Push new GPS point |
| GET | `/api/locations/:deviceId/current` | Current position |
| GET | `/api/locations/:deviceId/history` | History (with date filter) |
| GET | `/api/locations/:deviceId/history/stats` | History + Haversine distance stats |
| POST | `/api/locations/distance/calculate` | Calculate distance 2 points |
| POST | `/api/locations/distance/route` | Calculate route distance (waypoints) |

### Trips
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips/:deviceId` | All trips for a device |
| GET | `/api/trips/detail/:tripId` | Trip detail + location points |
| POST | `/api/trips/start/:deviceId` | Start new trip |
| PUT | `/api/trips/end/:tripId` | End trip (auto-calc stats) |

---

## 📏 Distance Calculation

Distance is calculated **server-side** using the **Haversine formula**:

```js
// Example: Calculate distance between 2 points
POST /api/locations/distance/calculate
{
  "lat1": 23.2599, "lng1": 77.4126,
  "lat2": 23.2820, "lng2": 77.4600
}
// Response: { distance_km: 5.23, distance_m: 5230 }

// Example: Calculate total route distance
POST /api/locations/distance/route
{
  "waypoints": [
    { "lat": 23.2200, "lng": 77.3800 },
    { "lat": 23.2500, "lng": 77.4050 },
    { "lat": 23.2820, "lng": 77.4600 }
  ]
}
// Response: { total_distance_km: 9.84, segments: [...] }
```

---

##  Frontend Integration

1. Copy files from `frontend-integration/` to `src/services/`
2. Replace `src/services/api.js` → JWT auto-attached
3. Replace `src/services/deviceService.js` (now includes `powerToggle` for unified on/off command)
4. Add `src/services/locationService.js`
5. Add `src/services/authService.js`
6. Update DeviceDetail as shown in `DeviceDetail_changes.js`

```js
// Anywhere in frontend - login
import authService from './services/authService';
await authService.login('admin@gps-track.io', 'admin123');
// Token auto-saved, all API calls now authenticated
```
