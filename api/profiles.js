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
      SELECT id, name, alter, department, jahre_auf_xjam, bild_vor_name, bild_nach_department, bild_nach_jahre
      FROM profiles
      WHERE id <> ${me.id}
        AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ${me.id})
      ORDER BY created_at DESC
    `;
    res.status(200).json({ profiles: rows });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Profile konnten nicht geladen werden." });
  }
};
