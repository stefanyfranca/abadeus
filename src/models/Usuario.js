const mongoose = require("mongoose");
const jsonOptions = require("./jsonOptions");

const usuarioSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "CLIENT", "RECEPTION"], required: true },
    cpf_cnpj: { type: String, required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Empresa", default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: jsonOptions(["password_hash"]), // o hash nunca sai na resposta
  }
);

module.exports = mongoose.model("usuario", usuarioSchema);