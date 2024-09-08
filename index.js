const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = "your_jwt_secret"; // Should be in environment variable in production
const MONGO_URI =
  "mongodb+srv://counseling:bO6qaLKB2A8nvrgG@cluster0.vdnd9h4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// bO6qaLKB2A8nvrgG

// Middleware
app.use(cors());
app.use(express.json());

let db, collection;

// Connect to MongoDB Atlas
MongoClient.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((client) => {
    db = client.db("counselingDB");
    collection = db.collection("counselors");
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => console.error(error));

// Mocked admin credentials
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("admin123", 10);

// Middleware for verifying the admin JWT token
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Admin login
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === ADMIN_EMAIL &&
    bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)
  ) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid email or password" });
});

// Create a new counselor profile (Unverified by default)
app.post("/counselors", async (req, res) => {
  try {
    const counselor = { ...req.body, verified: false };
    const result = await collection.insertOne(counselor);
    res.status(201).json(result.ops[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create counselor profile" });
  }
});

// Get all verified counselor profiles
app.get("/counselors", async (req, res) => {
  try {
    const counselors = await collection.find({ verified: true }).toArray();
    res.json(counselors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch counselors" });
  }
});

// Get unverified counselor profiles (For admin only)
app.get("/counselors/unverified", authMiddleware, async (req, res) => {
  try {
    const counselors = await collection.find({ verified: false }).toArray();
    res.json(counselors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unverified counselors" });
  }
});

// Verify a counselor profile (For admin only)
app.patch("/counselors/verify/:id", authMiddleware, async (req, res) => {
  try {
    const counselorId = req.params.id;
    const result = await collection.updateOne(
      { _id: new ObjectId(counselorId) },
      { $set: { verified: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Counselor not found" });
    }

    res.json({ message: "Counselor verified successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify counselor profile" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
