const { Router } = require("express");
const DesignsDB = require("../../models/Warehouse/Designs");
const StockHistoryDB = require("../../models/Warehouse/StockHistory");
const { ValidateAdmin } = require("../../middleware/checkAdmin");

const stockRT = Router();

/*
  POST /designs/stock
  Body:
  {
    designId: number,
    orgId: number,
    newQty: number,
    description: string
  }
*/
stockRT.post("/", [ValidateAdmin.check], async (req, res) => {
  try {
    let { designId, orgId, newQty, description } = req.body;

    designId = Number(designId);
    orgId = Number(orgId);
    newQty = Number(newQty);

    // Валидация
    if (!designId || isNaN(designId))
      return res.status(400).json({ msg: "designId xato", variant: "error" });

    if (!orgId || isNaN(orgId))
      return res.status(400).json({ msg: "orgId xato", variant: "error" });

    if (newQty === undefined || isNaN(newQty))
      return res.status(400).json({ msg: "newQty xato", variant: "error" });

    // Ищем дизайн
    const design = await DesignsDB.findOne({ id: designId });

    if (!design)
      return res.status(404).json({
        msg: "Dizayn topilmadi",
        variant: "warning",
      });

    // Ищем старый остаток
    const stockIndex = design.stock.findIndex((s) => s.orgId === orgId);
    const oldQty = stockIndex === -1 ? 0 : design.stock[stockIndex].stock;

    // Обновляем или создаём сток
    if (stockIndex === -1) {
      design.stock.push({
        orgId,
        stock: newQty,
        updated: new Date().toISOString(),
      });
    } else {
      design.stock[stockIndex].stock = newQty;
      design.stock[stockIndex].updated = new Date().toISOString();
    }

    await design.save();

    // Сохраняем историю изменений
    const history = await StockHistoryDB.create({
      designId,
      orgId,
      oldQty,
      newQty,
      description: description || "",
      createdAt: new Date(),
    });

    res.status(200).json({
      msg: "Ombor yangilandi",
      variant: "success",
      updatedDesign: design,
      history,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Xato yuz berdi", variant: "error", err });
  }
});

/*
  GET /designs/stock
  Query params:
  ?designId=3
  ?orgId=1
  ?from=2024-01-01
  ?to=2024-02-01
  ?limit=50
*/
stockRT.get("/", [ValidateAdmin.check], async (req, res) => {
  try {
    let { designId, orgId, from, to, limit } = req.query;

    const filter = {};

    // Валидация и фильтры
    if (designId && !isNaN(Number(designId))) {
      filter.designId = Number(designId);
    }

    if (orgId && !isNaN(Number(orgId))) {
      filter.orgId = Number(orgId);
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const history = await StockHistoryDB.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit ? Number(limit) : 300);

    res.status(200).json({
      msg: "Tarix topildi",
      variant: "success",
      history,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Xato yuz berdi",
      variant: "error",
      err,
    });
  }
});

module.exports = stockRT;
