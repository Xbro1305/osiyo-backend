const { Schema, model } = require("mongoose");

const PrintSchema = new Schema(
  {
    passNo: { type: String, required: true },
    date: { type: String, required: true },
    designArt: { type: String, required: true },
    design: {
      article: { type: String },
      imageUrl: { type: String },
    },
    order: {
      name: { type: String, required: true },
      cloth: { type: String, required: true },
      length: { type: Number, required: true },
      printed: { type: Number, required: true },
      stretch: { type: Number, required: true },
      status: { type: Boolean, required: true },
    },

    user: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      shift: { type: String, required: true },
    },

    gazapalIds: [{ type: String, required: true }],
    gazapals: [
      {
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
    ],
  },
  { timestamps: true }
);

const printDB = model("print", PrintSchema);
module.exports = printDB;
