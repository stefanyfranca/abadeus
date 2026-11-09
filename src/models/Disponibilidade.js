const mongoose = require("mongoose");
const jsonOptions = require("./jsonOptions");

const hora = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm

const disponibilidadeSchema = new mongoose.Schema(
  {
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: "Espaco", required: true },
    day_of_week: { type: Number, required: true, min: 0, max: 6 },
    start_time: { type: String, required: true, match: hora },
    end_time: { type: String, required: true, match: hora },
    is_external_allowed: { type: Boolean, required: true },
  },
  { toJSON: jsonOptions() }
);

module.exports = mongoose.model("disponibilidade", disponibilidadeSchema);