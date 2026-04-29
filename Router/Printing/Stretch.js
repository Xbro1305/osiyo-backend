const { Router } = require("express");
const stretchDB = require("../../models/Printing/Stretch.js");
const gazapalDB = require("../../models/Printing/Gazapal.js");
const { ValidateAdmin } = require("../../middleware/checkAdmin.js");
const Users = require("../../models/Users.js");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

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
        typeof item === "string" ? item : item.id,
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
stretchRT.delete(
  "/group",
  [ValidateAdmin.checkSuperAdmin],
  async (req, res) => {
    try {
      const { ids } = req.body;
      const deleted = await stretchDB.deleteMany({ _id: { $in: ids } });
      if (!deleted) {
        return res.status(400).json({
          msg: "Stretch group deleted unsuccessfully",
          variant: "error",
        });
      }
      res.status(200).json({
        msg: "Stretch group deleted successfully",
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

stretchRT.get("/group", async (req, res) => {
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
      "length",
      "stretch",
      "description",
      "totalLength",
      "user.id",
      "user.name",
      "user.role",
      "user.shift",
      "gazapals.passNo",
      "gazapals.date",
      "gazapals.length",
      "gazapals.cloth.id",
      "gazapals.cloth.name",
      "gazapals.user.id",
      "gazapals.user.name",
      "gazapals.user.role",
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
          totalLengthSum: {
            $sum: {
              $convert: {
                input: "$length",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalStretchSum: {
            $sum: {
              $convert: {
                input: "$stretch",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          totalLengthFieldSum: {
            $sum: {
              $convert: {
                input: "$totalLength",
                to: "double",
                onError: 0,
                onNull: 0,
              },
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

    const grouped = await stretchDB.aggregate(pipeline);

    return res.status(200).json({
      msg: "Stretch grouped successfully",
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

stretchRT.post("/export", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const { ids } = req.body;
    const stretches =
      Array.isArray(ids) && ids.length > 0
        ? await stretchDB.find({ _id: { $in: ids } }).lean()
        : await stretchDB.find().lean();
    if (!stretches.length) {
      return res.status(404).json({
        msg: "No data found",
        variant: "warning",
      });
    }

    const normalized = stretches.map((item) => ({
      "Stretching No.": item.passNo,
      Sana: item.date,
      Gazapal: item.gazapals.map((g) => g.passNo).join(", "),
      "Mato nomi": item.gazapals.map((g) => g.cloth.name).join(" | "),
      "Xom miqdori": item.gazapals.map((g) => g.length).join(" | "),
      "Pechat metri": item.length,
      "Cho'zilish": `${item.stretch}%`,
      Ishlatildi: item.description,
      Operator: item.user.name,
      Smena: item.user.shift,
      "Auto number": String(item._id),
    }));
    const worksheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stretching");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=stretching.xlsx",
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
});

module.exports = stretchRT;
