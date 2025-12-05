const express = require("express");
const { Op } = require("sequelize");
const { Cod, Activitate, Feedback, Participare } = require("../../models");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

function generateRandomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

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

function formatActivity(act, codContinut) {
  return {
    activitateId: act.activitateId,
    titlu: act.titlu,
    descriere: act.descriere,
    oraInceput: act.oraInceput,
    oraSfarsit: act.oraSfarsit,
    accesibilDeLa: act.accesibilDeLa,
    accesibilPanaLa: act.accesibilPanaLa,
    codContinut,
    status: getActivityStatus(act),
  };
}

router.use(authRequired, requireRole(["profesor"]));

/**
 * GET /prof/activities
 *
 * Query params:
 *   - start: number (offset) — optional
 *   - limit: number (max 100) — optional
 *   - sort: "createdAt_desc" | "oraInceput_asc" | "oraInceput_desc"
 *   - status: array of [
 *        "ended",
 *        "current",
 *        "access_open",
 *        "future"
 *     ]
 *
 * Returneaza:
 *   {
 *     success: true,
 *     pagination: { start, limit, total, returned },
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
 *         status
 *       }
 *     ]
 *   }
 */
router.get("/", async (req, res) => {
  try {
    const profesorId = req.user.id;

    let start = parseInt(req.query.start, 10);
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    let sort = req.query.sort || "createdAt_desc";
    let order;
    switch (sort) {
      case "oraInceput_asc":
        order = [["oraInceput", "ASC"]];
        break;
      case "oraInceput_desc":
        order = [["oraInceput", "DESC"]];
        break;
      default:
        order = [["createdAt", "DESC"]];
    }

    let statusFilters = req.query.status;
    if (!Array.isArray(statusFilters)) {
      if (typeof statusFilters === "string") {
        statusFilters = [statusFilters];
      } else {
        statusFilters = null;
      }
    }

    const total = await Activitate.count({ where: { profesorId } });

    const activities = await Activitate.findAll({
      where: { profesorId },
      order,
      offset: start,
      limit,
      include: [
        {
          model: Cod,
          as: "cod",
          attributes: ["continut"],
        },
      ],
    });

    let output = activities.map((a) =>
      formatActivity(a, a.cod?.continut || null)
    );

    if (statusFilters && statusFilters.length > 0) {
      output = output.filter((x) => statusFilters.includes(x.status));
    }

    return res.json({
      success: true,
      pagination: {
        start,
        limit,
        total,
        returned: output.length,
      },
      activities: output,
    });
  } catch (err) {
    console.error("[PROF_ACT_GET]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la listarea activitatilor",
    });
  }
});

/**
 * POST /prof/activities
 *
 * Body obligatoriu:
 *   {
 *     titlu: string,
 *     descriere: string,
 *     oraInceput: datetime ISO string,
 *     oraSfarsit: datetime ISO string,
 *     accesibilDeLa: datetime ISO string,
 *     accesibilPanaLa: datetime ISO string,
 *
 *     // optional:
 *     codId: number
 *   }
 *
 * Reguli:
 *   - daca codId este prezent → trebuie sa apartina profesorului
 *   - daca codId lipseste → se genereaza automat un cod random de 8 caractere
 *   - oraInceput < oraSfarsit
 *   - accesibilDeLa <= accesibilPanaLa
 *
 * Returneaza:
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
 *     }
 *   }
 */
router.post("/", async (req, res) => {
  try {
    const profesorId = req.user.id;
    const {
      titlu,
      descriere,
      oraInceput,
      oraSfarsit,
      accesibilDeLa,
      accesibilPanaLa,
      codId,
    } = req.body || {};

    if (
      !titlu ||
      !descriere ||
      !oraInceput ||
      !oraSfarsit ||
      !accesibilDeLa ||
      !accesibilPanaLa
    ) {
      return res.status(400).json({
        success: false,
        error: "toate campurile sunt obligatorii",
      });
    }

    const start = new Date(oraInceput);
    const end = new Date(oraSfarsit);
    const accStart = new Date(accesibilDeLa);
    const accEnd = new Date(accesibilPanaLa);

    if (!(start < end)) {
      return res.status(400).json({
        success: false,
        error: "oraInceput trebuie sa fie inainte de oraSfarsit",
      });
    }
    if (!(accStart <= accEnd)) {
      return res.status(400).json({
        success: false,
        error: "accesibilDeLa trebuie sa fie inainte de accesibilPanaLa",
      });
    }

    let finalCodId;

    if (codId) {
      const cod = await Cod.findOne({
        where: { codId, profesorId },
      });
      if (!cod) {
        return res.status(400).json({
          success: false,
          error: "codId invalid sau nu apartine profesorului",
        });
      }
      finalCodId = codId;
    } else {
      let continut;
      let ok = false;
      for (let i = 0; i < 5; i++) {
        continut = generateRandomCode();
        const exists = await Cod.findOne({
          where: { profesorId, continut },
        });
        if (!exists) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        return res.status(500).json({
          success: false,
          error: "nu am putut genera un cod unic",
        });
      }

      const newCode = await Cod.create({
        continut,
        profesorId,
        esteAleatoriu: true,
      });

      finalCodId = newCode.codId;
    }

    const act = await Activitate.create({
      profesorId,
      codId: finalCodId,
      titlu,
      descriere,
      oraInceput,
      oraSfarsit,
      accesibilDeLa,
      accesibilPanaLa,
    });

    const cod = await Cod.findByPk(finalCodId);

    return res.status(201).json({
      success: true,
      activity: formatActivity(act, cod.continut),
    });
  } catch (err) {
    console.error("[PROF_ACT_POST]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la crearea activitatii",
    });
  }
});

