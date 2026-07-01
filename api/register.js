const bcrypt = require("bcryptjs");
const { sql } = require("./_lib/db");
const { signToken } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    name,
    password,
    alter,
    department,
    jahre_auf_xjam,
    bild_vor_name,
    bild_nach_department,
    bild_nach_jahre,
  } = req.body || {};

  const alterNum = Number(alter);
  const jahreNum = Number(jahre_auf_xjam);
  const isBlobUrl = (v) => typeof v === "string" && /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(v);

  if (
    !name || typeof name !== "string" || !name.trim() ||
    !password || typeof password !== "string" || password.length < 6 ||
    !Number.isInteger(alterNum) || alterNum < 14 || alterNum > 100 ||
    !department || typeof department !== "string" || !department.trim() ||
    !Number.isInteger(jahreNum) || jahreNum < 0 || jahreNum > 100 ||
    !isBlobUrl(bild_vor_name) || !isBlobUrl(bild_nach_department) || !isBlobUrl(bild_nach_jahre)
  ) {
    res.status(400).json({ error: "Bitte alle Felder inkl. der drei Fotos ausfüllen." });
    return;
  }

  try {
    const passwortHash = await bcrypt.hash(password, 10);
    const { rows } = await sql`
      INSERT INTO profiles (name, passwort_hash, alter, department, jahre_auf_xjam, bild_vor_name, bild_nach_department, bild_nach_jahre)
      VALUES (${name.trim()}, ${passwortHash}, ${alterNum}, ${department.trim()}, ${jahreNum}, ${bild_vor_name}, ${bild_nach_department}, ${bild_nach_jahre})
      RETURNING id, name, alter, department, jahre_auf_xjam, bild_vor_name, bild_nach_department, bild_nach_jahre, created_at
    `;
    const profile = rows[0];
    res.status(201).json({ token: signToken(profile), profile });
  } catch (err) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Dieser Name ist bereits vergeben." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Registrierung fehlgeschlagen." });
  }
};
