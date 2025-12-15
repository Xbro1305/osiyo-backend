const { Schema, model } = require("mongoose");

const StockSchema = new Schema({
  stock: { type: Number, default: 0 },
  orgId: { type: Number, required: true },
  updated: { type: String, default: "" },
});

const Designschema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    image: { type: String, default: "" }, // можно хранить URL или base64
    article: { type: String, required: true },
    cloth: {
      type: String,
      enum: ["Poplin", "Satin", "Stripe-satin", "Ranforce", "Byaz"],
      required: true,
    },
    stock: { type: [StockSchema], default: [] },
  },
  { timestamps: true }
);

const DesignsDB = model("Designs", Designschema);
module.exports = DesignsDB;