/**
 * PUT /prof/activities/:id
 *
 * Body (toate campurile sunt OPTIONAL):
 *   {
 *     titlu?: string,
 *     descriere?: string,
 *     oraInceput?: datetime ISO string,
 *     oraSfarsit?: datetime ISO string,
 *     accesibilDeLa?: datetime ISO string,
 *     accesibilPanaLa?: datetime ISO string,
 *     codId?: number
 *   }
 *
 * Reguli:
 *   - activitatea poate fi editata doar daca:
 *        now < accesibilDeLa
 *        SI
 *        now < oraInceput
 *   - oraInceput < oraSfarsit (daca ambele sunt trimise)
 *   - accesibilDeLa <= accesibilPanaLa (daca ambele sunt trimise)
 *
 * Returneaza:
 *   {
 *     success: true,
 *     activity: { ...formatActivity }
 *   }
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

    const act = await Activitate.findOne({
      where: { activitateId: idNum, profesorId },
    });

    if (!act) {
      return res.status(404).json({
        success: false,
        error: "activitatea nu exista",
      });
    }

    const now = new Date();
    if (now >= new Date(act.accesibilDeLa) || now >= new Date(act.oraInceput)) {
      return res.status(403).json({
        success: false,
        error: "activitatea nu mai poate fi editata",
      });
    }

    const {
      titlu,
      descriere,
      oraInceput,
      oraSfarsit,
      accesibilDeLa,
      accesibilPanaLa,
      codId,
    } = req.body || {};

    let finalCodId = act.codId;
    if (codId !== undefined) {
      const cod = await Cod.findOne({
        where: { codId, profesorId },
      });
      if (!cod) {
        return res.status(400).json({
          success: false,
          error:
            "codId invalid pentru update - trebuie sa apartina profesorului",
        });
      }
      finalCodId = codId;
    }

    if (oraInceput && oraSfarsit) {
      if (!(new Date(oraInceput) < new Date(oraSfarsit))) {
        return res.status(400).json({
          success: false,
          error: "oraInceput trebuie sa fie inainte de oraSfarsit",
        });
      }
    }
    if (accesibilDeLa && accesibilPanaLa) {
      if (!(new Date(accesibilDeLa) <= new Date(accesibilPanaLa))) {
        return res.status(400).json({
          success: false,
          error: "accesibilDeLa trebuie sa fie inainte de accesibilPanaLa",
        });
      }
    }

    if (titlu !== undefined) act.titlu = titlu;
    if (descriere !== undefined) act.descriere = descriere;
    if (oraInceput !== undefined) act.oraInceput = oraInceput;
    if (oraSfarsit !== undefined) act.oraSfarsit = oraSfarsit;
    if (accesibilDeLa !== undefined) act.accesibilDeLa = accesibilDeLa;
    if (accesibilPanaLa !== undefined) act.accesibilPanaLa = accesibilPanaLa;
    act.codId = finalCodId;

    await act.save();

    const cod = await Cod.findByPk(finalCodId);

    return res.json({
      success: true,
      activity: formatActivity(act, cod.continut),
    });
  } catch (err) {
    console.error("[PROF_ACT_PUT]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la actualizarea activitatii",
    });
  }
});

/**
 * DELETE /prof/activities/:id
 *
 * Body: none
 *
 * Reguli:
 *   - activitatea trebuie sa apartina profesorului
 *   - stergerea este CASCADE → se sterge si feedback-ul
 *
 * Return:
 *   {
 *     success: true,
 *     message: "activitate stearsa"
 *   }
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

    const act = await Activitate.findOne({
      where: { activitateId: idNum, profesorId },
    });

    if (!act) {
      return res.status(404).json({
        success: false,
        error: "activitatea nu a fost gasita",
      });
    }

    await act.destroy();

    return res.json({
      success: true,
      message: "activitate stearsa",
    });
  } catch (err) {
    console.error("[PROF_ACT_DELETE]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la stergerea activitatii",
    });
  }
});

/**
 * GET /prof/activities/:id/stats
 *
 * Query: none
 *
 * Reguli:
 *   - activitatea trebuie sa apartina profesorului logat
 *   - nu foloseste websocket; intoarce statistici agregate pentru activitate
 *
 * Returneaza:
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
 *       codContinut
 *     },
 *     summary: {
 *       status,                     // future | access_open | current | ended
 *       participantsCount,          // numar participanti (Participare)
 *       feedbackCount,              // total feedback
 *       avgFeedbackPerParticipant,  // feedbackCount / max(1, participantsCount)
 *       firstFeedbackAt,            // null daca nu exista feedback
 *       lastFeedbackAt,             // null daca nu exista feedback
 *       durationMinutes,            // durata activitatii in minute
 *       feedbackPerMinute           // feedbackCount / max(1, durationMinutes)
 *     },
 *     feedbackByEmoticon: {
 *       "1": number,
 *       "2": number,
 *       "3": number,
 *       "4": number
 *     },
 *     feedbackTimelineRaw: [
 *       { time, emoticon }
 *     ]
 *   }
 */
