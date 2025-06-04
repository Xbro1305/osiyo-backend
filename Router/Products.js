const { Router } = require("express");
const productDB = require("../models/Products");
const { ValidateAdmin } = require("../middleware/admin");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const prt = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempPath = "public/uploads/temp";
    fs.mkdirSync(tempPath, { recursive: true });
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.random().toString(36).substr(2, 6) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
prt.post(
  "/create",
  [ValidateAdmin.check, upload.array("images", 10)],
  async (req, res) => {
    try {
      const data = req.body;

      const lastProduct = await productDB.findOne().sort({ article: -1 });
      const newArticle =
        lastProduct && lastProduct.article ? lastProduct.article + 1 : 1;

      const finalDir = path.join("public/uploads");
      fs.mkdirSync(finalDir, { recursive: true });

      const imagePaths = [];

      for (const file of req.files) {
        const oldPath = file.path;
        const newPath = path.join(finalDir, file.filename);
        fs.renameSync(oldPath, newPath);
        imagePaths.push(newPath.split("public").replace(/\\/g, "/"));
      }

      const created = await productDB.create({
        ...data,
        article: newArticle,
        img: imagePaths,
      });

      const saved = await created.save();

      res.status(200).json({
        msg: "Product created successfully",
        variant: "success",
        saved,
      });
    } catch (err) {
      res.status(400).json({
        msg: "Something went wrong",
        variant: "error",
        err,
      });
    }
  }
);
prt.get("/", async (req, res) => {
  try {
    const filter = { ...req.query };

    const data = await productDB.find(filter);

    const { length } = req.body;
    const limitedData = length ? data.slice(0, Number(length)) : data;
    if (limitedData.length > 0) {
      res.status(200).json({
        msg: "Products found successfully",
        variant: "success",
        innerData: limitedData,
      });
    } else {
      res.status(404).json({
        msg: "No products found",
        variant: "warning",
        innerData: [],
      });
    }
  } catch (err) {
    res.status(400).json({
      msg: "Something went wrong",
      variant: "error",
      err,
    });
  }
});

prt.patch(
  "/update/:id",
  [ValidateAdmin.check, upload.array("images", 10)],
  async (req, res) => {
    try {
      const id = req.params.id;
      const incoming = req.body;

      const product = await productDB.findById(id);
      if (!product) {
        return res.status(404).json({
          msg: "Product not found",
          variant: "error",
        });
      }

      // If new images are provided, replace old ones
      let imagePaths = product.img;

      if (req.files && req.files.length > 0) {
        // Удалить старые изображения
        for (const oldPath of product.img || []) {
          const fullPath = path.join(__dirname, "..", oldPath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }

        // Переместить новые изображения
        const finalDir = path.join("uploads");
        fs.mkdirSync(finalDir, { recursive: true });

        imagePaths = [];

        for (const file of req.files) {
          const oldPath = file.path;
          const newPath = path.join(finalDir, file.filename);
          fs.renameSync(oldPath, newPath);
          imagePaths.push("/" + newPath.replace(/\\/g, "/"));
        }
      }

      const updated = await productDB.findByIdAndUpdate(
        id,
        {
          ...incoming,
          img: imagePaths,
        },
        { new: true }
      );

      res.status(200).json({
        msg: "Product updated successfully",
        variant: "success",
        updated,
      });
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(400).json({
        msg: "Something went wrong",
        variant: "error",
        err,
      });
    }
  }
);

prt.delete("/delete/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await productDB.findByIdAndDelete(id);
    res.status(200).json({
      msg: "Product deleted successfully",
      variant: "success",
      deleted,
    });
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

module.exports = prt;
