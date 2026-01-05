const { Schema, model } = require("mongoose");

const CalanderStretchingSchema = new Schema(
  {
    passNo: { type: String, required: true },
    date: { type: String, required: true },
    measured: { type: Number, required: true },
    stretched: { type: Number, required: true },
    status: { type: String, required: true },

    user: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      shift: { type: String, required: true },
    },

    printIds: [{ type: String, required: true }],
    prints: [
      {
        passNo: { type: String, required: true },
        orderName: { type: String, required: true },
        printed: { type: String, required: true },
        orderCloth: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const calanderStretchingDB = model(
  "calanderStretching",
  CalanderStretchingSchema
);
module.exports = calanderStretchingDB;
