const express = require("express");
const Disponibilidade = require("../models/Disponibilidade");
const Espaco = require("../models/Espaco");
const { idValido, tratarErro } = require("../utils/http");

const router = express.Router();
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

async function validate(body, ignoredId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "O corpo da requisição deve ser um objeto JSON";
  }

  const requiredFields = ["space_id", "day_of_week", "start_time", "end_time", "is_external_allowed"];
  const missingField = requiredFields.find((field) => body[field] === undefined);
  if (missingField) {
    return `O campo '${missingField}' é obrigatório`;
  }

  const { space_id, day_of_week, start_time, end_time, is_external_allowed } = body;
  if (!idValido(space_id)) {
    return "O campo 'space_id' deve ser um ID válido";
  }
  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return "O campo 'day_of_week' deve ser um número inteiro entre 0 e 6";
  }
  if (typeof start_time !== "string" || !TIME_REGEX.test(start_time)) {
    return "O campo 'start_time' deve estar no formato HH:mm";
  }
  if (typeof end_time !== "string" || !TIME_REGEX.test(end_time)) {
    return "O campo 'end_time' deve estar no formato HH:mm";
  }
  if (start_time >= end_time) {
    return "O campo 'start_time' deve ser anterior a 'end_time'";
  }
  if (typeof is_external_allowed !== "boolean") {
    return "O campo 'is_external_allowed' deve ser true ou false";
  }

  if (!(await Espaco.exists({ _id: space_id }))) {
    return "O espaço informado não foi encontrado";
  }

  // Sobreposição: existente.start < novo.end  E  existente.end > novo.start
  const filtroSobreposicao = {
    space_id,
    day_of_week,
    start_time: { $lt: end_time },
    end_time: { $gt: start_time },
  };
  if (ignoredId) filtroSobreposicao._id = { $ne: ignoredId };
  if (await Disponibilidade.exists(filtroSobreposicao)) {
    return "Já existe uma disponibilidade com horário sobreposto para este espaço e dia da semana";
  }

  return null;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Disponibilidade:
 *       type: object
 *       required: [id, space_id, day_of_week, start_time, end_time, is_external_allowed]
 *       properties:
 *         id:
 *           type: string
 *           description: ID gerado automaticamente pelo MongoDB
 *           example: "65f1c2a4e1b2c3d4e5f60718"
 *         space_id:
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f60719"
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           description: Dia da semana, sendo 0 domingo e 6 sábado
 *           example: 1
 *         start_time:
 *           type: string
 *           pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
 *           example: "12:00"
 *         is_external_allowed:
 *           type: boolean
 *           example: false
 *     DisponibilidadeInput:
 *       type: object
 *       required: [space_id, day_of_week, start_time, end_time, is_external_allowed]
 *       properties:
 *         space_id:
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f60719"
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         start_time:
 *           type: string
 *           pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
 *           example: "12:00"
 *         is_external_allowed:
 *           type: boolean
 *           example: false
 *     DisponibilidadeError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Já existe uma disponibilidade com horário sobreposto para este espaço e dia da semana
 */

/**
 * @swagger
 * /disponibilidades:
 *   get:
 *     summary: Lista disponibilidades com filtros opcionais
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: string
 *         example: "65f1c2a4e1b2c3d4e5f60719"
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Dia da semana, sendo 0 domingo e 6 sábado
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de disponibilidades retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Disponibilidade'
 *             example:
 *               - id: "65f1c2a4e1b2c3d4e5f60718"
 *                 space_id: "65f1c2a4e1b2c3d4e5f60719"
 *                 day_of_week: 1
 *                 start_time: "08:00"
 *                 end_time: "12:00"
 *                 is_external_allowed: false
 *       400:
 *         description: Filtro inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 */
router.get("/", async (req, res) => {
  try {
    const { space_id, day_of_week } = req.query;
    const filtro = {};

    if (space_id !== undefined) {
      if (!idValido(space_id)) {
        return res.status(400).json({ message: "O filtro 'space_id' deve ser um ID válido" });
      }
      filtro.space_id = space_id;
    }
    if (day_of_week !== undefined) {
      const number = Number(day_of_week);
      if (String(day_of_week).trim() === "" || !Number.isInteger(number) || number < 0 || number > 6) {
        return res.status(400).json({ message: "O filtro 'day_of_week' deve ser um número inteiro entre 0 e 6" });
      }
      filtro.day_of_week = number;
    }

    const availabilities = await Disponibilidade.find(filtro).sort({
      space_id: 1,
      day_of_week: 1,
      start_time: 1,
    });
    res.status(200).json(availabilities);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   get:
 *     summary: Busca uma disponibilidade por ID
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       404:
 *         description: Disponibilidade não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 */
router.get("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Disponibilidade não encontrada" });
    const availability = await Disponibilidade.findById(req.params.id);
    if (!availability) return res.status(404).json({ message: "Disponibilidade não encontrada" });
    res.status(200).json(availability);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /disponibilidades:
 *   post:
 *     summary: Cadastra uma disponibilidade
 *     tags: [Disponibilidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *           example:
 *             space_id: "65f1c2a4e1b2c3d4e5f60719"
 *             day_of_week: 2
 *             start_time: "08:00"
 *             end_time: "12:00"
 *             is_external_allowed: false
 *     responses:
 *       201:
 *         description: Disponibilidade criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       400:
 *         description: Dados inválidos ou horário sobreposto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 */
router.post("/", async (req, res) => {
  try {
    const error = await validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const newAvailability = await Disponibilidade.create({
      space_id: req.body.space_id,
      day_of_week: req.body.day_of_week,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      is_external_allowed: req.body.is_external_allowed,
    });
    res.status(201).json(newAvailability);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   put:
 *     summary: Atualiza uma disponibilidade existente
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *           example:
 *             space_id: "65f1c2a4e1b2c3d4e5f60719"
 *             day_of_week: 2
 *             start_time: "08:00"
 *             end_time: "12:00"
 *             is_external_allowed: false
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       400:
 *         description: Dados inválidos ou horário sobreposto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 *       404:
 *         description: Disponibilidade não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 */
router.put("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Disponibilidade não encontrada" });
    const availability = await Disponibilidade.findById(req.params.id);
    if (!availability) return res.status(404).json({ message: "Disponibilidade não encontrada" });

    const error = await validate(req.body, availability._id);
    if (error) return res.status(400).json({ message: error });

    availability.set({
      space_id: req.body.space_id,
      day_of_week: req.body.day_of_week,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      is_external_allowed: req.body.is_external_allowed,
    });
    await availability.save();
    res.status(200).json(availability);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   delete:
 *     summary: Remove uma disponibilidade
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     responses:
 *       200:
 *         description: Disponibilidade removida
 *         content:
 *           application/json:
 *             example:
 *               message: Disponibilidade removida com sucesso
 *       404:
 *         description: Disponibilidade não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadeError'
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Disponibilidade não encontrada" });
    const removida = await Disponibilidade.findByIdAndDelete(req.params.id);
    if (!removida) return res.status(404).json({ message: "Disponibilidade não encontrada" });
    res.status(200).json({ message: "Disponibilidade removida com sucesso" });
  } catch (err) {
    tratarErro(res, err);
  }
});

module.exports = router;