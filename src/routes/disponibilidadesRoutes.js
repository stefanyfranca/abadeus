const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DB_PATH = path.join(__dirname, "..", "db", "disponibilidades.json");
const SPACES_PATH = path.join(__dirname, "..", "db", "espacos.json");
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function readAvailabilities() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveAvailabilities(availabilities) {
  fs.writeFileSync(DB_PATH, JSON.stringify(availabilities, null, 2), "utf-8");
}

function validate(body, availabilities, ignoredId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "O corpo da requisição deve ser um objeto JSON";
  }

  const requiredFields = ["space_id", "day_of_week", "start_time", "end_time", "is_external_allowed"];
  const missingField = requiredFields.find((field) => body[field] === undefined);
  if (missingField) {
    return `O campo '${missingField}' é obrigatório`;
  }

  const { space_id, day_of_week, start_time, end_time, is_external_allowed } = body;
  if (!Number.isInteger(space_id) || space_id <= 0) {
    return "O campo 'space_id' deve ser um número inteiro maior que zero";
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

  if (fs.existsSync(SPACES_PATH)) {
    const spaces = JSON.parse(fs.readFileSync(SPACES_PATH, "utf-8"));
    if (!spaces.some((space) => space.id === space_id)) {
      return "O espaço informado não foi encontrado";
    }
  }

  const overlaps = availabilities.some((availability) =>
    availability.id !== ignoredId &&
    availability.space_id === space_id &&
    availability.day_of_week === day_of_week &&
    start_time < availability.end_time &&
    end_time > availability.start_time
  );
  if (overlaps) {
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
 *           type: integer
 *           description: ID gerado automaticamente
 *           example: 1
 *         space_id:
 *           type: integer
 *           example: 1
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
 *           type: integer
 *           example: 1
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
 *           type: integer
 *         example: 1
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
 *               - id: 1
 *                 space_id: 1
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
router.get("/", (req, res) => {
  const { space_id, day_of_week } = req.query;
  let availabilities = readAvailabilities();

  for (const [field, value] of [["space_id", space_id], ["day_of_week", day_of_week]]) {
    const number = Number(value);
    const valid = value !== undefined && String(value).trim() !== "" && Number.isInteger(number);
    if (value !== undefined && (!valid || (field === "space_id" ? number <= 0 : number < 0 || number > 6))) {
      return res.status(400).json({ message: `O filtro '${field}' deve ser um número inteiro válido` });
    }
    if (value !== undefined) {
      availabilities = availabilities.filter((availability) => availability[field] === number);
    }
  }

  availabilities.sort((first, second) =>
    first.space_id - second.space_id ||
    first.day_of_week - second.day_of_week ||
    first.start_time.localeCompare(second.start_time)
  );
  res.status(200).json(availabilities);
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
 *           type: integer
 *         example: 1
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
router.get("/:id", (req, res) => {
  const availability = readAvailabilities().find((item) => item.id === Number(req.params.id));
  if (!availability) {
    return res.status(404).json({ message: "Disponibilidade não encontrada" });
  }
  res.status(200).json(availability);
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
 *             space_id: 1
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
router.post("/", (req, res) => {
  const availabilities = readAvailabilities();
  const error = validate(req.body, availabilities);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const nextId = availabilities.length ? Math.max(...availabilities.map((item) => item.id)) + 1 : 1;
  const newAvailability = {
    id: nextId,
    space_id: req.body.space_id,
    day_of_week: req.body.day_of_week,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    is_external_allowed: req.body.is_external_allowed,
  };

  availabilities.push(newAvailability);
  saveAvailabilities(availabilities);
  res.status(201).json(newAvailability);
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
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *           example:
 *             space_id: 1
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
router.put("/:id", (req, res) => {
  const availabilities = readAvailabilities();
  const index = availabilities.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Disponibilidade não encontrada" });
  }

  const error = validate(req.body, availabilities, availabilities[index].id);
  if (error) {
    return res.status(400).json({ message: error });
  }

  availabilities[index] = {
    id: availabilities[index].id,
    space_id: req.body.space_id,
    day_of_week: req.body.day_of_week,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    is_external_allowed: req.body.is_external_allowed,
  };

  saveAvailabilities(availabilities);
  res.status(200).json(availabilities[index]);
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
 *           type: integer
 *         example: 1
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
router.delete("/:id", (req, res) => {
  const availabilities = readAvailabilities();
  const index = availabilities.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Disponibilidade não encontrada" });
  }

  availabilities.splice(index, 1);
  saveAvailabilities(availabilities);
  res.status(200).json({ message: "Disponibilidade removida com sucesso" });
});

module.exports = router;