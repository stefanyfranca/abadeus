const mongoose = require("mongoose");
const jsonOptions = require("./jsonOptions");

const espacoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["COWORKING", "LAB", "MEETING_ROOM"], required: true },
    capacity: { type: Number, required: true, min: 1 },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
  },
  { toJSON: jsonOptions() }
);

module.exports = mongoose.model("espaco", espacoSchema);