const { sql } = require("./_lib/db");
const { requireAuth, AuthError } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const me = requireAuth(req);
    const { rows } = await sql`
      SELECT p.id, p.name, p.alter, p.department, p.jahre_auf_xjam, p.bild_vor_name, p.bild_nach_department, p.bild_nach_jahre,
        (
          SELECT m.text FROM messages m
          WHERE (m.sender_id = p.id AND m.recipient_id = ${me.id}) OR (m.sender_id = ${me.id} AND m.recipient_id = p.id)
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message
      FROM swipes mine
      JOIN swipes theirs ON theirs.swiper_id = mine.swiped_id AND theirs.swiped_id = mine.swiper_id
      JOIN profiles p ON p.id = mine.swiped_id
      WHERE mine.swiper_id = ${me.id} AND mine.entscheidung = 'like' AND theirs.entscheidung = 'like'
      ORDER BY p.name
    `;
    res.status(200).json({ matches: rows });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Matches konnten nicht geladen werden." });
  }
};
