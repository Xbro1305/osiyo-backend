const { Router } = require("express");
const DesignsDB = require("../../models/Warehouse/Designs");
const { ValidateAdmin } = require("../../middleware/checkAdmin");
const upload = require("../../middleware/uploadDesign");
const fs = require("fs");
const path = require("path");

const designsRT = Router();

// CREATE с загрузкой файла
designsRT.post(
  "/",
  [ValidateAdmin.check, upload.single("image")],
  async (req, res) => {
    try {
      const data = req.body;

      // Multer файл
      if (req.file) data.image = `/uploads/warehouse/${req.file.filename}`;

      // Stock приходит как строка через FormData
      if (data.stock && typeof data.stock === "string") {
        try {
          data.stock = JSON.parse(data.stock);
        } catch (e) {
          data.stock = [];
        }
      }

      // Генерация уникального id
      const lastItem = await DesignsDB.findOne().sort({ id: -1 });
      data.id = lastItem ? lastItem.id + 1 : 1;

      const created = await DesignsDB.create(data);
      res
        .status(200)
        .json({ msg: "Dizayn qo'shildi", variant: "success", created });
    } catch (err) {
      console.error(err);
      res.status(400).json({ msg: "Xato yuz berdi", variant: "error", err });
    }
  }
);

// READ ALL
designsRT.get("/", async (req, res) => {
  try {
    const { length, article } = req.query;

    // Фильтр по article, если передан
    const filter = {};
    if (article) {
      filter.article = { $regex: article, $options: "i" }; // 'i' для нечувствительности к регистру
    }

    const data = await DesignsDB.find(filter).sort({ id: 1 });

    const limitedData = length ? data.slice(0, Number(length)) : data;

    res.status(200).json({
      msg: "Dizaynlar topildi",
      variant: "success",
      innerData: limitedData,
    });
  } catch (err) {
    res.status(400).json({ msg: "Xato yuz berdi", variant: "error", err });
  }
});

// READ ONE
designsRT.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await DesignsDB.findOne({ id });

    if (!item)
      return res
        .status(404)
        .json({ msg: "Dizayn topilmadi", variant: "warning" });

    res.status(200).json({ msg: "Dizayn topildi", variant: "success", item });
  } catch (err) {
    res.status(400).json({ msg: "Xato yuz berdi", variant: "error", err });
  }
});

// UPDATE с Multer
designsRT.put(
  "/:id",
  [ValidateAdmin.check, upload.single("image")],
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updatedData = req.body;

      // Multer файл
      if (req.file) updatedData.image = `/uploads/warehouse/${req.file.filename}`;

      // Stock приходит как строка через FormData
      if (updatedData.stock && typeof updatedData.stock === "string") {
        try {
          updatedData.stock = JSON.parse(updatedData.stock);
        } catch (e) {
          updatedData.stock = [];
        }
      }

      const updated = await DesignsDB.findOneAndUpdate({ id }, updatedData, {
        new: true,
      });

      if (!updated)
        return res
          .status(404)
          .json({ msg: "Dizayn topilmadi", variant: "warning" });

      res
        .status(200)
        .json({ msg: "Dizayn yangilandi", variant: "success", updated });
    } catch (err) {
      res.status(400).json({ msg: "Xato yuz berdi", variant: "error", err });
    }
  }
);

designsRT.delete("/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = Number(req.params.id);

    const design = await DesignsDB.findOne({ id });
    if (!design)
      return res
        .status(404)
        .json({ msg: "Dizayn topilmadi", variant: "warning" });

    // Удаляем файл, если есть
    if (design.image) {
      // путь из БД типа: "/uploads/filename.jpg"
      const filePath = path.join(__dirname, "..", design.image);

      // Проверяем существование файла
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.log("Ошибка удаления файла:", fileErr);
        }
      }
    }

    // Удаляем документ
    const deleted = await DesignsDB.findOneAndDelete({ id });

    res.status(200).json({
      msg: "Dizayn o'chirildi",
      variant: "success",
      deleted,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      msg: "Xato yuz berdi",
      variant: "error",
      err,
    });
  }
});

module.exports = designsRT;
