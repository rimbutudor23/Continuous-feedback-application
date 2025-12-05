const jwt = require("jsonwebtoken");
const { Profil } = require("../../models");

const JWT_SECRET = process.env.JWT_SECRET;

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "token lipsa sau format invalid (astept Bearer <token>)",
      });
    }

    const token = authHeader.substring("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "token lipsa",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "token invalid sau expirat",
      });
    }

    const { id, tip } = payload || {};
    if (!id || !tip) {
      return res.status(401).json({
        success: false,
        error: "token invalid (lipsesc datele de utilizator)",
      });
    }

    const profil = await Profil.findByPk(id);
    if (!profil) {
      return res.status(401).json({
        success: false,
        error: "utilizatorul nu mai exista",
      });
    }

    if (profil.tip !== tip) {
      return res.status(403).json({
        success: false,
        error: "acces refuzat (tip utilizator schimbat)",
      });
    }

    req.user = {
      id: profil.profilId,
      username: profil.numeUtilizator,
      email: profil.email,
      tip: profil.tip,
    };

    return next();
  } catch (err) {
    console.error("[AUTH_MIDDLEWARE] eroare", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna in middleware-ul de autentificare",
    });
  }
}

function requireRole(allowedTypes = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({
        success: false,
        error: "middleware de rol folosit fara authRequired",
      });
    }

    if (!allowedTypes.includes(req.user.tip)) {
      return res.status(403).json({
        success: false,
        error: "nu ai permisiune pentru aceasta actiune",
      });
    }

    return next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};
