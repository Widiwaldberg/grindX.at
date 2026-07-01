const { sql } = require("./db");

async function isMutualMatch(a, b) {
  const { rows } = await sql`
    SELECT 1 FROM swipes s1
    JOIN swipes s2 ON s2.swiper_id = s1.swiped_id AND s2.swiped_id = s1.swiper_id
    WHERE s1.swiper_id = ${a} AND s1.swiped_id = ${b} AND s1.entscheidung = 'like' AND s2.entscheidung = 'like'
  `;
  return rows.length > 0;
}

module.exports = { isMutualMatch };
