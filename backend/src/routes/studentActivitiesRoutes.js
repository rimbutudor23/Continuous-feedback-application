const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Activitate, Cod, Participare } = require("../../models");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const PROFLINK_SECRET =
  process.env.PROFLINK_SECRET ||
  process.env.JWT_SECRET ||
  "dev-prof-link-secret";

function getActivityStatus(act) {
  const now = new Date();

  const start = new Date(act.oraInceput);
  const end = new Date(act.oraSfarsit);
  const accStart = new Date(act.accesibilDeLa);
  const accEnd = new Date(act.accesibilPanaLa);

  if (now > end) return "ended";
  if (now >= start && now <= end) return "current";
  if (now >= accStart && now <= accEnd) return "access_open";
  return "future";
}

function computeAccessFlags(act, alreadyJoined) {
  const now = new Date();

  const start = new Date(act.oraInceput);
  const end = new Date(act.oraSfarsit);
  const accStart = new Date(act.accesibilDeLa);
  const accEnd = new Date(act.accesibilPanaLa);

  const isInAccessWindow = now >= accStart && now <= accEnd;
  const isCurrent = now >= start && now <= end;
  const hasEnded = now > end;
  const isFuture = now < start;

  let canEnrollNow = false;
  let canAccessNow = false;
  let reasonEnroll = null;
  let reasonAccess = null;

  if (hasEnded) {
    reasonEnroll = "activitatea s-a incheiat";
    reasonAccess = "activitatea s-a incheiat";
    return { canEnrollNow, canAccessNow, reasonEnroll, reasonAccess };
  }

  if (isInAccessWindow) {
    if (isFuture) {
      canEnrollNow = true;
      canAccessNow = false;
      reasonAccess = "activitatea nu a inceput inca";
    } else if (isCurrent) {
      canEnrollNow = true;
      canAccessNow = true;
    }
  } else {
    if (isCurrent && alreadyJoined) {
      // regula:
      canEnrollNow = false;
      canAccessNow = true;
      reasonEnroll = "perioada de acces s-a incheiat";
    } else {
      if (now < accStart) {
        reasonEnroll = "perioada de acces nu a inceput inca";
        reasonAccess = "perioada de acces nu a inceput inca";
      } else if (now > accEnd) {
        reasonEnroll = "perioada de acces s-a incheiat";
        reasonAccess = "perioada de acces s-a incheiat";
      } else {
        reasonEnroll = "nu poti accesa aceasta activitate in acest moment";
        reasonAccess = "nu poti accesa aceasta activitate in acest moment";
      }
    }
  }

  return { canEnrollNow, canAccessNow, reasonEnroll, reasonAccess };
}

router.use(authRequired, requireRole(["student"]));

/**
 * POST /student/activities/check
 *
 * Body:
 *   {
 *     profLinkToken: string, // token din URL, semnat, contine profesorId
 *     cod: string           // cod activitate introdus de student (8 caractere)
 *   }
 *
 * Logica:
 *   - decodeaza profLinkToken -> profesorId
 *   - cauta codul la acel profesor
 *   - cauta o activitate asociata codului (cea mai recenta dupa oraInceput)
 *   - calculeaza status (future / access_open / current / ended)
 *   - verifica daca studentul are deja participare (alreadyJoined)
 *   - calculeaza canJoinNow:
 *       * daca alreadyJoined: access_open/current -> true
 *       * daca nu: doar access_open -> true
 *
 * Raspuns (succes):
 *   {
 *     success: true,
 *     activity: {
 *       activitateId,
 *       titlu,
 *       descriere,
 *       oraInceput,
 *       oraSfarsit,
 *       accesibilDeLa,
 *       accesibilPanaLa,
 *       codContinut,
 *       status
 *     },
 *     alreadyJoined: boolean,
 *     access: {
 *       canJoinNow: boolean,
 *       reason: string | null
 *     }
 *   }
 */
