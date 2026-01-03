const express = require("express");
const cors = require("cors");
const os = require("os");
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const mongoose = require("mongoose");
require("dotenv").config();

const usersRT = require("./Router/Users");
const productRT = require("./Router/Products");
const paintingRT = require("./Router/Printing/Painting");
const categoryRT = require("./Router/Category");
const actionsRT = require("./Router/Warehouse/Actions");
const designsRT = require("./Router/Warehouse/Designs");
const stockRT = require("./Router/Warehouse/StockHistory");
const gazapalRT = require("./Router/Printing/Gazapal");
const whiteningRT = require("./Router/Printing/Whitening");
const ramRT = require("./Router/Printing/Ram");
const clothesRT = require("./Router/Printing/Clothes");
const printRT = require("./Router/Printing/Print");
const stretchRT = require("./Router/Printing/Stretch");
const zrelniyRT = require("./Router/Printing/Zrelniy");

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

const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Разрешаем локальные адреса или поддомены osiyohometex.uz
      if (
        !origin || // для Postman, curl и прямых запросов без origin
        allowedOrigins.includes(origin) ||
        origin.endsWith(".osiyohometex.uz")
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // чтобы куки работали
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
app.use("/users", usersRT);
app.use("/categories", categoryRT);
app.use("/actions", actionsRT);
app.use("/products", productRT);
app.use("/designs/stock", stockRT);
app.use("/designs", designsRT);
app.use("/printing/gazapal", gazapalRT);
app.use("/printing/whitening", whiteningRT);
app.use("/printing/clothes", clothesRT);
app.use("/printing/painting", paintingRT);
app.use("/printing/ram", ramRT);
app.use("/printing/prints", printRT);
app.use("/printing/stretch", stretchRT);
app.use("/printing/zrelniy", zrelniyRT);

// === Главная страница ===
app.get("/", (req, res) => {
  res.send("Упс... Вы попали не туда 😅");
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const intf of interfaces[name]) {
      if (intf.family === "IPv4" && !intf.internal) return intf.address;
    }
  }
}

// === Обработчик ошибок Express (глобальный) ===
app.use((err, req, res, next) => {
  console.error("❌ Express error:", err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err?.message || err });
});

// === Запуск сервера ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://${getLocalIP()}:${PORT}`);
});

// === Глобальные ошибки Node.js ===
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
});
