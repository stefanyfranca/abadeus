const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'db', 'empresas.json');

const ler = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const salvar = (dados) => fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
const normalizar = (t) =>
  String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const soDigitos = (t) => String(t).replace(/\D/g, '');
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         corporate_name: { type: string, example: Tech Solutions Ltda }
 *         trade_name: { type: string, example: TechSol }
 *         cnpj: { type: string, example: "12.345.678/0001-90" }
 *         phone: { type: string, example: "(48) 99999-0000" }
 *         created_at: { type: string, format: date-time }
 *     EmpresaInput:
 *       type: object
 *       required: [corporate_name, trade_name, cnpj]
 *       properties:
 *         corporate_name: { type: string, example: Tech Solutions Ltda }
 *         trade_name: { type: string, example: TechSol }
 *         cnpj: { type: string, example: "12.345.678/0001-90" }
 *         phone: { type: string, example: "(48) 99999-0000" }
 */

// ---------- GET /empresas ----------
/**
 * @swagger
 * /empresas:
 *   get:
 *     summary: Retorna uma lista de todas as empresas
 *     tags: [Empresas]
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Empresa' }
 */
router.get('/', (req, res) => {
  res.json(ler());
});

// ---------- GET /empresas/nome/:nome ----------
/**
 * @swagger
 * /empresas/nome/{nome}:
 *   get:
 *     summary: Retorna empresas cujo nome fantasia contém o termo pesquisado
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema: { type: string }
 *         example: tech
 *     responses:
 *       200:
 *         description: Empresas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Empresa' }
 *       404:
 *         description: Nenhuma empresa encontrada
 */
router.get('/nome/:nome', (req, res) => {
  const termo = normalizar(req.params.nome);
  const resultado = ler().filter((e) => normalizar(e.trade_name).includes(termo));

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhuma empresa encontrada com esse nome fantasia' });
  }
  res.json(resultado);
});

// ---------- GET /empresas/cnpj/:cnpj ----------
/**
 * @swagger
 * /empresas/cnpj/{cnpj}:
 *   get:
 *     summary: Retorna uma empresa pelo CNPJ
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: cnpj
 *         required: true
 *         description: CNPJ com ou sem pontuação
 *         schema: { type: string }
 *         example: "12345678000190"
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Empresa' }
 *       404:
 *         description: Empresa não encontrada
 */
router.get('/cnpj/:cnpj', (req, res) => {
  const alvo = soDigitos(req.params.cnpj);
  const empresa = ler().find((e) => soDigitos(e.cnpj) === alvo);

  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
  res.json(empresa);
});

// ---------- GET /empresas/data (intervalo) ----------
/**
 * @swagger
 * /empresas/data:
 *   get:
 *     summary: Retorna empresas cadastradas dentro de um intervalo de datas
 *     tags: [Empresas]
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
 *         description: Empresas no intervalo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Empresa' }
 *       400:
 *         description: Formato de data inválido ou nenhum parâmetro informado
 *       404:
 *         description: Nenhuma empresa encontrada
 */
router.get('/data', (req, res) => {
  const { inicio, fim } = req.query;

  if (!inicio && !fim) {
    return res.status(400).json({ erro: 'Informe ao menos "inicio" ou "fim" (YYYY-MM-DD)' });
  }
  if ((inicio && !DATA_REGEX.test(inicio)) || (fim && !DATA_REGEX.test(fim))) {
    return res.status(400).json({ erro: 'Use o formato YYYY-MM-DD' });
  }

  const resultado = ler().filter((e) => {
    const dia = e.created_at.slice(0, 10);
    return (!inicio || dia >= inicio) && (!fim || dia <= fim);
  });

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhuma empresa encontrada nesse período' });
  }
  res.json(resultado);
});

// ---------- GET /empresas/data/:data ----------
/**
 * @swagger
 * /empresas/data/{data}:
 *   get:
 *     summary: Retorna empresas cadastradas em uma data específica
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-10-01"
 *     responses:
 *       200:
 *         description: Empresas cadastradas na data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Empresa' }
 *       400:
 *         description: Formato de data inválido
 *       404:
 *         description: Nenhuma empresa encontrada
 */