router.post("/check", async (req, res) => {
  try {
    const { profLinkToken, cod } = req.body || {};
    const studentId = req.user.id;

    if (!profLinkToken || typeof profLinkToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "profLinkToken lipseste sau este invalid",
      });
    }

    if (!cod || typeof cod !== "string") {
      return res.status(400).json({
        success: false,
        error: "cod lipseste sau este invalid",
      });
    }

    let payload;
    try {
      payload = jwt.verify(profLinkToken, PROFLINK_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: "profLinkToken invalid sau expirat",
      });
    }

    const profesorId = payload.profesorId || payload.id;
    if (!profesorId) {
      return res.status(400).json({
        success: false,
        error: "profLinkToken nu contine profesorId",
      });
    }

    const codNorm = cod.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(codNorm)) {
      return res.status(400).json({
        success: false,
        error: "cod invalid - trebuie sa aiba fix 8 caractere litere/cifre",
      });
    }

    const codRow = await Cod.findOne({
      where: { profesorId, continut: codNorm },
    });

    if (!codRow) {
      return res.status(404).json({
        success: false,
        error: "nu exista niciun cod activ pentru acest profesor",
      });
    }

    const act = await Activitate.findOne({
      where: {
        profesorId,
        codId: codRow.codId,
      },
      order: [["oraInceput", "DESC"]],
    });

    if (!act) {
      return res.status(404).json({
        success: false,
        error: "nu exista nicio activitate pentru acest cod",
      });
    }

    const status = getActivityStatus(act);

    const participare = await Participare.findOne({
      where: {
        studentId,
        activitateId: act.activitateId,
      },
    });

    const alreadyJoined = !!participare;

    const { canEnrollNow, canAccessNow, reasonAccess } = computeAccessFlags(
      act,
      alreadyJoined
    );

    return res.json({
      success: true,
      activity: {
        activitateId: act.activitateId,
        titlu: act.titlu,
        descriere: act.descriere,
        oraInceput: act.oraInceput,
        oraSfarsit: act.oraSfarsit,
        accesibilDeLa: act.accesibilDeLa,
        accesibilPanaLa: act.accesibilPanaLa,
        codContinut: codRow.continut,
        status,
      },
      alreadyJoined,
      access: {
        canJoinNow: canAccessNow,
        canEnrollNow,
        reason: canAccessNow ? null : reasonAccess,
      },
    });
  } catch (err) {
    console.error("[STUDENT_ACT_CHECK]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la verificarea activitatii",
    });
  }
});

/**
 * POST /student/activities/join
 *
 * Body:
 *   {
 *     profLinkToken: string, // token din URL, semnat, contine profesorId
 *     cod: string            // cod activitate introdus de student (8 caractere)
 *   }
 *
 * Logica:
 *   - decodeaza profLinkToken -> profesorId
 *   - cauta codul la acel profesor
 *   - cauta o activitate asociata codului (cea mai recenta dupa oraInceput)
 *   - calculeaza status (future / access_open / current / ended)
 *   - verifica daca studentul are deja participare (alreadyJoined)
 *   - aplica regulile:
 *       * daca alreadyJoined:
 *           - permite join doar daca status in ["access_open", "current"]
 *       * daca nu:
 *           - permite join doar daca status == "access_open"
 *   - daca se permite:
 *       * daca nu exista participare -> creeaza (joinedAt, lastActionAt = acum)
 *       * daca exista -> update lastActionAt = acum
 *
 * Raspuns:
 *   {
 *     success: true,
 *     joined: true,
 *     alreadyJoined: boolean,
 *     activity: { ... }   // optional, pentru frontend (id, titlu, times, cod, status)
 *   }
 */
