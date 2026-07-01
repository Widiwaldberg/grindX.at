const { sql } = require("./_lib/db");
const { requireAuth, AuthError } = require("./_lib/auth");
const { isMutualMatch } = require("./_lib/mutualMatch");

module.exports = async (req, res) => {
  try {
    const me = requireAuth(req);

    if (req.method === "GET") {
      const withId = Number(req.query.with);
      if (!Number.isInteger(withId)) {
        res.status(400).json({ error: "Ungültige Anfrage." });
        return;
      }
      if (!(await isMutualMatch(me.id, withId))) {
        res.status(403).json({ error: "Kein gemeinsames Match." });
        return;
      }
      const { rows } = await sql`
        SELECT id, sender_id, recipient_id, text, created_at FROM messages
        WHERE (sender_id = ${me.id} AND recipient_id = ${withId}) OR (sender_id = ${withId} AND recipient_id = ${me.id})
        ORDER BY created_at ASC
      `;
      res.status(200).json({ messages: rows });
      return;
    }

    if (req.method === "POST") {
      const { to, text } = req.body || {};
      const toId = Number(to);
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (!Number.isInteger(toId) || !trimmed || trimmed.length > 2000) {
        res.status(400).json({ error: "Ungültige Nachricht." });
        return;
      }
      if (!(await isMutualMatch(me.id, toId))) {
        res.status(403).json({ error: "Kein gemeinsames Match." });
        return;
      }
      const { rows } = await sql`
        INSERT INTO messages (sender_id, recipient_id, text)
        VALUES (${me.id}, ${toId}, ${trimmed})
        RETURNING id, sender_id, recipient_id, text, created_at
      `;
      res.status(201).json({ message: rows[0] });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Nachricht fehlgeschlagen." });
  }
};
