const mongoose = require("mongoose");
const jsonOptions = require("./jsonOptions");

const reservaSchema = new mongoose.Schema(
  {
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: "Espaco", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    rejection_reason: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON: jsonOptions() }
);

module.exports = mongoose.model("reserva", reservaSchema);