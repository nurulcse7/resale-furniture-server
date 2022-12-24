const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
// middle wares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Resale Furniture server is running now ');
});
app.listen(port, () => {
  console.log('resale furniture port is running', port);
});

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.70yiu6o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


async function run() {
	const furnitureCollections = client.db('furnitureCollection').collection('furnitures')


	// ============  All furniture API (Start here)  ====================
	app.post('/furnitures', async (req, res) => {
		const product = req.body
		const result = await furnitureCollections.insertOne(product)
		res.send(result)
	})

	app.get("/furnitures", async (req, res) => {
		const query = {}
		const result = await furnitureCollections.find(query).toArray()
		res.send(result)
	})
	app.get('/furnitures/:id', async (req, res) => {
		const { id } = req.params
		const query = { _id: ObjectId(id) }
		const result = await furnitureCollections.findOne(query)
		res.send(result)
	})
	app.put('/furnitures/:id', async (req, res) => {
		const { id } = req.params
		const Status = req.body
		const query = { _id: ObjectId(id) }
		const options = { upsert: true }
		const updateDoc = {
			$set: {
				Status: Status?.Status,
			}
		}
		const result = await furnitureCollections.updateOne(query, updateDoc, options)
		res.send(result)
	})
	

	// ============  All furniture API (Stop here)  ====================


	// =============  All Categories API (Start here)  ====================
	app.get('/categories', async (req, res) => {
		const query = {}
		const result = await furnitureCollections.find(query).toArray()
		res.send(result)
	})
	// =============  All Categories API (Stop here)  ====================


}
run().catch(err => {
	console.log(err);
});