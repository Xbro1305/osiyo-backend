const { Router } = require("express");
const categoryDB = require("../models/Category");
const { ValidateAdmin } = require("../middleware/admin");
const categoryRT = Router();

categoryRT.post("/create", [ValidateAdmin.check], async (req, res) => {
  try {
    const data = req.body;

    const lastCategory = await categoryDB.findOne().sort({ categoryId: -1 });

    const newId =
      lastCategory && lastCategory.categoryId ? lastCategory.categoryId + 1 : 1;

    const created = await categoryDB.create({ ...data, categoryId: newId });
    const saved = await created.save();

    res.status(200).json({
      msg: "Category created successfully",
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

categoryRT.get("/", async (req, res) => {
  try {
    const { applies_to } = req.query;

    const filter = applies_to ? { applies_to } : {};

    const data = await categoryDB.find(filter);

    const { length } = req.body;
    const limitedData = length ? data.slice(0, Number(length)) : data;
    if (limitedData.length > 0) {
      res.status(200).json({
        msg: "Categories found successfully",
        variant: "success",
        innerData: limitedData,
      });
    } else {
      res.status(404).json({
        msg: "No Categories found",
        variant: "warning",
        innerData: [],
      });
    }
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

categoryRT.patch("/update/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const incoming = req.body;
    const updated = await categoryDB.findByIdAndUpdate(id, incoming);
    res.status(200).json({
      msg: "Category updated successfully",
      variant: "success",
      updated,
    });
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

categoryRT.delete("/delete/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await categoryDB.findByIdAndDelete(id);
    res.status(200).json({
      msg: "Category deleted successfully",
      variant: "success",
      deleted,
    });
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

module.exports = categoryRT;
