const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Create/Connect to database
const db = new sqlite3.Database('airtrade.db');

// Create transactions table
db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    phone TEXT,
    amount REAL,
    cash_amount REAL,
    recipient_phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// API: Sell airtime
app.post('/api/sell', (req, res) => {
    const { phone, amount, mpesaNumber } = req.body;
    const cashPayout = amount * 0.70;
    
    // Save to database
    db.run(
        `INSERT INTO transactions (type, phone, amount, cash_amount, recipient_phone, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['sell', phone, amount, cashPayout, mpesaNumber, 'pending'],
        function(err) {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    transactionId: this.lastID,
                    message: `Send ${amount} KES airtime to 0712345678`,
                    payout: `You will receive ${cashPayout} KES to ${mpesaNumber}`
                });
            }
        }
    );
});

// API: Buy airtime
app.post('/api/buy', (req, res) => {
    const { phone, amount, recipientPhone } = req.body;
    const amountToPay = amount * 0.85;
    const savings = amount - amountToPay;
    
    // Save to database
    db.run(
        `INSERT INTO transactions (type, phone, amount, cash_amount, recipient_phone, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['buy', phone, amount, amountToPay, recipientPhone, 'pending_payment'],
        function(err) {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    transactionId: this.lastID,
                    message: `Pay ${amountToPay} KES via M-Pesa Paybill 174379`,
                    savings: `You save ${savings} KES`,
                    paybill: "174379",
                    account: `AIR${this.lastID}`
                });
            }
        }
    );
});

// API: Get all transactions (for admin later)
app.get('/api/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100`, (err, rows) => {
        if (err) {
            res.json([]);
        } else {
            res.json(rows);
        }
    });
});

// API: Get stats
app.get('/api/stats', (req, res) => {
    db.get(`SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'sell' THEN amount ELSE 0 END) as total_airtime_sold,
        SUM(CASE WHEN type = 'buy' THEN amount ELSE 0 END) as total_airtime_bought,
        SUM(CASE WHEN type = 'sell' THEN cash_amount ELSE 0 END) as total_payouts,
        SUM(CASE WHEN type = 'buy' THEN cash_amount ELSE 0 END) as total_received
        FROM transactions`, (err, row) => {
        if (err) {
            res.json({ total_transactions: 0 });
        } else {
            res.json(row);
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║     🚀 AIRTRADE KENYA - PHASE 3 COMPLETE!         ║
╠════════════════════════════════════════════════════╣
║  📱 Website: http://localhost:${PORT}                ║
║  💾 Database: SQLite (transactions saved)          ║
║  💰 Sell Rate: 70% (Send 100 → Get 70)            ║
║  📱 Buy Rate: 85% (Pay 85 → Get 100)              ║
╚════════════════════════════════════════════════════╝
    `);
});