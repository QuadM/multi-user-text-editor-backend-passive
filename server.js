require("dotenv").config(); // a library enables accessing env vars from .env file
const socket = require("socket.io");
const mongoose = require("mongoose");
const _ = require("lodash");

//-----------------import document model------------------//
const Document = require("./documents");
//---------------------------------------------------------------------//
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                   PASIVE SERVER FOR BACKING UP                      //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//                                                                     //
//---------------------------------------------------------------------//

//---------------------------------------------------------------------//
//                  Connecting to Database server                     //
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((r) => console.log("Connected to the DB ..."))
  .catch((e) => console.error(e));

//---------------------------------------------------------------------//
//              creating socket listening for client                   //
const PORT = process.env.PORT || 4000;
const io = socket(PORT, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://quadm-text-editor.herokuapp.com",
    ],
    methods: ["GET", "POST"],
  },
});

let rooms = {}; // used in tracing number of users in each room/document

//---------------------------------------------------------------------//
io.on("connection", (stream) => {
  console.log("connected");
  //-------------------------------------------------------------------//
  stream.on("get-all-docs", async () => {
    console.log("all files");
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    console.log("all data :", data);
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  stream.on("create-new-doc", async () => {
    const doc = new Document({
      title: "Untitled Document",
      quillContents: " ",
    });
    doc.save();
    console.log("Saved document:", doc);
    stream.broadcast.emit("created-new-doc", doc);
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  stream.on("delete-doc", async (docID) => {
    await Document.deleteOne({ _id: docID });
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  //--------------------Joining document in rooms----------------------//
  stream.on("get-doc", async (docID) => {
    stream.join(docID);
    rooms[docID] = rooms[docID] + 1 || 1;
    console.log("on join client count :", rooms[docID]);
    const doc = await Document.findOne({ _id: docID });
    console.log(doc);
    stream.emit("load-doc", { doc, clientno: rooms[docID] });
    stream.broadcast.to(docID).emit("client-number", rooms[docID]);

    //-------------------------------------------------------------//
    stream.on("make-text-changes", ({ docID, quillContents, delta }) => {
      stream.broadcast.to(docID).emit("receive-text-changes", delta);
    });
    //-------------------------------------------------------------//
    stream.on("make-title-changes", (title) => {
      stream.broadcast.to(docID).emit("receive-title-changes", title);
    });
    //-------------------------------------------------------------//
    stream.on("save-doc", async ({ title, quillContents }) => {
      doc.title = title || "Untitled Document";
      doc.quillContents = quillContents;
      await doc.save();
      console.log("saved", doc);
      // stream.broadcast.to(docID).emit("saved-doc", "saved");
    });
    stream.on("disconnect", () => {
      rooms[docID] = rooms[docID] - 1 || 0;
      stream.broadcast.to(docID).emit("client-number", rooms[docID]);
    });
  });
  //-------------------------------------------------------------------//
});
