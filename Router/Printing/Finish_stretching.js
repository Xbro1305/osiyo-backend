const { Router } = require("express");
const finishStretchingDB = require("../../models/Printing/Finish_stretching.js");
const printDB = require("../../models/Printing/Print.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

const finishStretchingRT = Router();

finishStretchingRT.get("/", async (req, res) => {
  try {
    const data = await finishStretchingDB.find();
    res.status(200).json({
      msg: "Finish stretching fetched successfully",
      variant: "success",
      data,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

finishStretchingRT.post("/", [ValidateAdmin.check], async (req, res) => {
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

      const saved = await finishStretchingDB.create({
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
        msg: "Finish stretching created successfully",
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

finishStretchingRT.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await finishStretchingDB.findByIdAndUpdate(id, data, {
      new: true,
    });
    res.status(200).json({
      msg: "Finish stretching updated successfully",
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

finishStretchingRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const deleted = await finishStretchingDB.deleteMany({
        _id: { $in: ids },
      });
      if (!deleted) {
        return res.status(400).json({
          msg: "Finish stretching group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Finish stretching group deleted successfully",
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
finishStretchingRT.get("/group", async (req, res) => {
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
      "measured",
      "stretched",
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
          totalMeasured: {
            $sum: {
              $convert: {
                input: "$measured",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalStretched: {
            $sum: {
              $convert: {
                input: "$stretched",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalPrintedMeters: {
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

    const grouped = await finishStretchingDB.aggregate(pipeline);

    return res.status(200).json({
      msg: "Finish stretching grouped successfully",
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

finishStretchingRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await finishStretchingDB.findByIdAndDelete(id);

    if (!deleted)
      res.status(400).json({
        msg: "Finish stretching deleted unsuccessfully",
        variant: "error",
      });

    res.status(200).json({
      msg: "Finish stretching deleted successfully",
      variant: "success",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: error.message,
    });
  }
});

finishStretchingRT.post(
  "/export",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;

      const prints =
        Array.isArray(ids) && ids.length > 0
          ? await finishStretchingDB.find({ _id: { $in: ids } }).lean()
          : await finishStretchingDB.find().lean();

      if (!prints.length) {
        return res.status(404).json({
          msg: "No data found",
          variant: "warning",
        });
      }

      // 🔥 нормализация данных (убираем вложенные объекты если нужно)
      const normalized = prints.map((item) => ({
        "Stretching No.": item.passNo,
        sana: item.date,
        "Pechat No.": item.prints.map((g) => g.passNo).join(", "),
        "Zakaz mato nomi": item.prints.map((g) => g.orderCloth).join(" | "),
        "Zakaz nomi": item.prints.map((g) => g.orderName).join(" | "),
        "Zakaz bo'yicha bosildi": item.prints.map((g) => g.printed).join(" | "),
        Holati: item.status == true ? "Tugallangan" : "Jarayonda",
        "Finish qilindi": item.measured,
        "Cho'zilish %": item.stretched,
        "Auto number": String(item._id),
      }));

      // создаем worksheet
      const worksheet = XLSX.utils.json_to_sheet(normalized);

      // создаем workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finish cho'zilish");

      // буфер файла
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // отправка файла
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=finish_cho'zilish.xlsx",
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

module.exports = finishStretchingRT;
