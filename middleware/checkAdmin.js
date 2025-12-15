const jwt = require("jsonwebtoken");
require("dotenv").config();
const Users = require("../models/Users");

class ValidateAdmin {
  static async check(req, res, next) {
    const token = req?.headers?.authorization?.split(" ")[1];

    if (!token)
      return res
        .status(400)
        .json({ msg: "Token mavjud emas", variant: "error" });

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err)
        return res.status(400).json({
          msg: "Token xato",
          variant: "warning",
        });

      const user = await Users.findOne({ username: decoded.user.username });
      if (!user)
        return res
          .status(400)
          .json({ msg: "Foydalanuvchi topilmadi", variant: "error" });

      if (user.password !== decoded.user.password)
        return res.status(400).json({
          msg: "Tizimga qayta kiring",
          variant: "warning",
        });

      if (user.role == "user")
        return res.status(400).json({
          msg: "You do not have permissions to access. Sizni bunga haqingiz yo'q!",
          variant: "warning",
        });
      next();
    });
  }
  static async checkSuperAdmin(req, res, next) {
    const token = req?.headers?.authorization?.split(" ")[1];

    if (!token)
      return res
        .status(400)
        .json({ msg: "Token is not defined", variant: "error" });

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err)
        return res.status(400).json({
          msg: "Invalid token",
          variant: "warning",
        });

      const user = await Users.findOne({ username: decoded.user.username });
      if (!user)
        return res
          .status(400)
          .json({ msg: "Current user not found", variant: "error" });

      if (user.password !== decoded.user.password)
        return res.status(400).json({
          msg: "Incorrect password, please sign in again",
          variant: "warning",
        });

      if (user.role != "superadmin")
        return res.status(400).json({
          msg: "You do not have permissions to access. Sizni bunga haqingiz yo'q!",
          variant: "warning",
        });
      next();
    });
  }
}
module.exports = { ValidateAdmin };
