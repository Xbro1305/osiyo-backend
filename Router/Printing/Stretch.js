const { Router } = require("express");
const stretchDB = require("../../models/Printing/Stretch.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");

const stretchRT = Router();

stretchRT.get("/", async (req, res) => {
  try {
    const stretches = await stretchDB.find();
    res.status(200).json({
      msg: "Stretches fetched successfully",
      variant: "success",
      stretches,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

stretchRT.post("/", [ValidateAdmin.check], async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        msg: "Token topilmadi",
        variant: "warning",
      });
    }

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err) {
        return res.status(400).json({
          msg: "Token xato. Tizimga qayta kiring",
          variant: "warning",
          err,
        });
      }

      const user = await Users.findOne({ username: decoded.user.username });
      if (!user) {
        return res.status(400).json({
          msg: "Foydalanuvchi topilmadi",
          variant: "error",
        });
      }

      if (user.password !== decoded.user.password) {
        return res.status(400).json({
          msg: "Qayta tizimga kiring",
          variant: "warning",
        });
      }

      if (!["stretch", "admin", "superadmin"].includes(user.role)) {
        return res.status(403).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });
      }

      const data = req.body;
      const { gazapalIds = [] } = data;

      // ✅ НОРМАЛИЗАЦИЯ ID
      const normalizedGazapalIds = gazapalIds.map((item) =>
        typeof item === "string" ? item : item.id
      );

      const gazapals = await gazapalDB.find({
        _id: { $in: normalizedGazapalIds },
      });

      const saved = await stretchDB.create({
        ...data,
        gazapalIds: normalizedGazapalIds,
        gazapals,
      });

      return res.status(200).json({
        msg: "Stretch created successfully",
        variant: "success",
        saved,
      });
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

stretchRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await stretchDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Stretch updated successfully",
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

stretchRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await stretchDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Stretch deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Stretch deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = stretchRT;
