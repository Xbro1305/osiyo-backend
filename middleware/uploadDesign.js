const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Создаем папку uploads, если нет
const uploadDir = path.join(__dirname, "../uploads/warehouse");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

module.exports = upload;
