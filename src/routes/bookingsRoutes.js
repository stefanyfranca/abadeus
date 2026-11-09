const express = require("express");
const Reserva = require("../models/Reserva");
const Espaco = require("../models/Espaco");
const { idValido, tratarErro } = require("../utils/http");

const router = express.Router();
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

async function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "O corpo da requisição deve ser um objeto JSON";
  }

  const { space_id, user_id, start_datetime, end_datetime, status, rejection_reason } = body;
  if (!idValido(space_id)) {
    return "O campo 'space_id' deve ser um ID válido";
  }
  if (!idValido(user_id)) {
    return "O campo 'user_id' deve ser um ID válido";
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
  if (!(await Espaco.exists({ _id: space_id }))) {
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
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f60718"
 *         space_id:
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f60719"
 *         user_id:
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f6071a"
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
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f60719"
 *         user_id:
 *           type: string
 *           example: "65f1c2a4e1b2c3d4e5f6071a"
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
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
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
router.get("/", async (req, res) => {
  try {
    const { status, space_id, user_id, start_datetime_from, start_datetime_to } = req.query;
    const filtro = {};

    if (status && !STATUSES.includes(String(status).toUpperCase())) {
      return res.status(400).json({ message: `Status deve ser um destes valores: ${STATUSES.join(", ")}` });
    }
    if (status) filtro.status = String(status).toUpperCase();

    for (const [field, value] of [["space_id", space_id], ["user_id", user_id]]) {
      if (value !== undefined && !idValido(value)) {
        return res.status(400).json({ message: `O filtro '${field}' deve ser um ID válido` });
      }
      if (value !== undefined) filtro[field] = value;
    }

    const from = start_datetime_from === undefined ? undefined : Date.parse(start_datetime_from);
    const to = start_datetime_to === undefined ? undefined : Date.parse(start_datetime_to);
    if ((from !== undefined && Number.isNaN(from)) || (to !== undefined && Number.isNaN(to))) {
      return res.status(400).json({ message: "Os filtros de data devem ser datas e horas válidas" });
    }
    if (from !== undefined && to !== undefined && from > to) {
      return res.status(400).json({ message: "'start_datetime_from' deve ser anterior ou igual a 'start_datetime_to'" });
    }
    if (from !== undefined || to !== undefined) {
      filtro.start_datetime = {};
      if (from !== undefined) filtro.start_datetime.$gte = new Date(from);
      if (to !== undefined) filtro.start_datetime.$lte = new Date(to);
    }

    const bookings = await Reserva.find(filtro);
    res.status(200).json(bookings);
  } catch (err) {
    tratarErro(res, err);
  }
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
 *           type: string
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
router.get("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Reserva não encontrada" });
    const booking = await Reserva.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Reserva não encontrada" });
    res.status(200).json(booking);
  } catch (err) {
    tratarErro(res, err);
  }
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
router.post("/", async (req, res) => {
  try {
    const error = await validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const newBooking = await Reserva.create({
      space_id: req.body.space_id,
      user_id: req.body.user_id,
      start_datetime: new Date(req.body.start_datetime),
      end_datetime: new Date(req.body.end_datetime),
      status: req.body.status ?? "PENDING",
      rejection_reason: req.body.rejection_reason ?? "",
    });
    res.status(201).json(newBooking);
  } catch (err) {
    tratarErro(res, err);
  }
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
 *           type: string
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
router.put("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Reserva não encontrada" });
    const booking = await Reserva.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Reserva não encontrada" });

    const error = await validate(req.body);
    if (error) return res.status(400).json({ message: error });

    booking.set({
      space_id: req.body.space_id,
      user_id: req.body.user_id,
      start_datetime: new Date(req.body.start_datetime),
      end_datetime: new Date(req.body.end_datetime),
      status: req.body.status ?? booking.status,
      rejection_reason: req.body.rejection_reason ?? booking.rejection_reason,
    });
    await booking.save();
    res.status(200).json(booking);
  } catch (err) {
    tratarErro(res, err);
  }
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
 *           type: string
 *     responses:
 *       200:
 *         description: Reserva removida
 *       404:
 *         description: Reserva não encontrada
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Reserva não encontrada" });
    const removida = await Reserva.findByIdAndDelete(req.params.id);
    if (!removida) return res.status(404).json({ message: "Reserva não encontrada" });
    res.status(200).json({ message: "Reserva removida com sucesso" });
  } catch (err) {
    tratarErro(res, err);
  }
});

module.exports = router;