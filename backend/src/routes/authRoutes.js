const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const router = express.Router();

const { Profil } = require("../../models");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
}

function isValidUsername(value) {
  if (!value) return false;

  if (value.includes("@")) return false;

  return /^[a-zA-Z0-9 _-]+$/.test(value);
}

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, tip } = req.body || {};

    if (!username || !email || !password || !tip) {
      return res.status(400).json({
        success: false,
        error: "username, email, password si tip sunt obligatorii",
      });
    }

    if (!["profesor", "student"].includes(tip)) {
      return res.status(400).json({
        success: false,
        error: "tip trebuie sa fie 'profesor' sau 'student'",
      });
    }

    const usernameNorm = String(username).trim();
    const emailNorm = String(email).trim().toLowerCase();

    if (!isValidUsername(usernameNorm)) {
      return res.status(400).json({
        success: false,
        error:
          "username invalid - nu poate contine @ si poate avea doar litere, cifre, spatiu, _ si -",
      });
    }

    if (!isValidEmail(emailNorm)) {
      return res.status(400).json({
        success: false,
        error: "email invalid",
      });
    }

    const existing = await Profil.findOne({
      where: {
        [Op.or]: [{ numeUtilizator: usernameNorm }, { email: emailNorm }],
      },
    });

    if (existing) {
      const conflictField =
        existing.numeUtilizator === usernameNorm ? "username" : "email";
      return res.status(409).json({
        success: false,
        error: `exista deja un utilizator cu acest ${conflictField}`,
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const profil = await Profil.create({
      numeUtilizator: usernameNorm,
      email: emailNorm,
      parola: hash,
      tip,
    });

    const token = jwt.sign(
      {
        id: profil.profilId,
        tip: profil.tip,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: profil.profilId,
        username: profil.numeUtilizator,
        email: profil.email,
        tip: profil.tip,
      },
    });
  } catch (err) {
    console.error("[AUTH_REGISTER] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la inregistrare",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: "username sau email si parola sunt obligatorii",
      });
    }

    const identNorm = String(identifier).trim();
    const isEmail = isValidEmail(identNorm);
    const emailNorm = identNorm.toLowerCase();

    let profil;

    if (isEmail) {
      profil = await Profil.findOne({ where: { email: emailNorm } });
    } else {
      profil = await Profil.findOne({ where: { numeUtilizator: identNorm } });
    }

    if (!profil) {
      return res.status(401).json({
        success: false,
        error: "credentiale invalide",
      });
    }

    const ok = await bcrypt.compare(password, profil.parola);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: "credentiale invalide",
      });
    }

    const token = jwt.sign(
      {
        id: profil.profilId,
        tip: profil.tip,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: profil.profilId,
        username: profil.numeUtilizator,
        email: profil.email,
        tip: profil.tip,
      },
    });
  } catch (err) {
    console.error("[AUTH_LOGIN] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la login",
    });
  }
});

module.exports = router;
