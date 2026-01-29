
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
    const { content, ttl_seconds, max_views } = req.body;

    const result = await pool.query(
      "INSERT INTO pastes (code, ttl, views) VALUES ($1, $2, 0) RETURNING id",
      [content, ttl_seconds || null]
    );

    const pasteId = result.rows[0].id;
    const baseUrl = req.headers.origin;

    res.json({
      id: pasteId,
      url: `${baseUrl}/p/${pasteId}`
    });

  } catch (err) {
    console.error("POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});





// FETCH PASTE
app.get("/api/pastes/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pastes WHERE id=$1",
      [req.params.id]
    );

    const paste = rows[0];
    if (!paste) return res.status(404).json({ error: "Not found" });

    await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

    res.json({
      content: paste.code,   // ✅ correct column
      views: paste.views + 1,
      ttl: paste.ttl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});



// VIEW PASTE HTML
app.get("/p/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pastes WHERE id=$1",
      [req.params.id]
    );

    const paste = rows[0];
    if (!paste) return res.status(404).send("Paste not found");

    await pool.query("UPDATE pastes SET views = views + 1 WHERE id=$1", [paste.id]);

    res.send(`<pre>${paste.code.replace(/</g, "&lt;")}</pre>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


module.exports = app;


