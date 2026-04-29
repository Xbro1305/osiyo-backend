const { Router } = require("express");
const whiteningDB = require("../../models/Printing/Whitening.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

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

whiteningRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const deleted = await whiteningDB.deleteMany({ _id: { $in: ids } });
      if (!deleted) {
        return res.status(400).json({
          msg: "Whitening group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Whitening group deleted successfully",
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

whiteningRT.get("/group", async (req, res) => {
  try {
    const { keys } = req.query;

    if (!keys) {
      return res.status(400).json({
        msg: "keys query is required",
        variant: "warning",
      });
    }

    const allowedKeys = [
      "passNo",
      "date",
      "user.id",
      "user.name",
      "user.role",
      "user.shift",
      "gazapalId",
      "gazapal.passNo",
      "gazapal.date",
      "gazapal.length",
      "gazapal.cloth.id",
      "gazapal.cloth.name",
      "gazapal.user.id",
      "gazapal.user.name",
      "gazapal.user.role",
      "gazapal.user.shift",
    ];

    const groupKeys = keys
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    const invalidKeys = groupKeys.filter((key) => !allowedKeys.includes(key));

    if (invalidKeys.length) {
      return res.status(400).json({
        msg: "Invalid group keys",
        variant: "warning",
        invalidKeys,
      });
    }

    const _id = {};

    groupKeys.forEach((key) => {
      _id[key.replace(/\./g, "_")] = `$${key}`;
    });

    const grouped = await whiteningDB.aggregate([
      {
        $group: {
          _id,
          count: { $sum: 1 },
          totalGazapalLength: {
            $sum: {
              $convert: {
                input: "$gazapal.length",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          items: { $push: "$$ROOT" },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    return res.status(200).json({
      msg: "Whitening grouped successfully",
      variant: "success",
      keys: groupKeys,
      grouped,
    });
  } catch (error) {
    return res.status(500).json({
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

whiteningRT.post(
  "/export",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const whitening =
        Array.isArray(ids) && ids.length > 0
          ? await whiteningDB.find({ _id: { $in: ids } }).lean()
          : await whiteningDB.find().lean();
      if (!whitening.length) {
        return res.status(404).json({
          msg: "No data found",
          variant: "warning",
        });
      }

      const normalized = whitening.map((item) => ({
        "Whitening No.": item.passNo,
        Sana: item.date,
        "Mato nomi": item.gazapal.cloth.name,
        Miqdori: item.gazapal.length,
        Operator: item.gazapal.user.name,
        Smena: item.gazapal.user.shift,
        "Auto number": String(item._id),
      }));
      const worksheet = XLSX.utils.json_to_sheet(normalized);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Oqartirish");
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=oqartirish.xlsx",
      );
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

module.exports = whiteningRT;