router.get('/data/:data', (req, res) => {
  const { data } = req.params;

  if (!DATA_REGEX.test(data)) {
    return res.status(400).json({ erro: 'Use o formato YYYY-MM-DD' });
  }

  const resultado = ler().filter((e) => e.created_at.slice(0, 10) === data);

  if (resultado.length === 0) {
    return res.status(404).json({ erro: 'Nenhuma empresa cadastrada nessa data' });
  }
  res.json(resultado);
});

// ---------- GET /empresas/:id (SEMPRE depois das rotas com prefixo) ----------
/**
 * @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Retorna uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Empresa' }
 *       404:
 *         description: Empresa não encontrada
 */
router.get('/:id', (req, res) => {
  const empresa = ler().find((e) => e.id === Number(req.params.id));
  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
  res.json(empresa);
});

// ---------- POST /empresas ----------
/**
 * @swagger
 * /empresas:
 *   post:
 *     summary: Cria uma nova empresa
 *     tags: [Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmpresaInput' }
 *     responses:
 *       201:
 *         description: Empresa criada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Empresa' }
 *       400:
 *         description: Campos obrigatórios ausentes
 *       409:
 *         description: CNPJ já cadastrado
 */
router.post('/', (req, res) => {
  const { corporate_name, trade_name, cnpj, phone } = req.body;

  if (!corporate_name || !trade_name || !cnpj) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: corporate_name, trade_name, cnpj',
    });
  }

  const empresas = ler();
  if (empresas.some((e) => soDigitos(e.cnpj) === soDigitos(cnpj))) {
    return res.status(409).json({ erro: 'CNPJ já cadastrado' });
  }

  const nova = {
    id: empresas.length ? Math.max(...empresas.map((e) => e.id)) + 1 : 1,
    corporate_name,
    trade_name,
    cnpj,
    phone: phone ?? null,
    created_at: new Date().toISOString(),
  };

  empresas.push(nova);
  salvar(empresas);
  res.status(201).json(nova);
});

// ---------- PUT /empresas/:id ----------
/**
 * @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmpresaInput' }
 *     responses:
 *       200:
 *         description: Empresa atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Empresa' }
 *       404:
 *         description: Empresa não encontrada
 *       409:
 *         description: CNPJ já em uso por outra empresa
 */
router.put('/:id', (req, res) => {
  const empresas = ler();
  const indice = empresas.findIndex((e) => e.id === Number(req.params.id));
  if (indice === -1) return res.status(404).json({ erro: 'Empresa não encontrada' });

  const { corporate_name, trade_name, cnpj, phone } = req.body;

  if (
    cnpj &&
    empresas.some((e, i) => i !== indice && soDigitos(e.cnpj) === soDigitos(cnpj))
  ) {
    return res.status(409).json({ erro: 'CNPJ já em uso por outra empresa' });
  }

  const atual = empresas[indice];
  empresas[indice] = {
    ...atual, // id e created_at nunca mudam
    corporate_name: corporate_name ?? atual.corporate_name,
    trade_name: trade_name ?? atual.trade_name,
    cnpj: cnpj ?? atual.cnpj,
    phone: phone !== undefined ? phone : atual.phone,
  };

  salvar(empresas);
  res.json(empresas[indice]);
});

// ---------- DELETE /empresas/:id ----------
/**
 * @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Remove uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Empresa removida
 *       404:
 *         description: Empresa não encontrada
 */
router.delete('/:id', (req, res) => {
  const empresas = ler();
  const indice = empresas.findIndex((e) => e.id === Number(req.params.id));
  if (indice === -1) return res.status(404).json({ erro: 'Empresa não encontrada' });

  const [removida] = empresas.splice(indice, 1);
  salvar(empresas);
  res.json({ mensagem: 'Empresa removida com sucesso', empresa: removida });
});

module.exports = router;