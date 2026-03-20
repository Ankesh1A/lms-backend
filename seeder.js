const mongoose = require('mongoose');
const { Types } = mongoose;
const dotenv = require('dotenv');
dotenv.config();

const Device = require('./src/models/Device');
const Location = require('./src/models/Location');
const User = require('./src/models/User');

const connectDB = require('./src/config/db');

const DEMO_DEVICES = [
    {
        _id: new Types.ObjectId("69a51d7db7b3f59070923245"),
        device_id: 'GPS-5',
        device_name: 'bike',
        imei: '123456789789789',
        mobile_num: '6265471212',
        vehicle_id: 'MH-12-AH-787878',
        status: 'Active',
        plan_validity: new Date('2026-03-28'),
        battery: 100,
        signal: 'Good',
        speed: 0,
        lat: 23.363856,
        lng: 77.51708,
        address: '',
        last_seen: null,
        total_distance: 0,
        distance_today: 0,
        distance_today_date: '',
        firmware_version: '1.0.0',
        firmware_url: null,
        firmware_public_id: null,
        firmware_file_name: null,
        firmware_size: 0,
        firmware_updated_at: null,
    },
    {
        device_id: 'GPS-001',
        device_name: 'Truck A-1',
        imei: '862093012345678',
        mobile_num: '+91 9876543210',
        vehicle_id: 'MH-12-AB-1234',
        status: 'Active',
        plan_validity: new Date('2026-12-31'),
        battery: 85,
        signal: 'Strong',
        speed: 0,
        lat: null,
        lng: null,
        address: '',
        distance_today: 0,
    },
    {
        device_id: 'GPS-002',
        device_name: 'Delivery Van 03',
        imei: '862093012345679',
        mobile_num: '+91 9123456789',
        vehicle_id: 'MH-12-XY-5678',
        status: 'Inactive',
        plan_validity: new Date('2025-06-15'),
        battery: 23,
        signal: 'Weak',
        speed: 0,
        lat: null,
        lng: null,
        address: '',
        distance_today: 0,
    },
    {
        device_id: 'GPS-003',
        device_name: 'Project Car',
        imei: '862093012345610',
        mobile_num: '+91 9988776655',
        vehicle_id: 'MH-01-XX-9999',
        status: 'Active',
        plan_validity: new Date('2026-01-01'),
        battery: 61,
        signal: 'Good',
        speed: 0,
        lat: null,
        lng: null,
        address: '',
        distance_today: 0,
    },
    {
        device_id: 'GPS-004',
        device_name: 'Cargo Truck 02',
        imei: '862093012345611',
        mobile_num: '+91 9876001234',
        vehicle_id: 'MH-14-CD-7890',
        status: 'Active',
        plan_validity: new Date('2027-03-15'),
        battery: 92,
        signal: 'Strong',
        speed: 0,
        lat: null,
        lng: null,
        address: '',
        distance_today: 0,
    },
];

const seedDB = async () => {
    await connectDB();

    console.log('🌱 Seeding database...');

    // Clear existing data
    await Device.deleteMany();
    await Location.deleteMany();
    await User.deleteMany();
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const admin = await User.create({
        name: 'Admin User',
        email: 'admin@gps-track.io',
        password: 'admin123',
        role: 'admin',
    });
    console.log(`👤 Admin created: ${admin.email} / admin123`);

    // Create devices
    const devices = await Device.insertMany(DEMO_DEVICES);
    console.log(`🚛 Created ${devices.length} demo devices`);

    console.log('\n✅ Seeding complete!');
    console.log('─────────────────────────────');
    console.log('Login: admin@gps-track.io / admin123');
    console.log('─────────────────────────────\n');
    process.exit(0);
};

seedDB().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});