router.get("/:id/stats", async (req, res) => {
  try {
    const profesorId = req.user.id;
    const idNum = Number(req.params.id);

    if (!Number.isInteger(idNum)) {
      return res.status(400).json({
        success: false,
        error: "id invalid",
      });
    }

    const act = await Activitate.findOne({
      where: { activitateId: idNum, profesorId },
      include: [
        {
          model: Cod,
          as: "cod",
          attributes: ["continut"],
        },
      ],
    });

    if (!act) {
      return res.status(404).json({
        success: false,
        error: "activitatea nu a fost gasita",
      });
    }

    const status = getActivityStatus(act);

    const participantsCount = await Participare.count({
      where: { activitateId: act.activitateId },
    });

    const feedbackRows = await Feedback.findAll({
      where: { activitateId: act.activitateId },
      attributes: ["emoticon", "createdAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    const feedbackCount = feedbackRows.length;

    const feedbackTimelineRaw = feedbackRows.map((f) => ({
      time: f.createdAt,
      emoticon: f.emoticon,
    }));

    const timelineByMinuteMap = {};

    for (const row of feedbackRows) {
      const d = new Date(row.createdAt);
      if (Number.isNaN(d.getTime())) continue;

      d.setSeconds(0, 0);
      const minuteKey = d.toISOString();

      if (!timelineByMinuteMap[minuteKey]) {
        timelineByMinuteMap[minuteKey] = {
          time: minuteKey,
          total: 0,
          byEmoticon: {},
        };
      }

      const bucket = timelineByMinuteMap[minuteKey];
      const emoKey = String(row.emoticon);

      bucket.total += 1;
      bucket.byEmoticon[emoKey] = (bucket.byEmoticon[emoKey] || 0) + 1;
    }

    const feedbackTimelineByMinute = Object.values(timelineByMinuteMap).sort(
      (a, b) => new Date(a.time) - new Date(b.time)
    );

    const firstFeedbackAt =
      feedbackTimelineRaw.length > 0 ? feedbackTimelineRaw[0].time : null;
    const lastFeedbackAt =
      feedbackTimelineRaw.length > 0
        ? feedbackTimelineRaw[feedbackTimelineRaw.length - 1].time
        : null;

    const feedbackByEmoticon = {};
    for (const row of feedbackRows) {
      const key = String(row.emoticon);
      feedbackByEmoticon[key] = (feedbackByEmoticon[key] || 0) + 1;
    }

    const start = act.oraInceput ? new Date(act.oraInceput) : null;
    const end = act.oraSfarsit ? new Date(act.oraSfarsit) : null;
    let durationMinutes = null;
    if (start && end && end > start) {
      durationMinutes = (end.getTime() - start.getTime()) / 60000;
    }

    const avgFeedbackPerParticipant =
      participantsCount > 0 ? feedbackCount / participantsCount : 0;

    const feedbackPerMinute =
      durationMinutes && durationMinutes > 0
        ? feedbackCount / durationMinutes
        : 0;

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
        codContinut: act.cod ? act.cod.continut : null,
      },
      summary: {
        status,
        participantsCount,
        feedbackCount,
        avgFeedbackPerParticipant,
        firstFeedbackAt,
        lastFeedbackAt,
        durationMinutes,
        feedbackPerMinute,
      },
      feedbackByEmoticon,
      feedbackTimelineRaw,
      feedbackTimelineByMinute,
    });
  } catch (err) {
    console.error("[PROF_ACT_STATS]", err);
    return res.status(500).json({
      success: false,
      error: "eroare interna la statistici activitate",
    });
  }
});

module.exports = router;
