const { Router } = require("express");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
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

gazapalRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const deleted = await gazapalDB.deleteMany({ _id: { $in: ids } });
      if (!deleted) {
        return res.status(400).json({
          msg: "Gazapal group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Gazapal group deleted successfully",
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

gazapalRT.post("/export", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const gazapal =
      Array.isArray(ids) && ids.length > 0
        ? await gazapalDB.find({ _id: { $in: ids } }).lean()
        : await gazapalDB.find().lean();

    if (!gazapal.length) {
      return res.status(404).json({
        msg: "No data found",
        variant: "warning",
      });
    }

    const normalized = gazapal.map((item) => ({
      "Passport No.": item.passNo,
      Sana: item.date,
      "Mato nomi": item.cloth.name,
      Miqdori: item.length,
      Operator: item.user.name,
      Smena: item.user.shift,
      "Auto number": String(item._id),
    }));

    const worksheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gazapal");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    res.setHeader("Content-Disposition", "attachment; filename=gazapal.xlsx");
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

module.exports = gazapalRT;
