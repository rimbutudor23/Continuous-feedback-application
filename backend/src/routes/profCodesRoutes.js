const express = require("express");
const { Op } = require("sequelize");
const { Cod, Activitate } = require("../../models");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

function generateRandomCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    out += chars[idx];
  }
  return out;
}

function normalizeAndValidateContinut(raw) {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "continut lipsa" };
  }

  const value = raw.trim().toUpperCase();

  if (!/^[A-Z0-9]{8}$/.test(value)) {
    return {
      ok: false,
      error:
        "continut invalid - trebuie sa aiba fix 8 caractere, litere sau cifre",
    };
  }

  return { ok: true, value };
}

router.use(authRequired, requireRole(["profesor"]));

/**
 * GET /prof/codes?start=0&limit=20
 * - intoarce lista de coduri ale profesorului curent
 * - suport paginare cu start (offset) si limit
 * - pentru fiecare cod intoarce si daca este folosit de vreo activitate a acelui profesor
 */
router.get("/", async (req, res) => {
  try {
    const profesorId = req.user.id;

    let start = parseInt(req.query.start, 10);
    let limit = parseInt(req.query.limit, 10);

    if (Number.isNaN(start) || start < 0) start = 0;
    if (Number.isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    const total = await Cod.count({
      where: { profesorId },
    });

    const codes = await Cod.findAll({
      where: { profesorId },
      order: [["createdAt", "DESC"]],
      offset: start,
      limit,
    });

    const codeIds = codes.map((c) => c.codId);

    let usedSet = new Set();
    if (codeIds.length > 0) {
      const rows = await Activitate.findAll({
        where: {
          profesorId,
          codId: { [Op.in]: codeIds },
        },
        attributes: ["codId"],
        raw: true,
      });

      usedSet = new Set(rows.map((r) => r.codId));
    }

    return res.json({
      success: true,
      pagination: {
        start,
        limit,
        total,
        returned: codes.length,
      },
      codes: codes.map((c) => ({
        id: c.codId,
        continut: c.continut,
        esteAleatoriu: c.esteAleatoriu,
        usedByActivity: usedSet.has(c.codId),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[PROF_CODES_GET] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la listarea codurilor",
    });
  }
});

/**
 * POST /prof/codes
 * body: { continut?, esteAleatoriu? }
 *
 * - daca esteAleatoriu === true SAU continut lipsa -> generam cod random de 8 caractere
 * - daca esteAleatoriu === false -> continut obligatoriu, exact 8 caractere litere/cifre, upper
 * - unicitate: (profesorId, continut)
 */
router.post("/", async (req, res) => {
  try {
    const profesorId = req.user.id;
    let { continut, esteAleatoriu } = req.body || {};

    if (typeof esteAleatoriu !== "boolean") {
      esteAleatoriu = !continut;
    }

    let finalContinut;

    if (esteAleatoriu) {
      const maxTries = 5;
      let unique = false;
      let attempt = 0;

      while (!unique && attempt < maxTries) {
        const candidate = generateRandomCode(8);
        const existing = await Cod.findOne({
          where: { profesorId, continut: candidate },
        });

        if (!existing) {
          finalContinut = candidate;
          unique = true;
        } else {
          attempt += 1;
        }
      }

      if (!unique) {
        return res.status(500).json({
          success: false,
          error: "nu am reusit sa generez un cod unic, incearca din nou",
        });
      }
    } else {
      const norm = normalizeAndValidateContinut(continut);
      if (!norm.ok) {
        return res.status(400).json({
          success: false,
          error: norm.error,
        });
      }
      finalContinut = norm.value;

      const existing = await Cod.findOne({
        where: { profesorId, continut: finalContinut },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: "exista deja un cod cu acest continut pentru acest profesor",
        });
      }
    }

    const cod = await Cod.create({
      continut: finalContinut,
      profesorId,
      esteAleatoriu: !!esteAleatoriu,
    });

    return res.status(201).json({
      success: true,
      code: {
        id: cod.codId,
        continut: cod.continut,
        esteAleatoriu: cod.esteAleatoriu,
        createdAt: cod.createdAt,
        updatedAt: cod.updatedAt,
      },
    });
  } catch (err) {
    console.error("[PROF_CODES_POST] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la crearea codului",
    });
  }
});

/**
 * PUT /prof/codes/:id
 * body: { continut }
 *
 * - continut obligatoriu, exact 8 caractere litere/cifre
 * - seteaza esteAleatoriu = false
 * - unicitate per profesor (exclude codul curent)
 */
router.put("/:id", async (req, res) => {
  try {
    const profesorId = req.user.id;
    const idNum = Number(req.params.id);

    if (!Number.isInteger(idNum)) {
      return res.status(400).json({
        success: false,
        error: "id invalid",
      });
    }

    const cod = await Cod.findOne({
      where: {
        codId: idNum,
        profesorId,
      },
    });

    if (!cod) {
      return res.status(404).json({
        success: false,
        error: "codul nu a fost gasit",
      });
    }

    const { continut } = req.body || {};
    const norm = normalizeAndValidateContinut(continut);

    if (!norm.ok) {
      return res.status(400).json({
        success: false,
        error: norm.error,
      });
    }

    const finalContinut = norm.value;

    const existing = await Cod.findOne({
      where: {
        profesorId,
        continut: finalContinut,
        codId: { [Op.ne]: idNum },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "exista deja un cod cu acest continut pentru acest profesor",
      });
    }

    cod.continut = finalContinut;
    cod.esteAleatoriu = false;
    await cod.save();

    return res.json({
      success: true,
      code: {
        id: cod.codId,
        continut: cod.continut,
        esteAleatoriu: cod.esteAleatoriu,
        createdAt: cod.createdAt,
        updatedAt: cod.updatedAt,
      },
    });
  } catch (err) {
    console.error("[PROF_CODES_PUT] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la actualizarea codului",
    });
  }
});

/**
 * DELETE /prof/codes/:id
 *
 * - sterge codul profesorului curent
 * - restul tabelelor sunt curatate prin ON DELETE CASCADE pe foreign keys
 */
router.delete("/:id", async (req, res) => {
  try {
    const profesorId = req.user.id;
    const idNum = Number(req.params.id);

    if (!Number.isInteger(idNum)) {
      return res.status(400).json({
        success: false,
        error: "id invalid",
      });
    }

    const cod = await Cod.findOne({
      where: {
        codId: idNum,
        profesorId,
      },
    });

    if (!cod) {
      return res.status(404).json({
        success: false,
        error: "codul nu a fost gasit",
      });
    }

    await cod.destroy();

    return res.json({
      success: true,
      message: "cod sters cu succes",
    });
  } catch (err) {
    console.error("[PROF_CODES_DELETE] error", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la stergerea codului",
    });
  }
});

module.exports = router;
