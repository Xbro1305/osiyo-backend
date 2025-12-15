const { Schema, model } = require("mongoose");

const GazapalSchema = new Schema(
  {
    passNo: { type: String, required: true },
    date: { type: String, required: true },
    cloth: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    length: { type: Number, required: true },
    user: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      shift: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const gazapalDB = model("gazapal", GazapalSchema);
module.exports = gazapalDB;
