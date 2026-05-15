const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();
const uri = process.env.MONGO_DB_URI;
const app = express();
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

app.use(cors());
app.use(express.json());
const PORT = process.env.PORT;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  // if(authHeader==="logged in"){
  //   next();
  // } else{
  //   res.status(401).send({message:"Unauthorized"});
  // }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log("Token payload:", payload);
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("wanderlust");
    const destinationsCollection = db.collection("destinations");
    const bookingsCollection = db.collection("bookings");

    app.get("/featured", async (req, res) => {
      const result = await destinationsCollection.find().limit(4).toArray();
      res.send(result);
    });

    app.get("/destination", async (req, res) => {
      const result = await destinationsCollection.find().toArray();
      res.send(result);
    });
    app.get("/health", (req, res) => res.send("OK"));
    app.get("/destination/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await destinationsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    app.patch("/destination/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await destinationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.send(result);
    });

    app.delete("/destination/:id", async (req, res) => {
      const id = req.params;
      const result = await destinationsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/destination", async (req, res) => {
      const destinationData = req.body;
      console.log("Received destination data:", destinationData);
      const result = await destinationsCollection.insertOne(destinationData);
      res.send(result);
    });

    app.get("/booking/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection
        .find({ userId: userId })
        .toArray();
      res.send(result);
    });

    app.post("/booking", verifyToken, async (req, res) => {
      const bookingData = req.body;
      console.log("Received booking data:", bookingData);
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    });

    app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
