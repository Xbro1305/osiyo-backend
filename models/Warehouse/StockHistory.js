const { Schema, model } = require("mongoose");

const StockHistorySchema = new Schema(
  {
    designId: { type: Number, required: true },
    oldQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    orgId: { type: Number, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = model("StockHistory", StockHistorySchema);
