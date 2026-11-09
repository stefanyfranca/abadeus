const express = require("express");
const Empresa = require("../models/Empresa");
const { idValido, tratarErro } = require("../utils/http");

const router = express.Router();

const normalizar = (t) =>
  String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const soDigitos = (t) => String(t).replace(/\D/g, "");
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (d) => DATA_REGEX.test(d) && !Number.isNaN(Date.parse(d));
const erro = (res, err) => tratarErro(res, err, "erro");

// Monta o filtro de created_at (datas em UTC, igual ao slice(0, 10) da versão com JSON)
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
 *     Empresa:
 *       type: object
 *       properties:
 *         id: { type: string, example: "65f1c2a4e1b2c3d4e5f60718" }
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
 *     tags: [Empresas-Liliane Antunes]
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Empresa' }
 */
router.get("/", async (req, res) => {
  try {
    res.json(await Empresa.find());
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /empresas/nome/:nome ----------
/**
 * @swagger
 * /empresas/nome/{nome}:
 *   get:
 *     summary: Retorna empresas cujo nome fantasia contém o termo pesquisado
 *     tags: [Empresas-Liliane Antunes]
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
router.get("/nome/:nome", async (req, res) => {
  try {
    const termo = normalizar(req.params.nome);
    // Filtro em JS para manter a busca sem diferenciar acentos
    const resultado = (await Empresa.find()).filter((e) => normalizar(e.trade_name).includes(termo));

    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhuma empresa encontrada com esse nome fantasia" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /empresas/cnpj/:cnpj ----------
/**
 * @swagger
 * /empresas/cnpj/{cnpj}:
 *   get:
 *     summary: Retorna uma empresa pelo CNPJ
 *     tags: [Empresas-Liliane Antunes]
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
router.get("/cnpj/:cnpj", async (req, res) => {
  try {
    const alvo = soDigitos(req.params.cnpj);
    const empresa = (await Empresa.find()).find((e) => soDigitos(e.cnpj) === alvo);

    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
    res.json(empresa);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /empresas/data (intervalo) ----------
/**
 * @swagger
 * /empresas/data:
 *   get:
 *     summary: Retorna empresas cadastradas dentro de um intervalo de datas
 *     tags: [Empresas-Liliane Antunes]
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
router.get("/data", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio && !fim) {
      return res.status(400).json({ erro: 'Informe ao menos "inicio" ou "fim" (YYYY-MM-DD)' });
    }
    if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) {
      return res.status(400).json({ erro: "Use o formato YYYY-MM-DD" });
    }

    const resultado = await Empresa.find(filtroPorIntervalo(inicio, fim));
    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhuma empresa encontrada nesse período" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /empresas/data/:data ----------
/**
 * @swagger
 * /empresas/data/{data}:
 *   get:
 *     summary: Retorna empresas cadastradas em uma data específica
 *     tags: [Empresas-Liliane Antunes]
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
router.get("/data/:data", async (req, res) => {
  try {
    const { data } = req.params;

    if (!dataValida(data)) {
      return res.status(400).json({ erro: "Use o formato YYYY-MM-DD" });
    }

    const resultado = await Empresa.find(filtroPorIntervalo(data, data));
    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Nenhuma empresa cadastrada nessa data" });
    }
    res.json(resultado);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- GET /empresas/:id (SEMPRE depois das rotas com prefixo) ----------
/**
 * @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Retorna uma empresa pelo ID
 *     tags: [Empresas-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Empresa' }
 *       404:
 *         description: Empresa não encontrada
 */
router.get("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Empresa não encontrada" });
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
    res.json(empresa);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- POST /empresas ----------
/**
 * @swagger
 * /empresas:
 *   post:
 *     summary: Cria uma nova empresa
 *     tags: [Empresas-Liliane Antunes]
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
router.post("/", async (req, res) => {
  try {
    const { corporate_name, trade_name, cnpj, phone } = req.body;

    if (!corporate_name || !trade_name || !cnpj) {
      return res.status(400).json({ erro: "Campos obrigatórios: corporate_name, trade_name, cnpj" });
    }

    const existentes = await Empresa.find();
    if (existentes.some((e) => soDigitos(e.cnpj) === soDigitos(cnpj))) {
      return res.status(409).json({ erro: "CNPJ já cadastrado" });
    }

    const nova = await Empresa.create({ corporate_name, trade_name, cnpj, phone: phone ?? null });
    res.status(201).json(nova);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- PUT /empresas/:id ----------
/**
 * @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa pelo ID
 *     tags: [Empresas-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
router.put("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Empresa não encontrada" });
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

    const { corporate_name, trade_name, cnpj, phone } = req.body;

    if (cnpj) {
      const outras = await Empresa.find({ _id: { $ne: empresa._id } });
      if (outras.some((e) => soDigitos(e.cnpj) === soDigitos(cnpj))) {
        return res.status(409).json({ erro: "CNPJ já em uso por outra empresa" });
      }
    }

    empresa.set({
      corporate_name: corporate_name ?? empresa.corporate_name,
      trade_name: trade_name ?? empresa.trade_name,
      cnpj: cnpj ?? empresa.cnpj,
      phone: phone !== undefined ? phone : empresa.phone,
    });
    await empresa.save();
    res.json(empresa);
  } catch (err) {
    erro(res, err);
  }
});

// ---------- DELETE /empresas/:id ----------
/**
 * @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Remove uma empresa pelo ID
 *     tags: [Empresas-Liliane Antunes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Empresa removida
 *       404:
 *         description: Empresa não encontrada
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ erro: "Empresa não encontrada" });
    const removida = await Empresa.findByIdAndDelete(req.params.id);
    if (!removida) return res.status(404).json({ erro: "Empresa não encontrada" });
    res.json({ mensagem: "Empresa removida com sucesso", empresa: removida });
  } catch (err) {
    erro(res, err);
  }
});

module.exports = router;