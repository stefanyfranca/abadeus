const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();
const dbPath = path.join(__dirname, "..", "db", "usuarios.json");

function loadUsuarios() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function saveUsuarios(usuarios) {
  fs.writeFileSync(dbPath, JSON.stringify(usuarios, null, 2), "utf-8");
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           description: Gerado automaticamente no cadastro do usuário
 *         name:
 *           type: string
 *           description: Nome do usuário
 *         email:
 *           type: string
 *           description: E-mail do usuário
 *         password_hash:
 *           type: string
 *           description: Hash da senha do usuário
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, RECEPTION]
 *           description: Perfil de acesso do usuário
 *         cpf_cnpj:
 *           type: string
 *           description: CPF ou CNPJ do usuário
 *         company_id:
 *           type: string
 *           nullable: true
 *           description: ID da empresa vinculada (quando aplicável)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do registro
 *       example:
 *         id: a1b2c3d4-0000-4000-8000-000000000001
 *         name: Maria Souza
 *         email: maria.souza@email.com
 *         password_hash: $2b$10$examplehash1
 *         role: CLIENT
 *         cpf_cnpj: "123.456.789-00"
 *         company_id: c1a2b3c4-0000-4000-8000-000000000001
 *         created_at: "2026-09-01T10:00:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: API de Controle de Usuários
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Retorna uma lista de todos os usuários
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: A lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 */
router.get("/", (req, res) => {
  const usuarios = loadUsuarios();
  res.json(usuarios);
});

/**
 * @swagger
 * /usuarios/nome/{name}:
 *   get:
 *     summary: Retorna usuários cujo nome contém o termo pesquisado
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nome (ou parte do nome) do usuário
 *     responses:
 *       200:
 *         description: Lista de usuários encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 */
router.get("/nome/:name", (req, res) => {
  const usuarios = loadUsuarios();
  const termo = req.params.name.toLowerCase();
  const encontrados = usuarios.filter((u) =>
    u.name.toLowerCase().includes(termo)
  );
  res.json(encontrados);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Retorna um usuário pelo ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Um usuário pelo ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/:id", (req, res) => {
  const usuarios = loadUsuarios();
  const usuario = usuarios.find((u) => u.id === req.params.id);
  if (!usuario) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }
  res.json(usuario);
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: O usuário foi criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 */
router.post("/", (req, res) => {
  const usuarios = loadUsuarios();
  const novoUsuario = {
  ...req.body,
  id: crypto.randomUUID(),
  created_at: new Date().toISOString(),
};
  usuarios.push(novoUsuario);
  saveUsuarios(usuarios);
  res.status(201).json(novoUsuario);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário pelo ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: O usuário foi atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 */
router.put("/:id", (req, res) => {
  const usuarios = loadUsuarios();
  const index = usuarios.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }
  usuarios[index] = { ...usuarios[index], ...req.body, id: usuarios[index].id };
  saveUsuarios(usuarios);
  res.json(usuarios[index]);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário pelo ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: O usuário foi removido com sucesso
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/:id", (req, res) => {
  const usuarios = loadUsuarios();
  const index = usuarios.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }
  const removido = usuarios.splice(index, 1);
  saveUsuarios(usuarios);
  res.json(removido[0]);
});

module.exports = router;