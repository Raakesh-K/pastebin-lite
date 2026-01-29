
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { nanoid } = require("nanoid");
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
    const { content, ttl, views } = req.body;

    const result = await pool.query(
      "INSERT INTO pastes (code, ttl, views) VALUES ($1, $2, $3) RETURNING id",
      [content, ttl || null, views || null]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);   // 👈 shows error in Vercel logs
    res.status(500).json({ error: "DB insert failed" });
  }
});


// FETCH PASTE
app.get("/api/pastes/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM pastes WHERE id=$1", [req.params.id]);
  const paste = rows[0];
  if (!paste) return res.status(404).json({ error: "Not found" });

  const now = Date.now();

  if (paste.expires_at && now > paste.expires_at)
    return res.status(404).json({ error: "Expired" });

  if (paste.max_views && paste.views >= paste.max_views)
    return res.status(404).json({ error: "View limit exceeded" });

  await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

  res.json({
    content: paste.content,
    remaining_views: paste.max_views ? paste.max_views - (paste.views + 1) : null,
    expires_at: paste.expires_at ? new Date(paste.expires_at).toISOString() : null
  });
});


// VIEW PASTE HTML
app.get("/p/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM pastes WHERE id=$1", [req.params.id]);
  const paste = rows[0];

  if (!paste) return res.status(404).send("Paste not found");

  const now = Date.now();

  // TTL check
  if (paste.expires_at && now > paste.expires_at)
    return res.status(404).send("Paste expired");

  // Max views check
  if (paste.max_views && paste.views >= paste.max_views)
    return res.status(404).send("View limit exceeded");

  // Increase view count
  await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

  // Safe HTML render
  res.send(`<pre>${paste.content.replace(/</g, "&lt;")}</pre>`);
});

module.exports = app;


