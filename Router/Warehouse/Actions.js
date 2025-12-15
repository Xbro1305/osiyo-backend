const { Router } = require("express");
const ActionsDb = require("../../models/Warehouse/Actions");
const { ValidateAdmin } = require("../../middleware/checkAdmin");
const actionsRT = Router();

actionsRT.post("/", [ValidateAdmin.check], async (req, res) => {
  try {
    const data = req.body;
    const created = await ActionsDb.create({ ...data });
    const saved = await created.save();

    res.status(200).json({
      msg: "Topildi",
      variant: "success",
      saved,
    });
  } catch (err) {
    res.status(400).json({
      msg: "Hech narsa topilmadi",
      variant: "error",
      err,
    });
  }
});

actionsRT.get("/", async (req, res) => {
  try {
    const data = await ActionsDb.find({});

    const { length } = req.body;
    const limitedData = length ? data.slice(0, Number(length)) : data;
    if (limitedData.length > 0) {
      res.status(200).json({
        msg: "Actions found successfully",
        variant: "success",
        innerData: limitedData,
      });
    } else {
      res.status(404).json({
        msg: "Nimadir xato",
        variant: "warning",
        innerData: [],
      });
    }
  } catch (err) {
    res
      .status(400)
      .json({ msg: "Something went wrong", variant: "error", err });
  }
});

actionsRT.put("/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = Number(req.params.id); // важно!
    const incoming = req.body;

    // помечаем как изменённый
    incoming.edited = true;

    const updated = await ActionsDb.findOneAndUpdate(
      { id }, // ищем по твоему `id`
      incoming,
      { new: true } // вернуть обновлённый документ
    );

    if (!updated) {
      return res.status(404).json({
        msg: "Action topilmadi",
        variant: "warning",
      });
    }

    res.status(200).json({
      msg: "Taxrirlandi",
      variant: "success",
      updated,
    });
  } catch (err) {
    res.status(400).json({ msg: "Nimadir xato", variant: "error", err });
  }
});

actionsRT.delete("/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = await ActionsDb.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({
        msg: "Action topilmadi",
        variant: "warning",
      });
    }

    res.status(200).json({
      msg: "O'chirildi",
      variant: "success",
      deleted,
    });
  } catch (err) {
    res.status(400).json({ msg: "Nimadir xato", variant: "error", err });
  }
});

module.exports = actionsRT;
