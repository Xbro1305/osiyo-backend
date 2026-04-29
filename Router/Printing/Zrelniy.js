const { Router } = require("express");
const zrelniyDB = require("../../models/Printing/Zrelniy.js");
const printDB = require("../../models/Printing/Print.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

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
        typeof item === "string" ? item : item.id,
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
zrelniyRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    console.log("ROUTE HIT"); // 👈 вот это
    try {
      console.log("BODY:", req.body);
      const { ids } = req.body;

      console.log("IDS:", ids);

      const deleted = await zrelniyDB.deleteMany({ _id: { $in: ids } });
      if (!deleted) {
        return res.status(400).json({
          msg: "Zrelniy group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Zrelniy group deleted successfully",
        variant: "success",
        deleted,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Something went wrong",
        variant: "error",
        error: error.message,
      });
    }
  },
);

zrelniyRT.get("/group", async (req, res) => {
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
      "speed",
      "temperature",
      "status",
      "user.id",
      "user.name",
      "user.role",
      "user.shift",
      "prints.passNo",
      "prints.orderName",
      "prints.printed",
      "prints.orderCloth",
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

    const hasPrintsKey = groupKeys.some((key) => key.startsWith("prints."));

    const _id = {};

    groupKeys.forEach((key) => {
      _id[key.replace(/\./g, "_")] = `$${key}`;
    });

    const pipeline = [
      {
        $addFields: {
          originalDoc: "$$ROOT",
        },
      },
    ];

    if (hasPrintsKey) {
      pipeline.push({
        $unwind: {
          path: "$prints",
          preserveNullAndEmptyArrays: true,
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id,
          count: { $sum: 1 },
          totalSpeed: {
            $sum: {
              $convert: {
                input: "$speed",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalTemperature: {
            $sum: {
              $convert: {
                input: "$temperature",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalPrinted: {
            $sum: {
              $cond: [
                hasPrintsKey,
                {
                  $convert: {
                    input: "$prints.printed",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                {
                  $sum: {
                    $map: {
                      input: "$prints",
                      as: "print",
                      in: {
                        $convert: {
                          input: "$$print.printed",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          items: { $addToSet: "$originalDoc" },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    );

    const grouped = await zrelniyDB.aggregate(pipeline);

    return res.status(200).json({
      msg: "Zrelniy grouped successfully",
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

zrelniyRT.post("/export", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const zrelniy =
      Array.isArray(ids) && ids.length > 0
        ? await zrelniyDB.find({ _id: { $in: ids } }).lean()
        : await zrelniyDB.find().lean();
    if (!zrelniy.length) {
      return res.status(404).json({
        msg: "No data found",
        variant: "warning",
      });
    }

    const normalized = zrelniy.map((item) => ({
      "Zrelniy No.": item.passNo,
      Sana: item.date,
      "Pechat No.": item.prints.map((g) => g.passNo).join(", "),
      "Zakaz nomi": item.prints.map((g) => g.orderName).join(" | "),
      "Mato nomi": item.prints.map((g) => g.orderCloth).join(" | "),
      "Pechat metri": item.prints.map((g) => g.printed).join(" | "),
      Tezlik: item.speed,
      Harorat: item.temperature,
      Holat: item.status == true ? "Tugallangan" : "Jarayonda",
      Operator: item.user.name,
      Smena: item.user.shift,
      "Auto number": String(item._id),
    }));
    const worksheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Zrelniy");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    res.setHeader("Content-Disposition", "attachment; filename=zrelniy.xlsx");
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

module.exports = zrelniyRT;