router.post("/join", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { profLinkToken, cod } = req.body || {};

    if (!profLinkToken || typeof profLinkToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "profLinkToken lipseste sau este invalid",
      });
    }

    if (!cod || typeof cod !== "string") {
      return res.status(400).json({
        success: false,
        error: "cod lipseste sau este invalid",
      });
    }

    let payload;
    try {
      payload = jwt.verify(profLinkToken, PROFLINK_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: "profLinkToken invalid sau expirat",
      });
    }

    const profesorId = payload.profesorId || payload.id;
    if (!profesorId) {
      return res.status(400).json({
        success: false,
        error: "profLinkToken nu contine profesorId",
      });
    }

    const codNorm = cod.trim().toUpperCase();
    console.log(codNorm);
    if (!/^[A-Z0-9]{8}$/.test(codNorm)) {
      return res.status(400).json({
        success: false,
        error: "cod invalid - trebuie sa aiba fix 8 caractere litere/cifre",
      });
    }

    const codRow = await Cod.findOne({
      where: { profesorId, continut: codNorm },
    });

    if (!codRow) {
      return res.status(404).json({
        success: false,
        error: "nu exista niciun cod activ pentru acest profesor",
      });
    }

    const act = await Activitate.findOne({
      where: {
        profesorId,
        codId: codRow.codId,
      },
      order: [["oraInceput", "DESC"]],
    });

    if (!act) {
      return res.status(404).json({
        success: false,
        error: "nu exista nicio activitate pentru acest cod",
      });
    }

    const status = getActivityStatus(act);

    const participare = await Participare.findOne({
      where: {
        studentId,
        activitateId: act.activitateId,
      },
    });

    const alreadyJoined = !!participare;

    const { canEnrollNow, canAccessNow, reasonEnroll } = computeAccessFlags(
      act,
      alreadyJoined
    );

    if (!alreadyJoined && !canEnrollNow) {
      return res.status(403).json({
        success: false,
        error:
          reasonEnroll ||
          "nu poti sa te inrolezi la aceasta activitate in acest moment",
      });
    }

    if (alreadyJoined && !canAccessNow && !canEnrollNow) {
      return res.status(403).json({
        success: false,
        error:
          reasonEnroll || "nu poti accesa aceasta activitate in acest moment",
      });
    }

    const now = new Date();

    if (!participare) {
      await Participare.create({
        studentId,
        activitateId: act.activitateId,
        joinedAt: now,
        lastActionAt: now,
      });
    } else {
      participare.lastActionAt = now;
      await participare.save();
    }

    return res.json({
      success: true,
      joined: true,
      alreadyJoined,
      activity: {
        activitateId: act.activitateId,
        titlu: act.titlu,
        descriere: act.descriere,
        oraInceput: act.oraInceput,
        oraSfarsit: act.oraSfarsit,
        accesibilDeLa: act.accesibilDeLa,
        accesibilPanaLa: act.accesibilPanaLa,
        codContinut: codRow.continut,
        status,
      },
      access: {
        canJoinNow: canAccessNow,
        canEnrollNow,
      },
    });
  } catch (err) {
    console.error("[STUDENT_ACT_JOIN]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la join activitate",
    });
  }
});

/**
 * GET /student/activities/history
 *
 * Query params:
 *   - sort: "title_asc" | "title_desc" | "lastAccess_asc" | "lastAccess_desc"
 *
 * Returneaza toate activitatile la care studentul a participat.
 *
 * Raspuns:
 *   {
 *     success: true,
 *     activities: [
 *       {
 *         activitateId,
 *         titlu,
 *         descriere,
 *         oraInceput,
 *         oraSfarsit,
 *         accesibilDeLa,
 *         accesibilPanaLa,
 *         codContinut,
 *         status,
 *         joinedAt,
 *         lastAccessAt
 *       }
 *     ]
 *   }
 */
router.get("/history", async (req, res) => {
  try {
    const studentId = req.user.id;
    const sort = req.query.sort || "lastAccess_desc";

    const participari = await Participare.findAll({
      where: { studentId },
      include: [
        {
          model: Activitate,
          as: "activitate",
          include: [
            {
              model: Cod,
              as: "cod",
              attributes: ["continut"],
            },
          ],
        },
      ],
    });

    const items = participari
      .filter((p) => p.activitate)
      .map((p) => {
        const act = p.activitate;
        const codRow = act.cod;
        const lastAccess =
          p.lastActionAt && p.lastActionAt instanceof Date
            ? p.lastActionAt
            : p.lastActionAt
            ? new Date(p.lastActionAt)
            : p.joinedAt;

        return {
          activitateId: act.activitateId,
          titlu: act.titlu,
          descriere: act.descriere,
          oraInceput: act.oraInceput,
          oraSfarsit: act.oraSfarsit,
          accesibilDeLa: act.accesibilDeLa,
          accesibilPanaLa: act.accesibilPanaLa,
          codContinut: codRow ? codRow.continut : null,
          status: getActivityStatus(act),
          joinedAt: p.joinedAt,
          lastAccessAt: lastAccess,
        };
      });

    items.sort((a, b) => {
      switch (sort) {
        case "title_asc":
          return a.titlu.localeCompare(b.titlu);
        case "title_desc":
          return b.titlu.localeCompare(a.titlu);
        case "lastAccess_asc":
          return new Date(a.lastAccessAt) - new Date(b.lastAccessAt);
        case "lastAccess_desc":
        default:
          return new Date(b.lastAccessAt) - new Date(a.lastAccessAt);
      }
    });

    return res.json({
      success: true,
      activities: items,
    });
  } catch (err) {
    console.error("[STUDENT_ACT_HISTORY]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la istoricul activitatilor",
    });
  }
});

module.exports = router;
