const { Schema, model } = require("mongoose");

const ProductSchema = new Schema({
  name: { type: String },
  img: { type: [String] },
  type: { type: Number },
  size: { type: String },
  width: { type: String },
  categoryId: { type: String, required: true },
  article: { type: Number },
  weight: { type: Number },
  duvetCoverSize: { type: String },
  pillowcases: { type: String },
  bedsheetSize: { type: String },
  pillowcaseSize: { type: String },
  cloth: { type: String },
});

// Кастомный валидатор
ProductSchema.pre("validate", function (next) {
  const doc = this;

  if (doc.type === 0) {
    if (doc.weight == null || doc.width == null) {
      return next(new Error("Для type = 0 обязательны поля: weight и width"));
    }
  }

  if (doc.type === 1) {
    const requiredFields = [
      "pillowcaseSize",
      "pillowcases",
      "size",
      "name",
      "bedsheetSize",
      "duvetCoverSize",
    ];

    for (let field of requiredFields) {
      if (doc[field] == null) {
        return next(new Error(`Для type = 1 обязательное поле: ${field}`));
      }
    }
  }

  next();
});

const productDB = model("Products", ProductSchema);
module.exports = productDB;
