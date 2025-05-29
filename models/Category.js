const { model, Schema } = require("mongoose");

const categorySchema = new Schema({
  name: { type: String, required: true },
  preview: { type: String, required: true },
  applies_to: {
    type: Number,
    enum: [0, 1],
    required: true,
    validate: {
      validator: (v) => [0, 1].includes(v),
      message: (props) =>
        `${props.value} не является допустимым значением типа товара`,
    },
  },
  categoryId: { type: Number },
});

const categoryDB = model("Category", categorySchema);
module.exports = categoryDB;
