const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const spacesRoutes = require("./routes/spacesRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const disponibilidadesRoutes = require("./routes/disponibilidadesRoutes");

const app = express();
const PORT = 3000;

app.use(express.json());

const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gestão de Espaços",
      version: "1.0.0",
      description: "API REST para gestão de espaços, reservas e usuários",
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
app.use("/disponibilidades", disponibilidadesRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação em http://localhost:${PORT}/api-docs`);
});