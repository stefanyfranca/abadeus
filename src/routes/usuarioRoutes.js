const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'db', 'usuarios.json');
const ROLES = ['ADMIN', 'CLIENT', 'RECEPTION'];

const ler = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const salvar = (dados) => fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
const semSenha = ({ password_hash, ...resto }) => resto; // nunca devolver o hash
const normalizar = (t) =>
  String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         name: { type: string, example: Maria Silva }
 *         email: { type: string, example: maria@email.com }
 *         role: { type: string, enum: [ADMIN, CLIENT, RECEPTION] }
 *         cpf_cnpj: { type: string, example: "123.456.789-00" }
 *         company_id: { type: integer, nullable: true, example: 1 }
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
 *         company_id: { type: integer, nullable: true, example: 1 }
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
router.get('/', (req, res) => {
  res.json(ler().map(semSenha));
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
router.get('/nome/:nome', (req, res) => {
  const termo = normalizar(req.params.nome);
  const resultado = ler().filter((u) => normalizar(u.name).includes(termo));

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhum usuário encontrado com esse nome' });
  }
  res.json(resultado.map(semSenha));
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
router.get('/data', (req, res) => {
  const { inicio, fim } = req.query;

  if (!inicio && !fim) {
    return res.status(400).json({ erro: 'Informe ao menos "inicio" ou "fim" (YYYY-MM-DD)' });
  }
  if ((inicio && !DATA_REGEX.test(inicio)) || (fim && !DATA_REGEX.test(fim))) {
    return res.status(400).json({ erro: 'Use o formato YYYY-MM-DD' });
  }

  const resultado = ler().filter((u) => {
    const dia = u.created_at.slice(0, 10);
    return (!inicio || dia >= inicio) && (!fim || dia <= fim);
  });

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhum usuário encontrado nesse período' });
  }
  res.json(resultado.map(semSenha));
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
router.get('/data/:data', (req, res) => {
  const { data } = req.params;

  if (!DATA_REGEX.test(data)) {
    return res.status(400).json({ erro: 'Use o formato YYYY-MM-DD' });
  }

  const resultado = ler().filter((u) => u.created_at.slice(0, 10) === data);

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhum usuário cadastrado nessa data' });
  }
  res.json(resultado.map(semSenha));
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
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', (req, res) => {
  const usuario = ler().find((u) => u.id === Number(req.params.id));
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(semSenha(usuario));
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
router.post('/', (req, res) => {
  const { name, email, password_hash, role, cpf_cnpj, company_id } = req.body;

  if (!name || !email || !password_hash || !role || !cpf_cnpj) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: name, email, password_hash, role, cpf_cnpj',
    });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ erro: `role deve ser: ${ROLES.join(', ')}` });
  }

  const usuarios = ler();
  if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const novo = {
    id: usuarios.length ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1,
    name,
    email,
    password_hash,
    role,
    cpf_cnpj,
    company_id: company_id ?? null,
    created_at: new Date().toISOString(),
  };

  usuarios.push(novo);
  salvar(usuarios);
  res.status(201).json(semSenha(novo));
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
 *         schema: { type: integer }
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
router.put('/:id', (req, res) => {
  const usuarios = ler();
  const indice = usuarios.findIndex((u) => u.id === Number(req.params.id));
  if (indice === -1) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const { name, email, password_hash, role, cpf_cnpj, company_id } = req.body;

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ erro: `role deve ser: ${ROLES.join(', ')}` });
  }
  if (
    email &&
    usuarios.some(
      (u, i) => i !== indice && u.email.toLowerCase() === email.toLowerCase()
    )
  ) {
    return res.status(409).json({ erro: 'E-mail já em uso por outro usuário' });
  }

  const atual = usuarios[indice];
  usuarios[indice] = {
    ...atual, // id e created_at nunca mudam
    name: name ?? atual.name,
    email: email ?? atual.email,
    password_hash: password_hash ?? atual.password_hash,
    role: role ?? atual.role,
    cpf_cnpj: cpf_cnpj ?? atual.cpf_cnpj,
    company_id: company_id !== undefined ? company_id : atual.company_id,
  };

  salvar(usuarios);
  res.json(semSenha(usuarios[indice]));
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
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuário removido
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:id', (req, res) => {
  const usuarios = ler();
  const indice = usuarios.findIndex((u) => u.id === Number(req.params.id));
  if (indice === -1) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const [removido] = usuarios.splice(indice, 1);
  salvar(usuarios);
  res.json({ mensagem: 'Usuário removido com sucesso', usuario: semSenha(removido) });
});

module.exports = router;