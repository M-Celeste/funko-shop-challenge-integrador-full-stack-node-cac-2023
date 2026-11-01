const multer = require("multer");
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 2, fields: 20, fieldSize: 10000 },
}).fields([
  { name: "frontFile", maxCount: 1 },
  { name: "boxFile", maxCount: 1 },
]);
