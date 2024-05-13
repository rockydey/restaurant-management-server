const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

// Build in middlewares
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://taste-treat-restaurant-auth.web.app",
      "https://taste-treat-restaurant-auth.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.omjblfo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Custom middlewares
const logger = (req, res, next) => {
  console.log("From logger", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // await client.connect();

    const foodsCollection = client.db("foodDB").collection("foods");
    const ordersCollection = client.db("foodDB").collection("orders");
    const feedbacksCollection = client.db("foodDB").collection("feedbacks");
    const usersCollection = client.db("foodDB").collection("users");

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    // Auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // Foods related api
    app.get("/user", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/food", async (req, res) => {
      const sort = { count: -1 };
      const result = await foodsCollection.find().sort(sort).limit(6).toArray();
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
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

    app.post("/foods", async (req, res) => {
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.send(result);
    });

    app.patch("/updateFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const userValue = req.body;
      const options = { upsert: true };
      const userUpdateValue = {
        $set: {
          food_name: userValue.food_name,
          food_category: userValue.food_category,
          price: userValue.price,
          quantity: userValue.quantity,
          origin: userValue.origin,
          description: userValue.description,
          food_image: userValue.food_image,
        },
      };
      const result = await foodsCollection.updateOne(
        query,
        userUpdateValue,
        options
      );
      res.send(result);
    });

    app.get("/myFoods", verifyToken, logger, async (req, res) => {
      const email = req.query.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { user_email: email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/searchFoods", async (req, res) => {
      const searchText = req.query.search;
      const query = { food_name: { $regex: new RegExp(searchText, "i") } };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/foodsCount", async (req, res) => {
      const count = await foodsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/orders", verifyToken, logger, async (req, res) => {
      const email = req.query.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { user_email: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/feedbacks", async (req, res) => {
      const result = await feedbacksCollection.find().toArray();
      res.send(result);
    });

    app.post("/feedbacks", async (req, res) => {
      const feedback = req.body;
      const result = await feedbacksCollection.insertOne(feedback);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
