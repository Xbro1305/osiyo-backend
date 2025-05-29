const { Router } = require("express");
const productDB = require("../models/Products");
const { ValidateAdmin } = require("../middleware/admin");
const prt = Router();

prt.post("/create", [ValidateAdmin.check], async (req, res) => {
  try {
    const data = req.body;

    const lastProduct = await productDB.findOne().sort({ article: -1 });

    const newArticle =
      lastProduct && lastProduct.article ? lastProduct.article + 1 : 1;

    const created = await productDB.create({ ...data, article: newArticle });
    const saved = await created.save();

    res.status(200).json({
      msg: "Product created successfully",
      variant: "success",
      saved,
    });
  } catch (err) {
    res.status(400).json({
      msg: "Something went wrong",
      variant: "error",
      err,
    });
  }
});
prt.get("/", async (req, res) => {
  try {
    const filter = { ...req.query };

    const data = await productDB.find(filter);

    if (data.length > 0) {
      res.status(200).json({
        msg: "Products found successfully",
        variant: "success",
        innerData: data,
      });
    } else {
      res.status(404).json({
        msg: "No products found",
        variant: "warning",
        innerData: [],
      });
    }
  } catch (err) {
    res.status(400).json({
      msg: "Something went wrong",
      variant: "error",
      err,
    });
  }
});

prt.patch("/update/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const incoming = req.body;
    const updated = await productDB.findByIdAndUpdate(id, incoming);
    res.status(200).json({
      msg: "Product updated successfully",
      variant: "success",
      updated,
    });
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

prt.delete("/delete/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await productDB.findByIdAndDelete(id);
    res.status(200).json({
      msg: "Product deleted successfully",
      variant: "success",
      deleted,
    });
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

module.exports = prt;
