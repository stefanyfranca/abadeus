const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DB_PATH = path.join(__dirname, "..", "db", "espacos.json");
const TYPES = ["COWORKING", "LAB", "MEETING_ROOM"];

function readSpaces() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveSpaces(spaces) {
  fs.writeFileSync(DB_PATH, JSON.stringify(spaces, null, 2), "utf-8");
}

// Retorna mensagem de erro ou null se os dados forem válidos
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
 * tags:
 *   name: Espaços - Stefany França
 *   description: Gestão de espaços Abadeus 
 */

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
 *           type: integer
 *           description: ID do espaço (gerado automaticamente)
 *           example: 1
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
 *     tags: [Spaces]
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
router.get("/", (req, res) => {
  const { name, type, is_active } = req.query;
  let spaces = readSpaces();

  if (name) {
    spaces = spaces.filter((s) =>
      s.name.toLowerCase().includes(String(name).toLowerCase())
    );
  }
  if (type) {
    spaces = spaces.filter((s) => s.type === String(type).toUpperCase());
  }
  if (is_active !== undefined) {
    spaces = spaces.filter((s) => String(s.is_active) === String(is_active));
  }

  res.status(200).json(spaces);
});

/**
 * @swagger
 * /spaces/{id}:
 *   get:
 *     summary: Busca um espaço por ID
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do espaço
 *         example: 1
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
router.get("/:id", (req, res) => {
  const space = readSpaces().find((s) => s.id === Number(req.params.id));
  if (!space) {
    return res.status(404).json({ message: "Espaço não encontrado" });
  }
  res.status(200).json(space);
});

/**
 * @swagger
 * /spaces:
 *   post:
 *     summary: Cadastra um novo espaço
 *     tags: [Spaces]
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
router.post("/", (req, res) => {
  const error = validate(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const spaces = readSpaces();
  const nextId = spaces.length ? Math.max(...spaces.map((s) => s.id)) + 1 : 1;

  const newSpace = {
    id: nextId,
    name: req.body.name.trim(),
    type: req.body.type,
    capacity: req.body.capacity,
    description: req.body.description ?? "",
    is_active: req.body.is_active ?? true,
  };

  spaces.push(newSpace);
  saveSpaces(spaces);
  res.status(201).json(newSpace);
});

/**
 * @swagger
 * /spaces/{id}:
 *   put:
 *     summary: Atualiza um espaço existente
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do espaço
 *         example: 1
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
router.put("/:id", (req, res) => {
  const spaces = readSpaces();
  const index = spaces.findIndex((s) => s.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Espaço não encontrado" });
  }

  const error = validate(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  spaces[index] = {
    id: spaces[index].id,
    name: req.body.name.trim(),
    type: req.body.type,
    capacity: req.body.capacity,
    description: req.body.description ?? spaces[index].description,
    is_active: req.body.is_active ?? spaces[index].is_active,
  };

  saveSpaces(spaces);
  res.status(200).json(spaces[index]);
});

/**
 * @swagger
 * /spaces/{id}:
 *   delete:
 *     summary: Remove um espaço
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do espaço
 *         example: 1
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
router.delete("/:id", (req, res) => {
  const spaces = readSpaces();
  const index = spaces.findIndex((s) => s.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: "Espaço não encontrado" });
  }

  spaces.splice(index, 1);
  saveSpaces(spaces);
  res.status(200).json({ message: "Espaço removido com sucesso" });
});

module.exports = router;