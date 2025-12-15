const { Router } = require("express");
const PaintingDB = require("../../models/Printing/Painting.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");

const paintingRT = Router();

paintingRT.get("/", async (req, res) => {
  try {
    const painting = await PaintingDB.find();
    res.status(200).json({
      msg: "Paintings fetched successfully",
      variant: "success",
      painting,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

paintingRT.post("/", [ValidateAdmin.check], async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err)
        return res.status(400).json({
          msg: "Token xato. Tizimga qayta kiring",
          variant: "warning",
          err,
        });

      const user = await Users.findOne({ username: decoded.user.username });
      if (!user)
        return res
          .status(400)
          .json({ msg: "Foydalanuvchi topilmadi", variant: "error" });

      if (user.password !== decoded.user.password)
        return res.status(400).json({
          msg: "Qayta tizimga kiring",
          variant: "warning",
        });

      if (!["painter", "admin", "superadmin"].includes(user.role))
        return res.status(400).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });

      const data = req.body;
      const gazapal = await gazapalDB.findById(req.body.gazapalId);
      data.gazapal = gazapal;

      console.log(data);

      const created = await PaintingDB.create({ ...data, gazapal });
      const saved = await created.save();

      res.status(200).json({
        msg: "Paintings created successfully",
        variant: "success",
        saved,
      });
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

paintingRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await PaintingDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Paintings updated successfully",
      variant: "success",
      updated,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

paintingRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PaintingDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Painting deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Painting deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = paintingRT;
