const { Router } = require("express");
const clothesDB = require("../../models/Printing/Clothes.js");

const clothesRT = Router();

clothesRT.get("/", async (req, res) => {
  try {
    const clothes = await clothesDB.find();
    res.status(200).json({
      msg: "Clothes fetched successfully",
      variant: "success",
      clothes,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

clothesRT.post("/", async (req, res) => {
  try {
    const data = req.body;
    const created = await clothesDB.create(data);
    const saved = await created.save();
    res
      .status(200)
      .json({ msg: "Clothes created successfully", variant: "success", saved });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

clothesRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await clothesDB.findByIdAndDelete(id);
    res
      .status(200)
      .json({ msg: "Clothes deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = clothesRT;
