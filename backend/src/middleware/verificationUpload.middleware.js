import multer from "multer";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error("Upload a PDF, JPG or PNG file (maximum 5 MB)."));
    }
    callback(null, true);
  }
});

export default upload;
