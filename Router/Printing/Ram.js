const { Router } = require("express");
const RamDB = require("../../models/Printing/Ram.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

const ramRT = Router();

ramRT.get("/", async (req, res) => {
  try {
    const ram = await RamDB.find();
    res.status(200).json({
      msg: "Ram fetched successfully",
      variant: "success",
      ram,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

ramRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      if (!["ram", "admin", "superadmin"].includes(user.role))
        return res.status(400).json({
          msg: "Huquq yetarli emas",
          variant: "warning",
        });

      const data = req.body;
      const gazapal = await gazapalDB.findById(req.body.gazapalId);
      data.gazapal = gazapal;

      const stretching =
        ((data?.length || 0) * 100) / (gazapal?.length || 0) - 100;

      const created = await RamDB.create({ ...data, gazapal, stretching });
      const saved = await created.save();

      res.status(200).json({
        msg: "Ram created successfully",
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

ramRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await RamDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Ram updated successfully",
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

ramRT.delete("/group", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const deleted = await RamDB.deleteMany({ _id: { $in: ids } });
    if (!deleted) {
      return res.status(400).json({
        msg: "Ram group deleted unsuccessfully",
        variant: "error",
      });
    }
    res.status(200).json({
      msg: "Ram group deleted successfully",
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
});

ramRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RamDB.findByIdAndDelete(id);

    if (!deleted)
      res
        .status(400)
        .json({ msg: "Ram deleted unsuccessfully", variant: "error" });

    res
      .status(200)
      .json({ msg: "Ram deleted successfully", variant: "success" });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

ramRT.post("/export", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const ram =
      Array.isArray(ids) && ids.length > 0
        ? await RamDB.find({ _id: { $in: ids } }).lean()
        : await RamDB.find().lean();
    if (!ram.length) {
      return res.status(404).json({
        msg: "No data found",
        variant: "warning",
      });
    }

    const normalized = ram.map((item) => ({
      "RAM No.": item.passNo,
      Sana: item.date,
      "Mato nomi": item.gazapal.cloth.name,
      Miqdori: item.length,
      Operator: item.user.name,
      Smena: item.user.shift,
      "Auto number": String(item._id),
    }));
    const worksheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ram");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    res.setHeader("Content-Disposition", "attachment; filename=ram.xlsx");
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
});

module.exports = ramRT;
