const { sql } = require("./_lib/db");
const { requireAuth, AuthError } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const me = requireAuth(req);
    const { swiped_id, entscheidung } = req.body || {};
    const swipedId = Number(swiped_id);
    if (!Number.isInteger(swipedId) || !["like", "dislike"].includes(entscheidung)) {
      res.status(400).json({ error: "Ungültige Swipe-Daten." });
      return;
    }

    await sql`
      INSERT INTO swipes (swiper_id, swiped_id, entscheidung)
      VALUES (${me.id}, ${swipedId}, ${entscheidung})
      ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET entscheidung = EXCLUDED.entscheidung
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Swipe konnte nicht gespeichert werden." });
  }
};
