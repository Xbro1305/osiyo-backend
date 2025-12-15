const { Router } = require("express");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");

const gazapalRT = Router();

gazapalRT.get("/", async (req, res) => {
  try {
    const gazapal = await gazapalDB.find();
    res.status(200).json({
      msg: "Gazapal fetched successfully",
      variant: "success",
      gazapal,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

gazapalRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      if (!["gazapal", "admin", "superadmin"].includes(user.role))
        return res.status(400).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });

      const data = req.body;
      const created = await gazapalDB.create(data);
      const saved = await created.save();

      res.status(200).json({
        msg: "Gazapal created successfully",
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

gazapalRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await gazapalDB.findByIdAndUpdate(id, data, { new: true });
    res.status(200).json({
      msg: "Gazapal updated successfully",
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

gazapalRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await gazapalDB.findByIdAndDelete(id);
    res
      .status(200)
      .json({ msg: "Gazapal deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = gazapalRT;
