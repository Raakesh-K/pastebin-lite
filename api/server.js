const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { randomUUID } = require("crypto");
const path = require("path");
const serverless = require("serverless-http");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// HEALTH CHECK
app.get("/api/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    console.error("HEALTH CHECK ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// CREATE PASTE
app.post("/api/pastes", async (req, res) => {
  try {
    const { content, ttl_seconds, max_views } = req.body;

    if (!content || content.trim() === "")
      return res.status(400).json({ error: "Content required" });

    const id = randomUUID().slice(0, 8);   // ✅ FIXED
    const now = Date.now();
    const expires_at = ttl_seconds ? now + ttl_seconds * 1000 : null;

    await pool.query(
      `INSERT INTO pastes(id, content, created_at, expires_at, max_views, views)
       VALUES($1,$2,$3,$4,$5,0)`,
      [id, content, now, expires_at, max_views || null]
    );

    res.json({ id, url: `/p/${id}` });

  } catch (err) {
    console.error("CREATE PASTE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// FETCH PASTE
app.get("/api/pastes/:id", async (req, res) => {
  try {
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

  } catch (err) {
    console.error("FETCH PASTE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// VIEW HTML
app.get("/p/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM pastes WHERE id=$1", [req.params.id]);
  const paste = rows[0];

  if (!paste) return res.status(404).send("Paste not found");

  await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);
  res.send(`<pre>${paste.content.replace(/</g, "&lt;")}</pre>`);
});

// DEBUG
app.get("/api/debug", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "Server running", db: "Connected" });
  } catch (err) {
    res.status(500).json({ db: "FAILED", error: err.message });
  }
});

module.exports = serverless(app);
