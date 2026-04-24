const { Router } = require("express");
const PaintingDB = require("../../models/Printing/Painting.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

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
paintingRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const deleted = await PaintingDB.deleteMany({ _id: { $in: ids } });
      if (!deleted) {
        return res.status(400).json({
          msg: "Painting group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Painting group deleted successfully",
        variant: "success",
        deleted,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Something went wrong",
        variant: "error",
        error: error.message,
      });
    }
  },
);

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

paintingRT.post(
  "/export",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const painting =
        Array.isArray(ids) && ids.length > 0
          ? await PaintingDB.find({ _id: { $in: ids } }).lean()
          : await PaintingDB.find().lean();
      if (!painting.length) {
        return res.status(404).json({
          msg: "No data found",
          variant: "warning",
        });
      }

      const normalized = painting.map((item) => ({
        "Painting No.": item.passNo,
        Sana: item.date,
        "Mato nomi": item.gazapal.cloth.name,
        Miqdori: item.gazapal.length,
        Operator: item.gazapal.user.name,
        Smena: item.gazapal.user.shift,
        "Auto number": String(item._id),
      }));
      const worksheet = XLSX.utils.json_to_sheet(normalized);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bo'yash");
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
      res.setHeader("Content-Disposition", "attachment; filename=bo'yash.xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      return res.send(buffer);
    } catch (error) {
      return res.status(500).json({
        msg: "Something went wrong",
        variant: "error",
        error: error.message,
      });
    }
  },
);

module.exports = paintingRT;
