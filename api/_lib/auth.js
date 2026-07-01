const jwt = require("jsonwebtoken");

function signToken(profile) {
  return jwt.sign({ sub: profile.id, name: profile.name }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

function requireAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Nicht angemeldet");
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub, name: payload.name };
  } catch {
    throw new AuthError("Ungültiges oder abgelaufenes Token");
  }
}

module.exports = { signToken, requireAuth, AuthError };
