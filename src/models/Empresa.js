const mongoose = require("mongoose");
const jsonOptions = require("./jsonOptions");

const empresaSchema = new mongoose.Schema(
  {
    corporate_name: { type: String, required: true, trim: true },
    trade_name: { type: String, required: true, trim: true },
    cnpj: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON: jsonOptions() }
);

module.exports = mongoose.model("empresa", empresaSchema);