const express = require("express");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const spacesRoutes = require("./routes/spacesRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const empresasRoutes = require("./routes/empresasRoutes");
const disponibilidadesRoutes = require("./routes/disponibilidadesRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ABADEUS - Sistema de Gestão de Espaços de Coworking",
      version: "1.0.0",
      description: "API para gestão de espaços de coworking e laboratórios multidisciplinares. Disciplina: DAII 2026.02.",
      license: {
        name: "",
      },
      contact: {
        name: "Equipe SGEC - ABADEUS",
      },
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [
      { name: "Espaços - Stefany França", description: "Spaces" },
      { name: "Reservas - Emanoel Clezar", description: "Bookings" },
      { name: "Disponibilidades", description: "Disponibilidade semanal dos espaços" },
    ],
  },
  apis: ["./src/routes/*.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/spaces", spacesRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/empresas", empresasRoutes);

app.get("/", (req, res) => {
  res.send("API SGEC rodando! Acesse /api-docs para ver a documentação.");
});
app.use("/disponibilidades", disponibilidadesRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação Swagger em http://localhost:${PORT}/api-docs`);
});