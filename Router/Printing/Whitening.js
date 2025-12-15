const { Router } = require("express");
const whiteningDB = require("../../models/Printing/Whitening.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");

const whiteningRT = Router();

whiteningRT.get("/", async (req, res) => {
  try {
    const whitening = await whiteningDB.find();
    res.status(200).json({
      msg: "Whitenings fetched successfully",
      variant: "success",
      whitening,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

whiteningRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      if (!["whitener", "admin", "superadmin"].includes(user.role))
        return res.status(400).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });

      const data = req.body;
      const gazapal = await gazapalDB.findById(req.body.gazapalId);
      data.gazapal = gazapal;

      console.log(data);

      const created = await whiteningDB.create({ ...data, gazapal });
      const saved = await created.save();

      res.status(200).json({
        msg: "Whitening created successfully",
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

whiteningRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await whiteningDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Whitening updated successfully",
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

whiteningRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await whiteningDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Whitening deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Whitening deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = whiteningRT;
