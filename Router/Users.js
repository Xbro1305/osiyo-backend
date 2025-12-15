const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const rt = Router();
const { ValidateAdmin } = require("../middleware/checkAdmin");

rt.post("/auth", async (req, res) => {
  try {
    const token = await req.headers.authorization?.split(" ")[1];
    const verify = jwt.verify(token, process.env.SALT);
    const user = await Users.findOne({ username: verify?.user?.username });
    if (!user)
      return res.status(404).json({
        msg: "User not found, please sign in again",
        variant: "error",
      });
    if (user.password == verify.user.password)
      return res.status(200).json({
        msg: "Authentication successfully",
        variant: "success",
      });

    res.status(400).json({
      msg: "Authentication failed",
      variant: "error",
    });
  } catch (err) {
    res.status(400).json({
      msg: "Invalid token/user please log in again",
      variant: "warning",
    });
  }
});

rt.post("/signup", async (req, res) => {
  try {
    const data = req.body;
    const compare = await Users.findOne({ username: data.username });
    if (compare)
      return res
        .status(400)
        .json({ msg: "Username is already has been used", variant: "warning" });
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash(data.password, salt);
    data.password = pass;
    data.role = "user";
    const created = await Users.create(data);
    const saved = await created.save();
    res.status(200).json({
      msg: "User created successfully",
      variant: "Success",
      innerData: saved,
    });
  } catch (err) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: err,
    });
  }
});

rt.post("/create_admin", [ValidateAdmin.checkSuperAdmin], async (req, res) => {
  try {
    const data = req.body;

    const compare = await Users.findOne({ username: data.username });
    if (compare)
      return res
        .status(400)
        .json({ msg: "Admin is already has been used", variant: "warning" });

    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash(data.password, salt);

    data.password = pass;

    const created = await Users.create(data);
    const saved = await created.save();

    res.status(200).json({
      msg: "User created successfully",
      variant: "Success",
      innerData: saved,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: err,
    });
  }
});

rt.get("/getme", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err)
        return res.status(400).json({
          msg: "Invalid token",
          variant: "warning",
          err,
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

      const { password, ...safeUser } = user._doc;

      return res.status(200).json({
        msg: "User found successfully",
        variant: "success",
        data: safeUser,
      });
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      err,
    });
  }
});

rt.delete("/delete/:id", [ValidateAdmin.check], async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Users.findByIdAndDelete(id);

    res.status(200).json({
      msg: "User deleted successfully",
      deleted: deleted,
      variant: "Success",
    });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Something went wrong", error: err, variant: "error" });
  }
});

rt.patch("/update", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ msg: "Token is missing", variant: "error" });
    }

    jwt.verify(token, process.env.SALT, async (err, decoded) => {
      if (err) {
        return res.status(400).json({
          msg: "Invalid token",
          variant: "warning",
          err,
        });
      }

      const id = decoded.user._id;

      // Получаем текущего пользователя
      const user = await Users.findById(id);
      if (!user) {
        return res.status(400).json({
          msg: "Current user not found",
          variant: "error",
        });
      }

      if (req.body.username || req.body.password)
        return res.status(400).json({
          msg: "Cannot update password and/or username",
          variant: "error",
        });

      const { username, password, ...updateData } = req.body;

      await Users.findByIdAndUpdate(id, updateData);

      const updated = await Users.findById(id).lean();
      if (updated?.password) delete updated.password;

      res.status(200).json({
        msg: "User updated successfully",
        variant: "success",
        data: updated,
      });
    });
  } catch (err) {
    res.status(500).json({
      msg: "Something went wrong",
      variant: "error",
      error: err,
    });
  }
});

rt.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Users.findOne({ username });
    if (!user)
      return res.status(404).json({ msg: "User not found", variant: "error" });

    const comparepassword = await bcrypt.compare(password, user.password);
    if (!comparepassword)
      return res
        .status(400)
        .json({ msg: "Password is incorrect", variant: "error" });

    const token = jwt.sign({ user }, process.env.SALT, {
      expiresIn: "12h",
    });
    res
      .status(200)
      .json({ msg: "Logged in successfully", variant: "success", token, user });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Something went wrong", variant: "error", err: err });
  }
});

module.exports = rt;
