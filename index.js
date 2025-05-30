const express = require("express");
const cors = require("cors");
const rt = require("./Router/Router");
const prt = require("./Router/Products");
const { default: mongoose } = require("mongoose");
const categoryRT = require("./Router/Category");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

mongoose
  .connect(process.env.DB)
  .then(() => console.log("Connected to MongoDB"))
  .catch(() => console.log("Error connecting"));

app.use("/users", rt);
app.use("/categories", categoryRT);
app.use("/products", prt);
app.get("?", async (req, res) => {res.send("Упс... Вы попали не туда")});

app.listen(8080, () => console.log("App started!"));
