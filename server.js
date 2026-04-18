const express = require('express');
const path = require('path');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const app = express();

// Middleware setup
app.use(cors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    exposedHeaders: ['X-Backend']
}));
app.options('*', cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple Logger
app.use((req, res, next) => {
    res.setHeader('X-Backend', 'RentPlay-Express');
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// SMS Setup
const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const twilioNumber = (process.env.TWILIO_PHONE_NUMBER || '').trim();
const ownerPhoneNumber = (process.env.OWNER_PHONE_NUMBER || '+918185951564').trim();
const fast2smsKey = (process.env.FAST2SMS_API_KEY || '').trim();
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').trim();

let client = null;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

const pool = require('./db');
const axios = require('axios');

async function sendSmsViaTwilio(message, toNumber = ownerPhoneNumber) {
    if (!client) {
        console.error('[SMS] Twilio client is not configured.');
        return { success: false, provider: 'twilio', error: 'Twilio not configured' };
    }
    if (!twilioNumber) {
        console.error('[SMS] Twilio source number is not configured.');
        return { success: false, provider: 'twilio', error: 'Twilio source number not configured' };
    }
    try {
        await client.messages.create({ body: message, from: twilioNumber, to: toNumber });
        console.log(`[SMS] Twilio Success.`);
        return { success: true, provider: 'twilio' };
    } catch (err) {
        console.error(`[SMS] Twilio failed: ${err.message}`);
        return { success: false, provider: 'twilio', error: err.message };
    }
}

async function sendSmsAlert(message) {
    const twilioResult = await sendSmsViaTwilio(message);
    if (twilioResult.success) return twilioResult;
    if (fast2smsKey) {
        try {
            const phoneClean = ownerPhoneNumber.replace(/\D/g, '');
            const phone10 = phoneClean.length > 10 ? phoneClean.slice(-10) : phoneClean;
            const res = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
                route: 'q', message: message, numbers: phone10
            }, {
                headers: { 'authorization': fast2smsKey, 'Content-Type': 'application/json' }
            });
            if (res.data && res.data.return === true) return { success: true, provider: 'fast2sms' };
        } catch (err) { console.warn(`[SMS] Fast2SMS failed: ${err.message}`); }
    }
    return { success: false };
}

const games = [
    { id: 1, emoji: '♟️', name: 'Chess Set Pro', brand: 'ChessKing™', cat: 'indoor', price: 149, rating: 4.9, avail: true, players: '2', age: '6+', deposit: 500 },
    { id: 2, emoji: '🎯', name: 'Carrom Board', brand: 'Precise™', cat: 'indoor', price: 179, rating: 4.8, avail: true, players: '4', age: '5+', deposit: 600 },
    { id: 3, emoji: '🎱', name: 'Mini Billiards Table', brand: 'BallRoom™', cat: 'indoor', price: 399, rating: 4.7, avail: false, players: '2-4', age: '12+', deposit: 1500 },
    { id: 4, emoji: '🎳', name: 'Bowling Set', brand: 'StrikeKing™', cat: 'indoor', price: 199, rating: 4.6, avail: true, players: '2-6', age: '5+', deposit: 700 },
    { id: 5, emoji: '🏓', name: 'Table Tennis Table', brand: 'Stag™', cat: 'indoor', price: 349, rating: 4.9, avail: true, players: '2-4', age: '7+', deposit: 1200 },
    { id: 6, emoji: '🎮', name: 'Air Hockey Table', brand: 'FunZone™', cat: 'indoor', price: 449, rating: 4.8, avail: true, players: '2', age: '6+', deposit: 1500 },
    { id: 7, emoji: '🎲', name: 'Giant Jenga', brand: 'WoodCraft™', cat: 'indoor', price: 149, rating: 4.7, avail: true, players: '2-8', age: '4+', deposit: 500 },
    { id: 8, emoji: '🃏', name: 'UNO Card Set', brand: 'Mattel™', cat: 'indoor', price: 99, rating: 4.9, avail: true, players: '2-10', age: '7+', deposit: 300 },
    { id: 9, emoji: '🎡', name: 'Foosball Table', brand: 'Champion™', cat: 'indoor', price: 399, rating: 4.8, avail: false, players: '2-4', age: '8+', deposit: 1400 },
    { id: 10, emoji: '🎰', name: 'Spin Top Battle Set', brand: 'SpinMaster™', cat: 'indoor', price: 129, rating: 4.6, avail: true, players: '2+', age: '5+', deposit: 400 },
    { id: 26, emoji: '⚽', name: 'Football (Size 5)', brand: 'Nivia™', cat: 'outdoor', price: 149, rating: 4.9, avail: true, players: '2-22', age: '5+', deposit: 500 },
    { id: 27, emoji: '🏸', name: 'Badminton Set (2 Rackets)', brand: 'Yonex™', cat: 'outdoor', price: 199, rating: 4.8, avail: true, players: '2-4', age: '7+', deposit: 700 },
    { id: 30, emoji: '🏏', name: 'Cricket Bat Full Size', brand: 'SG™', cat: 'outdoor', price: 229, rating: 4.8, avail: true, players: '2-22', age: '8+', deposit: 800 },
    { id: 31, emoji: '🏒', name: 'Cricket Set Full Kit', brand: 'MRF™', cat: 'outdoor', price: 349, rating: 4.9, avail: true, players: '2-22', age: '8+', deposit: 1200 },
    { id: 46, emoji: '🎲', name: 'Ludo Deluxe', brand: 'FunZone™', cat: 'board', price: 119, rating: 4.8, avail: true, players: '2-4', age: '5+', deposit: 400 },
    { id: 52, emoji: '💰', name: 'Monopoly Classic', brand: 'Hasbro™', cat: 'board', price: 149, rating: 4.9, avail: true, players: '2-8', age: '8+', deposit: 500 },
    { id: 81, emoji: '🎮', name: 'PlayStation 5', brand: 'Sony™', cat: 'console', price: 699, rating: 4.9, avail: true, players: '1-4', age: '12+', deposit: 3000 },
    { id: 92, emoji: '✈️', name: 'Drone DJI Mini 3', brand: 'DJI™', cat: 'toy', price: 599, rating: 4.9, avail: true, players: '1', age: '14+', deposit: 2500 }
];

app.get('/', (_req, res) => res.send('RentPlay API is Running!'));

app.get('/api/search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    try {
        if (!query) {
            const result = await pool.query("SELECT * FROM items ORDER BY id ASC");
            return res.json(result.rows.length > 0 ? result.rows : games);
        }
        const searchValue = `%${query}%`;
        const result = await pool.query(
            "SELECT * FROM items WHERE LOWER(name) LIKE $1 OR LOWER(brand) LIKE $1 OR LOWER(cat) LIKE $1 ORDER BY id ASC",
            [searchValue]
        );
        if (result.rows.length > 0) return res.json(result.rows);
        const fallback = games.filter(g =>
            g.name.toLowerCase().includes(query) ||
            g.brand?.toLowerCase().includes(query) ||
            g.cat?.toLowerCase().includes(query)
        );
        res.json(fallback);
    } catch (err) {
        console.error("Search Error:", err.message);
        res.json(games.filter(g => g.name.toLowerCase().includes(query)));
    }
});

app.get('/api/items', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM items ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) { res.json(games); }
});

app.get('/api/stores', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM stores WHERE status = 'active' ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/book', async (req, res) => {
    const { userName, userPhone, userEmail, itemName, address, price, days, bookingDate, bookingTime, bookingDay, paymentMode, signature, lat, lng } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO rentals (name, item, phone, address, price, days, booking_date, booking_time, booking_day, payment_mode, status, email, signature, lat, lng) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14) RETURNING id`,
            [userName, itemName, userPhone, address, parseInt(price.toString().replace(/\D/g,'')) || 0, parseInt(days) || 1, bookingDate, bookingTime, bookingDay, paymentMode, userEmail, signature, lat, lng]
        );
        res.json({ success: true, bookingId: result.rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/db/:table', async (req, res) => {
    const { table } = req.params;
    const allowed = ['rentals', 'items', 'delivery_boys', 'stores', 'reviews', 'support_requests'];
    if (!allowed.includes(table)) return res.status(400).json({ error: "Invalid table" });
    try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 1000`);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/db-explorer', (req, res) => res.sendFile(path.join(__dirname, 'db_explorer.html')));

app.use(express.static('./'));

const PORT = 3005; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on http://localhost:${PORT}`);
});
