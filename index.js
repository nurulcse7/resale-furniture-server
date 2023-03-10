const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Author/Admin : Nurul Islam , email: nurul.cse7@gmail.com
// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
	res.send("furniture server is running now ");
});
app.listen(port, () => {
	console.log("port is running", port);
});

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.70yiu6o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

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
	const categoriesCollections = client.db('furnitureCollection').collection('categories')
	const usersCollections = client.db('furnitureCollection').collection('users')
	const ordersCollections = client.db('furnitureCollection').collection('orders')
	const reportsCollections = client.db('furnitureCollection').collection('reports')
	const paymentsCollection = client.db('furnitureCollection').collection('payments')

	// verify admin 
	const verifyAdmin = async (req, res, next) => {
		const decodedEmail = req.decoded.email
		const query = { email: decodedEmail }
		const user = await usersCollections.findOne(query)

		if (user?.role !== 'Admin') {
			return res.status(403).send({ message: 'forbidden access' })
		}
		next()
	}
	// verify seller 
	const verifySeller = async (req, res, next) => {
		const decodedEmail = req.decoded.email
		const query = { email: decodedEmail }
		const user = await usersCollections.findOne(query)

		if (user?.role !== 'seller') {
			return res.status(403).send({ message: 'forbidden access' })
		}
		next()
	}
	// verify buyer 
	const verifyBuyer = async (req, res, next) => {
		const decodedEmail = req.decoded.email
		const query = { email: decodedEmail }
		const user = await usersCollections.findOne(query)

		if (user?.role !== 'buyer') {
			return res.status(403).send({ message: 'forbidden access' })
		}
		next()
	}
	try {

		//   here is post method starts
		// payment option
		app.post("/create-payment-intent", async (req, res) => {
			const order = req.body;
			console.log(order);
			const price = order.price;
			const amount = price * 100;
			// console.log(price);
			const paymentIntent = await stripe.paymentIntents.create({
				currency: "usd",
				amount: amount,
				payment_method_types: ["card"],
			});
			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		});

		app.post("/payments", async (req, res) => {
			const payment = req.body;
			const result = await paymentsCollection.insertOne(payment);
			const id = payment.order;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					paid: true,
					transactionId: payment.transactionId,
				},
			};
			const updatedResult = await ordersCollections.updateOne(
				filter,
				updatedDoc
			);
			res.send(result);
		});

//   here is post method start
		// payment option 
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

		app.post('/furnitures', async (req, res) => {
			const product = req.body
			const result = await furnitureCollections.insertOne(product)
			res.send(result)
		})
		app.post('/users', async (req, res) => {
			const user = req.body
			const query = { email: user.email }
			const alreadyUser = await usersCollections.findOne(query)
			if (alreadyUser) {
				return res.send({ acknowledged: true })
			}
			const result = await usersCollections.insertOne(user)
			console.log(user);
			res.send(result)

		})
		app.post('/reports', async (req, res) => {
			const report = req.body
			const result = await reportsCollections.insertOne(report)
			res.send(result)
		})
		//   here is post method ends

		//   here is get method starts 
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

		app.get('/users/admin/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email }
			const user = await usersCollections.findOne(query);
			res.send({ isAdmin: user?.role === 'Admin' });
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
		app.get('/users/sellers', verifyJWT, verifyAdmin, async (req, res) => {
			const email = req.query.email;
			const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res.status(403).send({ message: 'forbidden access' });
			}
			const sellers = await usersCollections.find({}).toArray()
			const seller = sellers.filter(seller => seller.role === 'seller')
			res.send(seller)
		})
		app.get('/users/buyers', verifyJWT, verifyAdmin, async (req, res) => {
			const email = req.query.email;
			const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res.status(403).send({ message: 'forbidden access' });
			}
			const sellers = await usersCollections.find({}).toArray()
			const seller = sellers.filter(seller => seller.role === 'buyer')
			res.send(seller)
		})

		app.get('/user/:email', verifyJWT, async (req, res) => {
			const email = req.params.email
			const query = { email: email }
			const result = await usersCollections.findOne(query)
			res.send(result)
		})
		app.get('/users/seller/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email }
			const user = await usersCollections.findOne(query);
			res.send({ isSeller: user?.role === 'seller' });
		})
		app.get('/users/buyer/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email }
			const user = await usersCollections.findOne(query);
			res.send({ isBuyer: user?.role === 'buyer' });
		})

		app.get('/categories', async (req, res) => {
			const query = {}
			const result = await categoriesCollections.find(query).toArray()
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
		app.get('/furnitures/seller/:email', verifyJWT, verifySeller, async (req, res) => {
			const email = req.params.email
			const query = { sellerEmail: email }
			const result = await furnitureCollections.find(query).toArray()
			res.send(result)
		})
		app.get('/advertiseFurnitures', async (req, res) => {
			const furnitures = await furnitureCollections.find({}).toArray()
			const filter = furnitures.filter(furniture => furniture.Status === 'Approved')
			res.send(filter)
		})
		app.get('/categoriesProducts/:id', async (req, res) => {
			const { id } = req.params
			const query = { categoryName: id }
			const result = await furnitureCollections.find(query).toArray()
			res.send(result)
		})
		app.get('/orders/:email', verifyJWT, async (req, res) => {
			const email = req.params.email
			const query = { buyerEmail: email }
			const result = await ordersCollections.find(query).toArray()
			res.send(result)
		})
		app.get('/singleOrder/:id', async (req, res) => {
			const id = req.params.id
			const query = { _id: ObjectId(id) }
			const result = await ordersCollections.findOne(query)
			res.send(result)
		})
		app.get('/reports', verifyJWT, verifyAdmin, async (req, res) => {
			const query = {}
			const result = await reportsCollections.find(query).toArray()
			res.send(result)
		})

		//   here is get method ends

		//   here is put method starts
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
		//   here is put method ends  

		//   here is delete method starts
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
		app.delete('/furnitures/:id', verifyJWT, verifyAdmin, async (req, res) => {
			const id = req.params.id
			const query = { _id: ObjectId(id) }
			const result = await furnitureCollections.deleteOne(query)
			res.send(result)
		})
		app.delete('/furnitures/seller/:id', verifyJWT, verifySeller, async (req, res) => {
			const { id } = req.params
			const query = { _id: ObjectId(id) }
			const result = await furnitureCollections.deleteOne(query)
			res.send(result)
		})
		app.delete('/orders/:id', verifyJWT, async (req, res) => {
			const { id } = req.params
			const query = { _id: ObjectId(id) }
			const result = await ordersCollections.deleteOne(query)
			res.send(result)
		})
		app.delete('/reports/:id', verifyJWT, verifyAdmin, async (req, res) => {
			const { id } = req.params
			const query = { _id: ObjectId(id) }
			const result = await reportsCollections.deleteOne(query)
			res.send(result)
		})
		//   here is delete method ends
		
	} finally {
		err => {
			console.log(err);
		}
	}
}
run().catch(err => {
	console.log(err);
});
