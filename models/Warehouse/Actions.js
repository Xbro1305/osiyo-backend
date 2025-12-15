const { Schema, model } = require("mongoose");

const ActionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["out", "in", "return"],
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    fromId: {
      type: Number,
      required: true,
    },

    toId: {
      type: Number,
      required: true,
    },

    itemIds: [
      {
        article: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],

    note: {
      type: String,
      default: "",
    },

    id: {
      type: Number,
      required: true,
      unique: true,
    },

    edited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ActionsDB = model("Actions", ActionSchema);
module.exports = ActionsDB;
