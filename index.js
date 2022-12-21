const express = require("express");
const cors = require("cors");
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
// middle wares
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
	res.send("Resale Furniture server is running now ");
});
app.listen(port, () => {
	console.log("resale furniture port is running", port);
});

