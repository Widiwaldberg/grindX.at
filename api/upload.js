const { put } = require("@vercel/blob");

const MAX_BYTES = 6 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { filename, contentType, dataBase64 } = req.body || {};
  if (!filename || !contentType || !dataBase64 || !contentType.startsWith("image/")) {
    res.status(400).json({ error: "Ungültiges Bild." });
    return;
  }

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    res.status(400).json({ error: "Bild ist zu groß oder leer." });
    return;
  }

  try {
    const blob = await put(`profiles/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload fehlgeschlagen." });
  }
};
