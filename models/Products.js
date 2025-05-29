const { model, Schema } = require("mongoose");

const schema = new Schema({
  name: { type: String },
  img: { type: Array, of: String },
  type: { type: Number },
  size: { type: String },
  width: { type: String },
  categoryId: { type: Number, required: true },
  article: { type: Number },
  weight: { type: Number },
  duvetCoverSize: { type: String },
  pillowcases: { type: String },
  bedsheetSize: { type: String },
  pillowcaseSize: { type: String },
  madein: { type: Object },
});

const productDB = model("Products", schema);
module.exports = productDB;
