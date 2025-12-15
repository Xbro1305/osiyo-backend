const { Schema, model } = require("mongoose");

const PaintingSchema = new Schema(
  {
    passNo: { type: String, required: true },
    date: { type: String, required: true },

    user: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      shift: { type: String, required: true },
    },

    gazapalId: { type: String, required: true },
    gazapal: {
      length: { type: String, required: false },
      date: { type: String, required: false },
      passNo: { type: String, required: false },
      cloth: {
        id: { type: String, required: false },
        name: { type: String, required: false },
      },
      id: { type: String, required: false },
      user: {
        id: { type: String, required: false },
        name: { type: String, required: false },
        role: { type: String, required: false },
        shift: { type: String, required: false },
      },
    },
  },
  { timestamps: true }
);

const paintingDB = model("hitening", PaintingSchema);
module.exports = paintingDB;
