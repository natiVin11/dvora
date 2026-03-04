const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// מניעת שגיאות favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// חיבור למסד הנתונים SQLite
const db = new sqlite3.Database('./bazzi_database.db', (err) => {
    if (err) console.error("Database Error:", err.message);
    else console.log('הכוורת מחוברת למסד הנתונים! 🐝');
});

// יצירת טבלה
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS brain (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keywords TEXT NOT NULL,
        answer TEXT NOT NULL
    )`);
});

// API לשאלות
app.post('/api/ask', (req, res) => {
    const userText = req.body.question ? req.body.question.toLowerCase().trim() : "";
    db.all("SELECT * FROM brain", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "שגיאת שרת" });
        const match = rows.find(row => {
            const keys = row.keywords.split(',').map(k => k.trim().toLowerCase());
            return keys.some(key => userText.includes(key));
        });
        res.json({ answer: match ? match.answer : "זזז... זו שאלה מעניינת! נסה לשאול אותי על דבש או על המלכה." });
    });
});

// ניהול (Admin)
app.get('/api/admin/list', (req, res) => {
    db.all("SELECT * FROM brain ORDER BY id DESC", [], (err, rows) => res.json(rows));
});

app.post('/api/admin/add', (req, res) => {
    const { keywords, answer } = req.body;
    db.run("INSERT INTO brain (keywords, answer) VALUES (?, ?)", [keywords, answer], () => res.json({ success: true }));
});

app.put('/api/admin/update/:id', (req, res) => {
    const { keywords, answer } = req.body;
    db.run("UPDATE brain SET keywords = ?, answer = ? WHERE id = ?", [keywords, answer, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/admin/delete/:id', (req, res) => {
    db.run("DELETE FROM brain WHERE id = ?", req.params.id, () => res.json({ success: true }));
});

app.listen(port, () => console.log(`Bazzi Running at http://localhost:${port}`));