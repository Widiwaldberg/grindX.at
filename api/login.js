const bcrypt = require("bcryptjs");
const { sql } = require("./_lib/db");
const { signToken } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { name, password } = req.body || {};
  if (!name || !password) {
    res.status(400).json({ error: "Name und Passwort erforderlich." });
    return;
  }

  try {
    const { rows } = await sql`
      SELECT id, name, passwort_hash, alter, department, jahre_auf_xjam, bild_vor_name, bild_nach_department, bild_nach_jahre, created_at
      FROM profiles WHERE name = ${name.trim()}
    `;
    const profile = rows[0];
    if (!profile || !(await bcrypt.compare(password, profile.passwort_hash))) {
      res.status(401).json({ error: "Name oder Passwort ist falsch." });
      return;
    }
    delete profile.passwort_hash;
    res.status(200).json({ token: signToken(profile), profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login fehlgeschlagen." });
  }
};
