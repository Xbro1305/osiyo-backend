const { Schema, model } = require("mongoose");

const ClothesSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

const clothesDB = model("clothes", ClothesSchema);
module.exports = clothesDB;
