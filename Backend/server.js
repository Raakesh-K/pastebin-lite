require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { nanoid } = require("nanoid");
const path = require("path");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("Frontend"));
app.use(express.static(path.join(__dirname, "../Frontend")));

// When user opens root URL, send index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../rontend/index.html"));
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
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || content.trim() === "")
    return res.status(400).json({ error: "Content required" });

  const id = nanoid(8);
  const now = Date.now();
  const expires_at = ttl_seconds ? now + ttl_seconds * 1000 : null;

  await pool.query(
    `INSERT INTO pastes(id, content, created_at, expires_at, max_views)
     VALUES($1,$2,$3,$4,$5)`,
    [id, content, now, expires_at, max_views || null]
  );

  res.json({ id, url: `${process.env.BASE_URL}/p/${id}` });
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

