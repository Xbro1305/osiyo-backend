const { Router } = require("express");
const printDB = require("../../models/Printing/Print.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const DesignsDB = require("../../models/Warehouse/Designs.js");
const XLSX = require("xlsx");

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

printRT.get("/group", async (req, res) => {
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
      "designArt",
      "design.article",
      "order.name",
      "order.cloth",
      "order.length",
      "order.printed",
      "order.stretch",
      "order.status",
      "user.id",
      "user.name",
      "user.role",
      "user.shift",
      "gazapals.passNo",
      "gazapals.length",
      "gazapals.date",
      "gazapals.cloth.id",
      "gazapals.cloth.name",
      "gazapals.user.name",
      "gazapals.user.shift",
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

    const hasGazapalsKey = groupKeys.some((key) => key.startsWith("gazapals."));

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

    if (hasGazapalsKey) {
      pipeline.push({
        $unwind: {
          path: "$gazapals",
          preserveNullAndEmptyArrays: true,
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id,
          count: { $sum: 1 },
          totalOrderLength: {
            $sum: {
              $convert: {
                input: "$order.length",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalPrinted: {
            $sum: {
              $convert: {
                input: "$order.printed",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalStretch: {
            $sum: {
              $convert: {
                input: "$order.stretch",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalGazapalLength: {
            $sum: {
              $cond: [
                hasGazapalsKey,
                {
                  $convert: {
                    input: "$gazapals.length",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                {
                  $sum: {
                    $map: {
                      input: "$gazapals",
                      as: "gazapal",
                      in: {
                        $convert: {
                          input: "$$gazapal.length",
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

    const grouped = await printDB.aggregate(pipeline);

    res.status(200).json({
      msg: "Prints grouped successfully",
      variant: "success",
      keys: groupKeys,
      grouped,
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

      const normalizedGazapalIds = gazapalIds.map((item) =>
        typeof item === "string" ? item : item.id,
      );

      const gazapals = await gazapalDB.find({
        _id: { $in: normalizedGazapalIds },
      });

      const design = await DesignsDB.findOne({
        article: req.body.designArt,
      });

      if (!design) {
        return res.status(404).json({
          msg: "Design topilmadi",
          variant: "warning",
        });
      }

      const saved = await printDB.create({
        ...data,
        gazapalIds: normalizedGazapalIds,
        gazapals,
        design: {
          article: design.article,
          imageUrl: design.image,
        },
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

printRT.delete("/group", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const deleted = await printDB.deleteMany({ _id: { $in: ids } });

    if (!deleted) {
      return res.status(400).json({
        msg: "Print group deleted unsuccessfully",
        variant: "error",
      });
    }

    res.status(200).json({
      msg: "Print group deleted successfully",
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

printRT.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await printDB.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(400).json({
        msg: "Printing deleted unsuccessfully",
        variant: "error",
      });
    }

    res.status(200).json({
      msg: "Printing deleted successfully",
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

printRT.post("/export", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;

    const prints =
      Array.isArray(ids) && ids.length > 0
        ? await printDB.find({ _id: { $in: ids } }).lean()
        : await printDB.find().lean();

    if (!prints.length) {
      return res.status(404).json({
        msg: "No data found",
        variant: "warning",
      });
    }

    const normalized = prints.map((item) => ({
      "Printing No.": item.passNo,
      sana: item.date,
      "Gazapal No.": item.gazapals.map((g) => g.passNo).join(", "),
      "Mato nomi": item.gazapals.map((g) => g.cloth.name).join(" | "),
      "Zakaz nomi": item.order.name,
      "Zakaz mato nomi": item.order.cloth,
      "des. no.": item.design.article,
      "des. image url": `api.osiyohometex.uz${item.design.imageUrl}`,
      "Zakaz metri": item.order.length,
      Bosildi: item.order.printed,
      Holati: item.order.status == true ? "Tugallangan" : "Jarayonda",
      "Zakazga qo'shildi %": item.order.stretch,
      "Auto number": String(item._id),
    }));

    const worksheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prints");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader("Content-Disposition", "attachment; filename=prints.xlsx");
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

module.exports = printRT;
