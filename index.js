const express = require("express");
const cors = require("cors");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

const usuarioRoutes = require("./src/routes/usuarioRoutes");
const empresasRoutes = require("./src/routes/empresasRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SGEC - Sistema de Gestão de Espaços de Coworking",
      version: "1.0.0",
      description:
        "API para gestão de espaços de coworking e laboratórios multidisciplinares. Disciplina: DAII 2026.02.",
      license: {
        name: "Licenciado para DAII",
      },
      contact: {
        name: "Equipe SGEC - ABADEUS",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/`,
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsDoc(options);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));
app.use("/usuarios", usuarioRoutes);
app.use("/empresas", empresasRoutes);


app.get("/", (req, res) => {
  res.send("API SGEC rodando! Acesse /api-docs para ver a documentação.");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação Swagger em http://localhost:${PORT}/api-docs`);
});