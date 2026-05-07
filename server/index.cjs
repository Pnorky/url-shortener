/**
 * Optional in-memory link shortener API (cross-device redirects).
 * Run: npm run server:api
 * Set in index.html: <meta name="shortener-api" content="http://127.0.0.1:3333" />
 */
const express = require("express");
const cors = require("cors");

const PORT = Number(process.env.PORT) || 3333;
const store = new Map();

function randomSlug(len = 6) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

function normalizeTargetUrl(input) {
  const t = String(input || "").trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    try {
      const u = new URL("https://" + t);
      if (u.hostname.length > 0) return u.href;
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeSlug(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!s || s.length > 64 || s === "api") return null;
  return s;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/api/shorten", (req, res) => {
  const target = normalizeTargetUrl(req.body?.targetUrl);
  if (!target) {
    res.status(400).json({ error: "invalid_targetUrl" });
    return;
  }
  let slug = sanitizeSlug(req.body?.slug);
  if (req.body?.slug && !slug) {
    res.status(400).json({ error: "invalid_slug" });
    return;
  }
  if (!slug) {
    let guard = 0;
    do {
      slug = randomSlug();
      guard++;
    } while (store.has(slug) && guard < 60);
    if (store.has(slug)) {
      res.status(500).json({ error: "slug_collision" });
      return;
    }
  } else if (store.has(slug)) {
    res.status(409).json({ error: "slug_taken" });
    return;
  }
  store.set(slug, target);
  res.json({ slug });
});

app.get("/:slug", (req, res) => {
  const slug = req.params.slug;
  if (slug === "favicon.ico") {
    res.status(404).end();
    return;
  }
  const target = store.get(slug);
  if (!target) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }
  res.redirect(302, target);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`link-shortener API listening on http://127.0.0.1:${PORT}`);
});
