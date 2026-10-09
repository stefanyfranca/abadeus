const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DB_PATH = path.join(__dirname, "..", "db", "disponibilidades.json");
const SPACES_PATH = path.join(__dirname, "..", "db", "espacos.json");

function readAvailabilities() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveAvailabilities(availabilities) {
  fs.writeFileSync(DB_PATH, JSON.stringify(availabilities, null, 2), "utf-8");
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "O corpo da requisição deve ser um objeto JSON";
  }
  const { space_id, day_of_week, start_time, end_time, is_external_allowed } = body;
  if (!Number.isInteger(space_id) || space_id <= 0) {
    return "O campo 'space_id' deve ser um número inteiro maior que zero";
  }
  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return "O campo 'day_of_week' deve ser um número inteiro entre 0 e 6";
  }
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (typeof start_time !== "string" || !timePattern.test(start_time)) {
    return "O campo 'start_time' deve estar no formato HH:MM, entre 00:00 e 23:59";
  }
  if (typeof end_time !== "string" || !timePattern.test(end_time)) {
    return "O campo 'end_time' deve estar no formato HH:MM, entre 00:00 e 23:59";
  }
  if (end_time <= start_time) {
    return "O campo 'end_time' deve ser posterior a 'start_time'";
  }
  if (typeof is_external_allowed !== "boolean") {
    return "O campo 'is_external_allowed' deve ser true ou false";
  }
  if (!JSON.parse(fs.readFileSync(SPACES_PATH, "utf-8")).some((space) => space.id === space_id)) {
    return "O espaço informado não foi encontrado";
  }
  return null;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Availability:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID gerado automaticamente
 *           example: 1
 *         space_id:
 *           type: integer
 *           example: 2
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           description: Dia da semana (0 a 6)
 *           example: 1
 *         start_time:
 *           type: string
 *           pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *           example: "09:00"
 *         end_time:
 *           type: string
 *           pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *           example: "18:00"
 *         is_external_allowed:
 *           type: boolean
 *           example: false
 *     AvailabilityInput:
 *       type: object
 *       required: [space_id, day_of_week, start_time, end_time, is_external_allowed]
 *       properties:
 *         space_id:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         start_time:
 *           type: string
 *           pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *           example: "09:00"
 *         end_time:
 *           type: string
 *           pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *           example: "18:00"
 *         is_external_allowed:
 *           type: boolean
 *           example: false
 *     AvailabilityError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Disponibilidade não encontrada
 */

/**
 * @swagger
 * /availabilities:
 *   get:
 *     summary: Lista todas as disponibilidades
 *     tags: [Disponibilidades Ricardo Nazário]
 *     responses:
 *       200:
 *         description: Disponibilidades retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Availability'
 */
router.get("/", (req, res) => res.status(200).json(readAvailabilities()));

/**
 * @swagger
 * /availabilities/{id}:
 *   get:
 *     summary: Busca uma disponibilidade por ID
 *     tags: [Disponibilidades Ricardo Nazário]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Availability'
 *       404:
 *         description: Disponibilidade não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityError'
 */
router.get("/:id", (req, res) => {
  const availability = readAvailabilities().find((item) => item.id === Number(req.params.id));
  if (!availability) return res.status(404).json({ message: "Disponibilidade não encontrada" });
  return res.status(200).json(availability);
});

/**
 * @swagger
 * /availabilities:
 *   post:
 *     summary: Cadastra uma disponibilidade
 *     tags: [Disponibilidades Ricardo Nazário]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AvailabilityInput'
 *     responses:
 *       201:
 *         description: Disponibilidade criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Dados inválidos ou espaço não encontrado
 */
router.post("/", (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const availabilities = readAvailabilities();
  const nextId = availabilities.length ? Math.max(...availabilities.map((item) => item.id)) + 1 : 1;
  const availability = {
    id: nextId,
    space_id: req.body.space_id,
    day_of_week: req.body.day_of_week,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    is_external_allowed: req.body.is_external_allowed,
  };
  availabilities.push(availability);
  saveAvailabilities(availabilities);
  return res.status(201).json(availability);
});

/**
 * @swagger
 * /availabilities/{id}:
 *   put:
 *     summary: Atualiza uma disponibilidade
 *     tags: [Disponibilidades Ricardo Nazário]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AvailabilityInput'
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Dados inválidos ou espaço não encontrado
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.put("/:id", (req, res) => {
  const availabilities = readAvailabilities();
  const index = availabilities.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Disponibilidade não encontrada" });
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  availabilities[index] = {
    id: availabilities[index].id,
    space_id: req.body.space_id,
    day_of_week: req.body.day_of_week,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    is_external_allowed: req.body.is_external_allowed,
  };
  saveAvailabilities(availabilities);
  return res.status(200).json(availabilities[index]);
});

/**
 * @swagger
 * /availabilities/{id}:
 *   delete:
 *     summary: Remove uma disponibilidade
 *     tags: [Disponibilidades Ricardo Nazário]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Disponibilidade removida
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.delete("/:id", (req, res) => {
  const availabilities = readAvailabilities();
  const index = availabilities.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Disponibilidade não encontrada" });
  availabilities.splice(index, 1);
  saveAvailabilities(availabilities);
  return res.status(200).json({ message: "Disponibilidade removida com sucesso" });
});

module.exports = router;
