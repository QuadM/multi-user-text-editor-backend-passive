const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const documentSchema = new Schema(
  {
    title: { type: String, required: false },
    quillContents: { type: Object, required: false },
  },
  { timestamps: true }
);
const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
