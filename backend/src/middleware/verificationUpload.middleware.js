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

export const verifyUploadedDocument = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "A supporting document is required." });
  }
  const b = req.file.buffer;
  const isPdf = b.subarray(0, 5).toString("ascii") === "%PDF-";
  const isPng = b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (!isPdf && !isPng && !isJpeg) {
    return res.status(400).json({ success: false, message: "The file content does not match a valid PDF, JPG or PNG document." });
  }
  req.file.mimetype = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg";
  next();
};

export default upload;
