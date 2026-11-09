const express = require("express");
const Espaco = require("../models/Espaco");
const { idValido, tratarErro } = require("../utils/http");

const router = express.Router();
const TYPES = ["COWORKING", "LAB", "MEETING_ROOM"];

const escapeRegex = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function validate(body) {
  const { name, type, capacity, description, is_active } = body;
  if (typeof name !== "string" || name.trim() === "") {
    return "O campo 'name' é obrigatório e deve ser um texto";
  }
  if (!TYPES.includes(type)) {
    return `O campo 'type' deve ser um destes valores: ${TYPES.join(", ")}`;
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return "O campo 'capacity' deve ser um número inteiro maior que zero";
  }
  if (description !== undefined && typeof description !== "string") {
    return "O campo 'description' deve ser um texto";
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    return "O campo 'is_active' deve ser true ou false";
  }
  return null;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Space:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         id:
 *           type: string
 *           description: ID do espaço (gerado automaticamente pelo MongoDB)
 *           example: "65f1c2a4e1b2c3d4e5f60718"
 *         name:
 *           type: string
 *           description: Nome do espaço
 *           example: Sala de Reunião 01
 *         type:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           description: Tipo do espaço
 *           example: MEETING_ROOM
 *         capacity:
 *           type: integer
 *           description: Capacidade máxima de pessoas
 *           example: 10
 *         description:
 *           type: string
 *           description: Descrição do espaço
 *           example: Sala com projetor e ar-condicionado
 *         is_active:
 *           type: boolean
 *           description: Indica se o espaço está ativo para reservas
 *           example: true
 *     SpaceInput:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         name:
 *           type: string
 *           example: Sala de Reunião 01
 *         type:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           example: MEETING_ROOM
 *         capacity:
 *           type: integer
 *           example: 10
 *         description:
 *           type: string
 *           example: Sala com projetor e ar-condicionado
 *         is_active:
 *           type: boolean
 *           example: true
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Espaço não encontrado
 */

/**
 * @swagger
 * /spaces:
 *   get:
 *     summary: Lista todos os espaços
 *     description: Retorna todos os espaços cadastrados. Aceita filtros opcionais por nome, tipo e status.
 *     tags: [Espaços - Stefany França]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Busca por nome (contém, sem diferenciar maiúsculas/minúsculas)
 *         example: reunião
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *         description: Filtra pelo tipo do espaço
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtra por espaços ativos ou inativos
 *     responses:
 *       200:
 *         description: Lista de espaços retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Space'
 */
router.get("/", async (req, res) => {
  try {
    const { name, type, is_active } = req.query;
    const filtro = {};

    if (name) filtro.name = { $regex: escapeRegex(name), $options: "i" };
    if (type) filtro.type = String(type).toUpperCase();
    if (is_active !== undefined) {
      if (!["true", "false"].includes(String(is_active))) return res.status(200).json([]);
      filtro.is_active = String(is_active) === "true";
    }

    const spaces = await Espaco.find(filtro);
    res.status(200).json(spaces);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   get:
 *     summary: Busca um espaço por ID
 *     tags: [Espaços - Stefany França]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do espaço
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     responses:
 *       200:
 *         description: Espaço encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       404:
 *         description: Espaço não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Espaço não encontrado" });
    const space = await Espaco.findById(req.params.id);
    if (!space) return res.status(404).json({ message: "Espaço não encontrado" });
    res.status(200).json(space);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /spaces:
 *   post:
 *     summary: Cadastra um novo espaço
 *     tags: [Espaços - Stefany França]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpaceInput'
 *     responses:
 *       201:
 *         description: Espaço criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       400:
 *         description: Dados inválidos ou campos obrigatórios ausentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const newSpace = await Espaco.create({
      name: req.body.name.trim(),
      type: req.body.type,
      capacity: req.body.capacity,
      description: req.body.description ?? "",
      is_active: req.body.is_active ?? true,
    });
    res.status(201).json(newSpace);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   put:
 *     summary: Atualiza um espaço existente
 *     tags: [Espaços - Stefany França]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do espaço
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpaceInput'
 *     responses:
 *       200:
 *         description: Espaço atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Espaço não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Espaço não encontrado" });
    const space = await Espaco.findById(req.params.id);
    if (!space) return res.status(404).json({ message: "Espaço não encontrado" });

    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });

    space.set({
      name: req.body.name.trim(),
      type: req.body.type,
      capacity: req.body.capacity,
      description: req.body.description ?? space.description,
      is_active: req.body.is_active ?? space.is_active,
    });
    await space.save();
    res.status(200).json(space);
  } catch (err) {
    tratarErro(res, err);
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   delete:
 *     summary: Remove um espaço
 *     tags: [Espaços - Stefany França]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do espaço
 *         example: "65f1c2a4e1b2c3d4e5f60718"
 *     responses:
 *       200:
 *         description: Espaço removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Espaço removido com sucesso
 *       404:
 *         description: Espaço não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Espaço não encontrado" });
    const removido = await Espaco.findByIdAndDelete(req.params.id);
    if (!removido) return res.status(404).json({ message: "Espaço não encontrado" });
    res.status(200).json({ message: "Espaço removido com sucesso" });
  } catch (err) {
    tratarErro(res, err);
  }
});

module.exports = router;