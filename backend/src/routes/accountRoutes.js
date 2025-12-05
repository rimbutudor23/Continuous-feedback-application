const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Profil, Cod, Activitate } = require("../../models");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || null;
const PROFLINK_SECRET = process.env.PROFLINK_SECRET || null;
const PROFLINK_EXPIRES_IN = process.env.PROFLINK_EXPIRES_IN || "30d";

/**
 * GET /account
 *
 * Returneaza datele userului logat.
 *
 * Raspuns:
 * {
 *   success: true,
 *   user: {
 *     numeUtilizator,
 *     email,
 *     tip,
 *     createdAt,
 *     updatedAt,
 *     profLinkToken?,
 *     profLinkUrl?
 *   }
 * }
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const profilId = req.user.id;

    const user = await Profil.findByPk(profilId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "userul nu exista",
      });
    }

    let profLinkToken = null;
    let profLinkUrl = null;

    if (user.tip === "profesor" && FRONTEND_BASE_URL && PROFLINK_SECRET) {
      profLinkToken = jwt.sign({ profesorId: profilId }, PROFLINK_SECRET);

      const base = FRONTEND_BASE_URL.replace(/\/+$/, "");
      profLinkUrl = `${base}/professor/${encodeURIComponent(profLinkToken)}`;
    }

    return res.json({
      success: true,
      user: {
        numeUtilizator: user.numeUtilizator,
        email: user.email,
        tip: user.tip,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profLinkToken,
        profLinkUrl,
      },
    });
  } catch (err) {
    console.error("[ACCOUNT_GET]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna",
    });
  }
});

/**
 * PUT /account
 *
 * Body posibil (toate campurile sunt optionale, tratate individual):
 *
 * 1) Update username:
 *    {
 *      numeUtilizator: "NouNume"
 *    }
 *
 * 2) Update email (cu dubla confirmare):
 *    {
 *      emailVechi: "vechi@test.com",
 *      emailNou: "nou@test.com"
 *    }
 *
 * 3) Update parola (cu dubla confirmare):
 *    {
 *      parolaVeche: "oldpass",
 *      parolaNoua: "newpass"
 *    }
 *
 * Return:
 * {
 *   success: true,
 *   user: { ...dateActualizate }
 * }
 */
router.put("/", authRequired, async (req, res) => {
  try {
    const profilId = req.user.id;
    const { numeUtilizator, emailVechi, emailNou, parolaVeche, parolaNoua } =
      req.body || {};

    const user = await Profil.findByPk(profilId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "userul nu exista",
      });
    }

    let updated = false;

    if (numeUtilizator !== undefined) {
      const regex = /^[a-zA-Z0-9._\- ]+$/;
      if (!regex.test(numeUtilizator)) {
        return res.status(400).json({
          success: false,
          error:
            "nume utilizator invalid - doar litere, cifre, spatiu, ., _, -",
        });
      }

      if (numeUtilizator.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "numele de utilizator nu poate contine '@'",
        });
      }

      const exists = await Profil.findOne({
        where: { numeUtilizator },
      });
      if (exists && exists.profilId !== profilId) {
        return res.status(400).json({
          success: false,
          error: "numele de utilizator este deja folosit",
        });
      }

      user.numeUtilizator = numeUtilizator;
      updated = true;
    }

    if (emailVechi !== undefined || emailNou !== undefined) {
      if (!emailVechi || !emailNou) {
        return res.status(400).json({
          success: false,
          error:
            "emailVechi si emailNou sunt obligatorii pentru schimbarea emailului",
        });
      }

      if (emailVechi !== user.email) {
        return res.status(400).json({
          success: false,
          error: "emailVechi nu corespunde cu emailul curent",
        });
      }

      if (!emailNou.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "emailNou invalid",
        });
      }

      const exists = await Profil.findOne({
        where: { email: emailNou.toLowerCase() },
      });
      if (exists && exists.profilId !== profilId) {
        return res.status(400).json({
          success: false,
          error: "emailul nou este deja folosit",
        });
      }

      user.email = emailNou.toLowerCase();
      updated = true;
    }

    if (parolaVeche !== undefined || parolaNoua !== undefined) {
      if (!parolaVeche || !parolaNoua) {
        return res.status(400).json({
          success: false,
          error:
            "parolaVeche si parolaNoua sunt obligatorii pentru schimbarea parolei",
        });
      }

      const ok = await bcrypt.compare(parolaVeche, user.parola);
      if (!ok) {
        return res.status(400).json({
          success: false,
          error: "parolaVeche este incorecta",
        });
      }

      if (parolaNoua.length < 6) {
        return res.status(400).json({
          success: false,
          error: "parolaNoua trebuie sa aiba minim 6 caractere",
        });
      }

      const newHash = await bcrypt.hash(parolaNoua, 10);
      user.parola = newHash;
      updated = true;
    }

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: "nu a fost trimis niciun camp valid pentru update",
      });
    }

    await user.save();

    return res.json({
      success: true,
      user: {
        numeUtilizator: user.numeUtilizator,
        email: user.email,
        tip: user.tip,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("[ACCOUNT_PUT]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna",
    });
  }
});

/**
 * DELETE /account
 *
 * Sterge contul userului logat.
 *
 * Reguli:
 *   - profesor: se sterge profilul + CASCADE sterge codurile, activitatile, feedback-ul
 *   - student: se sterge doar profilul
 *
 * Return:
 * {
 *   success: true,
 *   message: "cont sters complet"
 * }
 */
router.delete("/", authRequired, async (req, res) => {
  try {
    const profilId = req.user.id;

    const user = await Profil.findByPk(profilId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "userul nu exista",
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: "cont sters complet",
    });
  } catch (err) {
    console.error("[ACCOUNT_DELETE]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna",
    });
  }
});

module.exports = router;
