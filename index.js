const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.omjblfo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const foodsCollection = client.db("foodDB").collection("foods");
    const ordersCollection = client.db("foodDB").collection("orders");

    app.get("/food", async (req, res) => {
      const sort = { count: -1 };
      const result = await foodsCollection.find().sort(sort).limit(6).toArray();
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      console.log("Pagination", req.query);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const skipPage = size * page;
      const result = await foodsCollection
        .find()
        .skip(skipPage)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const value = req.body;
      const updateValue = {
        $set: {
          quantity: value.quantity,
          count: value.count,
        },
      };
      const result = await foodsCollection.updateOne(
        query,
        updateValue,
        options
      );
      res.send(result);
    });

    app.get("/searchFoods", async (req, res) => {
      const searchText = req.query.search;
      console.log(searchText);
      const query = { food_name: { $regex: new RegExp(searchText, "i") } };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/foodsCount", async (req, res) => {
      const count = await foodsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Restaurant Server is Running!");
});
app.listen(port, () => {
  console.log("TasteTreat Server is Running on Port: ", port);
});
