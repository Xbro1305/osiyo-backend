const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const mongoose = require("mongoose");
require("dotenv").config();

const rt = require("./Router/Router");
const prt = require("./Router/Products");
const categoryRT = require("./Router/Category");

const app = express();

// === 📁 Логирование ===
const logDirectory = path.join(__dirname, "logs");
if (!fs.existsSync(logDirectory))
  fs.mkdirSync(logDirectory, { recursive: true });
const logFilePath = path.join(logDirectory, "server.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Переопределяем console.* чтобы всё дублировалось в файл
["log", "error", "warn", "info"].forEach((method) => {
  const original = console[method];
  console[method] = (...args) => {
    const message = `[${new Date().toISOString()}] [${method.toUpperCase()}] ${args
      .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : a))
      .join(" ")}\n`;
    logStream.write(message);
    original.apply(console, args);
  };
});

// === HTTP-запросы через morgan ===
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        logStream.write(message);
        process.stdout.write(message);
      },
    },
  })
);

// === Настройка CORS ===
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://osiyohometex.uz",
      "https://www.osiyohometex.uz",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// === Body парсеры ===
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// === MongoDB подключение ===
mongoose
  .connect(process.env.DB)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// === Обработка ошибок Mongoose ===
mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose runtime error:", err);
});

// === Статические файлы ===
app.use("/uploads", express.static("uploads"));

// === Роуты ===
app.use("/users", rt);
app.use("/categories", categoryRT);
app.use("/products", prt);

// === Главная страница ===
app.get("/", (req, res) => {
  res.send("Упс... Вы попали не туда 😅");
});

// === Обработчик ошибок Express (глобальный) ===
app.use((err, req, res, next) => {
  console.error("❌ Express error:", err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err?.message || err });
});

// === Запуск сервера ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));

// === Глобальные ошибки Node.js ===
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
});
