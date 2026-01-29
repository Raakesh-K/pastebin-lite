
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const path = require("path");
const app = express();




app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend")));

// When user opens root URL, send index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});


// HEALTH CHECK
app.get("/api/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// CREATE PASTE
app.post("/api/pastes", async (req, res) => {
  try {
    const { content, ttl_seconds, max_views } = req.body;

    const result = await pool.query(
      `INSERT INTO pastes (code, ttl, views, max_views)
       VALUES ($1, $2, 0, $3)
       RETURNING id`,
      [content, ttl_seconds || null, max_views || null]
    );

    res.json({
      url: `/p/${result.rows[0].id}`
    });

  } catch (err) {
    console.error("DB ERROR:", err);   // 🔥 THIS WILL SHOW IN VERCEL LOGS
    res.status(500).json({ error: err.message });
  }
});










// FETCH PASTE
app.get("/api/pastes/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM pastes WHERE id=$1", [req.params.id]);
    const paste = rows[0];

    if (!paste) return res.status(404).json({ error: "Not found" });

    if (paste.max_views && paste.views >= paste.max_views)
      return res.status(403).json({ error: "View limit exceeded" });

    await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

    res.json({
      content: paste.code,
      remaining_views: paste.max_views ? paste.max_views - (paste.views + 1) : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});






// VIEW PASTE HTML
app.get("/p/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM pastes WHERE id=$1", [req.params.id]);
    const paste = rows[0];

    if (!paste) return res.status(404).send("Paste not found");

    if (paste.max_views && paste.views >= paste.max_views)
      return res.status(403).send("View limit exceeded");

    await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

    res.send(`<pre>${paste.code.replace(/</g, "&lt;")}</pre>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});





module.exports = app;


