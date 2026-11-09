const express = require("express");
const Usuario = require("../models/usuario");
const { idValido, tratarErro } = require("../utils/http");

const router = express.Router();
const ROLES = ["ADMIN", "CLIENT", "RECEPTION"];

const normalizar = (t) =>
  String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (d) => DATA_REGEX.test(d) && !Number.isNaN(Date.parse(d));
const erro = (res, err) => tratarErro(res, err, "erro");

// O password_hash nunca sai nas respostas: o model remove no toJSON.

function filtroPorIntervalo(inicio, fim) {
  const filtro = {};
  if (inicio) filtro.$gte = new Date(`${inicio}T00:00:00.000Z`);
  if (fim) filtro.$lte = new Date(`${fim}T23:59:59.999Z`);
  return { created_at: filtro };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id: { type: string, example: "65f1c2a4e1b2c3d4e5f60718" }
 *         name: { type: string, example: Maria Silva }
 *         email: { type: string, example: maria@email.com }
 *         role: { type: string, enum: [ADMIN, CLIENT, RECEPTION] }
 *         cpf_cnpj: { type: string, example: "123.456.789-00" }
 *         company_id: { type: string, nullable: true, example: "65f1c2a4e1b2c3d4e5f60719" }
 *         created_at: { type: string, format: date-time }
 *     UsuarioInput:
 *       type: object
 *       required: [name, email, password_hash, role, cpf_cnpj]
 *       properties:
 *         name: { type: string, example: Maria Silva }
 *         email: { type: string, example: maria@email.com }
 *         password_hash: { type: string, example: "$2b$10$hash" }
 *         role: { type: string, enum: [ADMIN, CLIENT, RECEPTION] }
 *         cpf_cnpj: { type: string, example: "123.456.789-00" }
 *         company_id: { type: string, nullable: true, example: "65f1c2a4e1b2c3d4e5f60719" }
 */

// ---------- GET /usuarios ----------
/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Retorna uma lista de todos os usuários
 *     tags: [Usuários-Liliane Antunes]
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Usuario' }
 */
router.get("/", async (req, res) => {
  try {
    res.json(await Usuario.find());
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /usuarios/nome/:nome ----------
/**
 * @swagger
 * /usuarios/nome/{nome}:
 *   get:
 *     summary: Retorna usuários cujo nome contém o termo pesquisado
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema: { type: string }
 *         example: maria
 *     responses:
 *       200:
 *         description: Usuários encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Usuario' }
 *       404:
 *         description: Nenhum usuário encontrado
 */
router.get("/nome/:nome", async (req, res) => {
  try {
    const termo = normalizar(req.params.nome);
    const resultado = (await Usuario.find()).filter((u) => normalizar(u.name).includes(termo));

    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhum usuário encontrado com esse nome" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /usuarios/data (intervalo) ----------
/**
 * @swagger
 * /usuarios/data:
 *   get:
 *     summary: Retorna usuários cadastrados dentro de um intervalo de datas
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: query
 *         name: inicio
 *         schema: { type: string, format: date }
 *         example: "2026-10-01"
 *       - in: query
 *         name: fim
 *         schema: { type: string, format: date }
 *         example: "2026-10-31"
 *     responses:
 *       200:
 *         description: Usuários no intervalo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Usuario' }
 *       400:
 *         description: Formato de data inválido ou nenhum parâmetro informado
 *       404:
 *         description: Nenhum usuário encontrado
 */
router.get("/data", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio && !fim) {
      return res.status(400).json({ erro: 'Informe ao menos "inicio" ou "fim" (YYYY-MM-DD)' });
    }
    if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) {
      return res.status(400).json({ erro: "Use o formato YYYY-MM-DD" });
    }

    const resultado = await Usuario.find(filtroPorIntervalo(inicio, fim));
    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhum usuário encontrado nesse período" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /usuarios/data/:data ----------
/**
 * @swagger
 * /usuarios/data/{data}:
 *   get:
 *     summary: Retorna usuários cadastrados em uma data específica
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-10-04"
 *     responses:
 *       200:
 *         description: Usuários cadastrados na data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Usuario' }
 *       400:
 *         description: Formato de data inválido
 *       404:
 *         description: Nenhum usuário encontrado
 */
router.get("/data/:data", async (req, res) => {
  try {
    const { data } = req.params;

    if (!dataValida(data)) {
      return res.status(400).json({ erro: "Use o formato YYYY-MM-DD" });
    }

    const resultado = await Usuario.find(filtroPorIntervalo(data, data));
    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhum usuário cadastrado nessa data" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /usuarios/:id (SEMPRE depois das rotas com prefixo) ----------
/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Retorna um usuário pelo ID
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json(usuario);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- POST /usuarios ----------
/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuários-Liliane Antunes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UsuarioInput' }
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       400:
 *         description: Dados inválidos ou campos obrigatórios ausentes
 *       409:
 *         description: E-mail já cadastrado
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, password_hash, role, cpf_cnpj, company_id } = req.body;

    if (!name || !email || !password_hash || !role || !cpf_cnpj) {
      return res.status(400).json({
        erro: "Campos obrigatórios: name, email, password_hash, role, cpf_cnpj",
      });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ erro: `role deve ser: ${ROLES.join(", ")}` });
    }
    if (company_id != null && !idValido(company_id)) {
      return res.status(400).json({ erro: "company_id deve ser um ID válido" });
    }

    if (await Usuario.exists({ email: String(email).toLowerCase() })) {
      return res.status(409).json({ erro: "E-mail já cadastrado" });
    }

    const novo = await Usuario.create({
      name,
      email,
      password_hash,
      role,
      cpf_cnpj,
      company_id: company_id ?? null,
    });
    res.status(201).json(novo);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- PUT /usuarios/:id ----------
/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário pelo ID
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UsuarioInput' }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: E-mail já em uso por outro usuário
 */
router.put("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

    const { name, email, password_hash, role, cpf_cnpj, company_id } = req.body;

    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ erro: `role deve ser: ${ROLES.join(", ")}` });
    }
    if (company_id != null && !idValido(company_id)) {
      return res.status(400).json({ erro: "company_id deve ser um ID válido" });
    }
    if (email && (await Usuario.exists({ email: String(email).toLowerCase(), _id: { $ne: usuario._id } }))) {
      return res.status(409).json({ erro: "E-mail já em uso por outro usuário" });
    }

    usuario.set({
      name: name ?? usuario.name,
      email: email ?? usuario.email,
      password_hash: password_hash ?? usuario.password_hash,
      role: role ?? usuario.role,
      cpf_cnpj: cpf_cnpj ?? usuario.cpf_cnpj,
      company_id: company_id !== undefined ? company_id : usuario.company_id,
    });
    await usuario.save();
    res.json(usuario);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- DELETE /usuarios/:id ----------
/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário pelo ID
 *     tags: [Usuários-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário removido
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    const removido = await Usuario.findByIdAndDelete(req.params.id);
    if (!removido) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json({ mensagem: "Usuário removido com sucesso", usuario: removido });
  } catch (err) {
    erro(res, err);
  }
});

module.exports = router;