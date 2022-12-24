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

// JWT Middleware
function verifyJWT(req, res, next) {
	const authHeader = req.headers.authorization
	if (!authHeader) {
		return res.status(401).send('unAuthorized')
	}
	const token = authHeader.split(' ')[1]
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
		if (err) {
			return res.status(403).send({ message: "forbidden access" })
		}
		req.decoded = decoded
		next()
	})
}

async function run() {
	const furnitureCollections = client.db('furnitureCollection').collection('furnitures')
	const usersCollections = client.db('furnitureCollection').collection('users')
	const ordersCollections = client.db('furnitureCollection').collection('orders')

	app.get('/jwt', async (req, res) => {
		const email = req.query.email;
		const query = { email: email };
		const user = await usersCollections.findOne(query);
		if (user) {
			const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5d' })
			return res.send({ accessToken: token });
		}
		res.status(403).send({ accessToken: '' })
	});

	// [============  All furniture API (Start here)  ====================
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
	// verifyJWT, verifyAdmin,
	app.delete('/furnitures/:id',  async (req, res) => {
		const id = req.params.id
		const query = { _id: ObjectId(id) }
		const result = await furnitureCollections.deleteOne(query)
		res.send(result)
	})
	// ============  All furniture API (Stop here)  ====================]
                          // ------- //
                           
	// [ =============  All Categories API (Start here)  ==================
	app.get('/categories', async (req, res) => {
		const query = {}
		const result = await furnitureCollections.find(query).toArray()
		res.send(result)
	})
	app.get('/categoriesProducts/:id', async (req, res) => {
		const { id } = req.params
		const query = { categoryName: id }
		const result = await furnitureCollections.find(query).toArray()
		res.send(result)
	})
	// =============  All Categories API (Stop here)  ====================]
                            // ------- //

// [ =============  All User API (Start here)  ==================
app.post('/users', async (req, res) => {
	const user = req.body
	const query = { email: user.email }
	const alreadyUser = await usersCollections.findOne(query)
	if (alreadyUser) {
		return res.send({ acknowledged: true })
	}
	const result = await usersCollections.insertOne(user)
	res.send(result)
})
app.post('/reports', async (req, res) => {
	const report = req.body
	const result = await reportsCollections.insertOne(report)
	res.send(result)
})
app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
	const email = req.query.email;
	const decodedEmail = req.decoded.email;
	if (email !== decodedEmail) {
		return res.status(403).send({ message: 'forbidden access' });
	}
	const result = await usersCollections.find({}).toArray()
	res.send(result)
})

app.get('/user/:email', verifyJWT, async (req, res) => {
	const email = req.params.email
	const query = { email: email }
	const result = await usersCollections.findOne(query)
	res.send(result)
})
app.put('/users/:email', verifyJWT, verifyAdmin, async (req, res) => {
	const email = req.params.email
	if (email) {
		const sellerVerified = { email: email }
		const query = { sellerEmail: email }
		const options = { upsert: true }
		const updateDoc = {
			$set: {
				verified: 'true',
			}
		}
		const seller = await usersCollections.updateOne(sellerVerified, updateDoc, options)
		const result = await furnitureCollections.updateMany(query, updateDoc, options)
		res.send(result)
	}
})
app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
	const { id } = req.params
	const email = req.query.email
	const query = { _id: ObjectId(id) }
	const user = await usersCollections.findOne(query)
	if (user.email === email || user.role === 'Admin' || user.email === 'nurul.cse7@gmail.com') {
		return res.send({ message: "You Can't delete admin but Owner Can delete everything" })
	}
	const result = await usersCollections.deleteOne(query)
	res.send(result)
})
// =============  All User API (Stop here)  ====================]
                       // ------- //


// [ =============  All Order API (Start here)  ==================
app.post('/orders', async (req, res) => {
	const checkSellerEmail = req.query.email
	const order = req.body
	const query = {
		productId: order.productId,
		productImage: order.productImage
	}
	const checkSeller = { sellerEmail: order?.buyerEmail }
	const seller = await furnitureCollections.findOne(checkSeller)
	if (checkSellerEmail === seller?.sellerEmail) {
		return res.send({ message: "You can't order your product" })
	}
	const alreadyOrder = await ordersCollections.findOne(query)
	if (alreadyOrder) {
		return res.send({ message: 'Sorry this product is out of stock' })
	}
	const result = await ordersCollections.insertOne(order)
	res.send(result)
})

app.get('/orders/:email', verifyJWT, async (req, res) => {
	const email = req.params.email
	const query = { buyerEmail: email }
	const result = await ordersCollections.find(query).toArray()
	res.send(result)
})

app.delete('/orders/:id', verifyJWT, async (req, res) => {
	const { id } = req.params
	const query = { _id: ObjectId(id) }
	const result = await ordersCollections.deleteOne(query)
	res.send(result)
})
// =============  All Order API (Stop here)  ====================]
                            // ------- //




// [ =============  All B API (Start here)  ==================

// =============  All B API (Stop here)  ====================]
                            // ------- //

}
run().catch(err => {
	console.log(err);
});