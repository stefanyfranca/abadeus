const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DB_PATH = path.join(__dirname, "..", "db", "reservas.json");
const SPACES_PATH = path.join(__dirname, "..", "db", "espacos.json");
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function readBookings() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveBookings(bookings) {
  fs.writeFileSync(DB_PATH, JSON.stringify(bookings, null, 2), "utf-8");
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "O corpo da requisição deve ser um objeto JSON";
  }

  const { space_id, user_id, start_datetime, end_datetime, status, rejection_reason } = body;
  if (!Number.isInteger(space_id) || space_id <= 0) {
    return "O campo 'space_id' deve ser um número inteiro maior que zero";
  }
  if (!Number.isInteger(user_id) || user_id <= 0) {
    return "O campo 'user_id' deve ser um número inteiro maior que zero";
  }
  if (typeof start_datetime !== "string" || Number.isNaN(Date.parse(start_datetime))) {
    return "O campo 'start_datetime' deve ser uma data e hora válida";
  }
  if (typeof end_datetime !== "string" || Number.isNaN(Date.parse(end_datetime))) {
    return "O campo 'end_datetime' deve ser uma data e hora válida";
  }
  if (Date.parse(end_datetime) <= Date.parse(start_datetime)) {
    return "O campo 'end_datetime' deve ser posterior a 'start_datetime'";
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return `O campo 'status' deve ser um destes valores: ${STATUSES.join(", ")}`;
  }
  if (rejection_reason !== undefined && typeof rejection_reason !== "string") {
    return "O campo 'rejection_reason' deve ser um texto";
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
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         space_id:
 *           type: integer
 *           example: 2
 *         user_id:
 *           type: integer
 *           example: 7
 *         start_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-11-10T13:00:00.000Z"
 *         end_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-11-10T14:00:00.000Z"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           example: PENDING
 *         rejection_reason:
 *           type: string
 *           example: "Espaço indisponível"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-10-02T12:00:00.000Z"
 *     BookingInput:
 *       type: object
 *       required: [space_id, user_id, start_datetime, end_datetime]
 *       properties:
 *         space_id:
 *           type: integer
 *           example: 2
 *         user_id:
 *           type: integer
 *           example: 7
 *         start_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-11-10T13:00:00.000Z"
 *         end_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-11-10T14:00:00.000Z"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           default: PENDING
 *         rejection_reason:
 *           type: string
 *           example: "Espaço indisponível"
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Lista reservas com filtros opcionais
 *     tags: [Reservas - Emanoel Clezar]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: start_datetime_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Inclui reservas cuja data de início seja igual ou posterior
 *       - in: query
 *         name: start_datetime_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Inclui reservas cuja data de início seja igual ou anterior
 *     responses:
 *       200:
 *         description: Reservas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Filtro inválido
 */
router.get("/", (req, res) => {
  const { status, space_id, user_id, start_datetime_from, start_datetime_to } = req.query;
  let bookings = readBookings();

  if (status && !STATUSES.includes(String(status).toUpperCase())) {
    return res.status(400).json({ message: `Status deve ser um destes valores: ${STATUSES.join(", ")}` });
  }
  if (status) {
    bookings = bookings.filter((booking) => booking.status === String(status).toUpperCase());
  }
  for (const [field, value] of [["space_id", space_id], ["user_id", user_id]]) {
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      return res.status(400).json({ message: `O filtro '${field}' deve ser um número inteiro maior que zero` });
    }
    if (value !== undefined) {
      bookings = bookings.filter((booking) => booking[field] === Number(value));
    }
  }

  const from = start_datetime_from === undefined ? undefined : Date.parse(start_datetime_from);
  const to = start_datetime_to === undefined ? undefined : Date.parse(start_datetime_to);
  if ((from !== undefined && Number.isNaN(from)) || (to !== undefined && Number.isNaN(to))) {
    return res.status(400).json({ message: "Os filtros de data devem ser datas e horas válidas" });
  }
  if (from !== undefined && to !== undefined && from > to) {
    return res.status(400).json({ message: "'start_datetime_from' deve ser anterior ou igual a 'start_datetime_to'" });
  }
  if (from !== undefined) {
    bookings = bookings.filter((booking) => Date.parse(booking.start_datetime) >= from);
  }
  if (to !== undefined) {
    bookings = bookings.filter((booking) => Date.parse(booking.start_datetime) <= to);
  }

  res.status(200).json(bookings);
});

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Busca uma reserva por ID
 *     tags: [Reservas - Emanoel Clezar]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reserva encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Reserva não encontrada
 */
router.get("/:id", (req, res) => {
  const booking = readBookings().find((item) => item.id === Number(req.params.id));
  if (!booking) {
    return res.status(404).json({ message: "Reserva não encontrada" });
  }
  res.status(200).json(booking);
});

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Cadastra uma reserva
 *     tags: [Reservas - Emanoel Clezar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       201:
 *         description: Reserva criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Dados inválidos
 */
router.post("/", (req, res) => {
  const error = validate(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const bookings = readBookings();
  const nextId = bookings.length ? Math.max(...bookings.map((booking) => booking.id)) + 1 : 1;
  const newBooking = {
    id: nextId,
    space_id: req.body.space_id,
    user_id: req.body.user_id,
    start_datetime: new Date(req.body.start_datetime).toISOString(),
    end_datetime: new Date(req.body.end_datetime).toISOString(),
    status: req.body.status ?? "PENDING",
    rejection_reason: req.body.rejection_reason ?? "",
    created_at: new Date().toISOString(),
  };

  bookings.push(newBooking);
  saveBookings(bookings);
  res.status(201).json(newBooking);
});

/**
 * @swagger
 * /bookings/{id}:
 *   put:
 *     summary: Atualiza uma reserva existente
 *     tags: [Reservas - Emanoel Clezar]
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
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       200:
 *         description: Reserva atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Reserva não encontrada
 */
router.put("/:id", (req, res) => {
  const bookings = readBookings();
  const index = bookings.findIndex((booking) => booking.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Reserva não encontrada" });
  }

  const error = validate(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  bookings[index] = {
    id: bookings[index].id,
    space_id: req.body.space_id,
    user_id: req.body.user_id,
    start_datetime: new Date(req.body.start_datetime).toISOString(),
    end_datetime: new Date(req.body.end_datetime).toISOString(),
    status: req.body.status ?? bookings[index].status,
    rejection_reason: req.body.rejection_reason ?? bookings[index].rejection_reason,
    created_at: bookings[index].created_at,
  };

  saveBookings(bookings);
  res.status(200).json(bookings[index]);
});

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Remove uma reserva
 *     tags: [Reservas - Emanoel Clezar]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reserva removida
 *       404:
 *         description: Reserva não encontrada
 */
router.delete("/:id", (req, res) => {
  const bookings = readBookings();
  const index = bookings.findIndex((booking) => booking.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Reserva não encontrada" });
  }

  bookings.splice(index, 1);
  saveBookings(bookings);
  res.status(200).json({ message: "Reserva removida com sucesso" });
});

module.exports = router;