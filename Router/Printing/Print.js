const { Router } = require("express");
const printDB = require("../../models/Printing/Print.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const DesignsDB = require("../../models/Warehouse/Designs.js");

const printRT = Router();

printRT.get("/", async (req, res) => {
  try {
    const prints = await printDB.find();
    res.status(200).json({
      msg: "Prints fetched successfully",
      variant: "success",
      prints,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

printRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      if (!["printer", "admin", "superadmin"].includes(user.role)) {
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

      const design = await DesignsDB.find({
        article: req.body.designArt,
      });
      console.log(design[0], req.body.designArt);

      const saved = await printDB.create({
        ...data,
        gazapalIds: normalizedGazapalIds,
        gazapals,
        design: { article: design[0].article, imageUrl: design[0].image },
      });

      return res.status(200).json({
        msg: "Printing created successfully",
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

printRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await printDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Printing updated successfully",
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

printRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await printDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Printing deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Printing deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

module.exports = printRT;
