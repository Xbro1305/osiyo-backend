const { Router } = require("express");
const zrelniyDB = require("../../models/Printing/Zrelniy.js");
const printDB = require("../../models/Printing/Print.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");

const zrelniyRT = Router();

zrelniyRT.get("/", async (req, res) => {
  try {
    const zrelniy = await zrelniyDB.find();
    res.status(200).json({
      msg: "Zrelniy fetched successfully",
      variant: "success",
      zrelniy,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

zrelniyRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      if (!["zrelniy", "admin", "superadmin"].includes(user.role)) {
        return res.status(403).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });
      }

      const data = req.body;
      const { printIds = [] } = data;

      // ✅ НОРМАЛИЗАЦИЯ ID
      const normalizedPrintIds = printIds.map((item) =>
        typeof item === "string" ? item : item.id
      );

      const prints = await printDB.find({
        _id: { $in: normalizedPrintIds },
      });

      const saved = await zrelniyDB.create({
        ...data,
        printIds: normalizedPrintIds,
        prints: prints.map((item) => ({
          passNo: item.passNo,
          orderName: item.order.name,
          printed: item.order.printed,
          orderCloth: item.order.cloth,
        })),
      });

      console.log(saved);

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

zrelniyRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await zrelniyDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Zrelniy updated successfully",
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

zrelniyRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await zrelniyDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Zrelniy deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Zrelniy deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = zrelniyRT;
