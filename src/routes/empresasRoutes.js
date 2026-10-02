const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();
const dbPath = path.join(__dirname, "..", "db", "empresas.json");

function loadEmpresas() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function saveEmpresas(empresas) {
  fs.writeFileSync(dbPath, JSON.stringify(empresas, null, 2), "utf-8");
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       required:
 *         - corporate_name
 *         - cnpj
 *       properties:
 *         id:
 *           type: string
 *           description: Gerado automaticamente no cadastro da empresa
 *         corporate_name:
 *           type: string
 *           description: Razão social da empresa
 *         trade_name:
 *           type: string
 *           description: Nome fantasia da empresa
 *         cnpj:
 *           type: string
 *           description: CNPJ da empresa
 *         phone:
 *           type: string
 *           description: Telefone de contato
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do registro
 *       example:
 *         id: c1a2b3c4-0000-4000-8000-000000000001
 *         corporate_name: Tech Solutions Ltda
 *         trade_name: TechSol
 *         cnpj: "12.345.678/0001-90"
 *         phone: "(48) 3333-4444"
 *         created_at: "2026-08-10T09:00:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   name: Empresas
 *   description: API de Controle de Empresas parceiras/solicitantes
 */

/**
 * @swagger
 * /empresas:
 *   get:
 *     summary: Retorna uma lista de todas as empresas
 *     tags: [Empresas]
 *     responses:
 *       200:
 *         description: A lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get("/", (req, res) => {
  const empresas = loadEmpresas();
  res.json(empresas);
});

/**
 * @swagger
 * /empresas/nome/{name}:
 *   get:
 *     summary: Retorna empresas cujo nome fantasia contém o termo pesquisado
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nome fantasia (ou parte do nome) da empresa
 *     responses:
 *       200:
 *         description: Lista de empresas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get("/nome/:name", (req, res) => {
  const empresas = loadEmpresas();
  const termo = req.params.name.toLowerCase();
  const encontradas = empresas.filter((e) =>
    e.trade_name.toLowerCase().includes(termo)
  );
  res.json(encontradas);
});

/**
 * @swagger
 * /empresas/cnpj/{cnpj}:
 *   get:
 *     summary: Retorna uma empresa pelo CNPJ
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: cnpj
 *         schema:
 *           type: string
 *         required: true
 *         description: CNPJ da empresa
 *     responses:
 *       200:
 *         description: A empresa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 */
router.get("/cnpj/:cnpj", (req, res) => {
  const empresas = loadEmpresas();
  const empresa = empresas.find((e) => e.cnpj === req.params.cnpj);
  if (!empresa) {
    return res.status(404).json({ message: "Empresa não encontrada" });
  }
  res.json(empresa);
});

/**
 * @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Retorna uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: A empresa pelo ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 */
router.get("/:id", (req, res) => {
  const empresas = loadEmpresas();
  const empresa = empresas.find((e) => e.id === req.params.id);
  if (!empresa) {
    return res.status(404).json({ message: "Empresa não encontrada" });
  }
  res.json(empresa);
});

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
 *           schema:
 *             $ref: '#/components/schemas/Empresa'
 *     responses:
 *       201:
 *         description: A empresa foi criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 */
router.post("/", (req, res) => {
  const empresas = loadEmpresas();
  const novaEmpresa = {
    ...req.body,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  empresas.push(novaEmpresa);
  saveEmpresas(empresas);
  res.status(201).json(novaEmpresa);

});

/**
 * @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Empresa'
 *     responses:
 *       200:
 *         description: A empresa foi atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 */
router.put("/:id", (req, res) => {
  const empresas = loadEmpresas();
  const index = empresas.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Empresa não encontrada" });
  }
  empresas[index] = { ...empresas[index], ...req.body, id: empresas[index].id };
  saveEmpresas(empresas);
  res.json(empresas[index]);
});

/**
 * @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Remove uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: A empresa foi removida com sucesso
 *       404:
 *         description: Empresa não encontrada
 */
router.delete("/:id", (req, res) => {
  const empresas = loadEmpresas();
  const index = empresas.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Empresa não encontrada" });
  }
  const removida = empresas.splice(index, 1);
  saveEmpresas(empresas);
  res.json(removida[0]);
});

module.exports = router;