const { MongoClient, ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load .env from current directory
dotenv.config();

// Connection URL - explicitly load from environment with fallback for localhost
const url = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "safeballot";

// Log the connection details (masking password for security)
const logConnectionUrl = url.includes("@")
  ? url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
  : url;
console.log(`MongoDB connection URL: ${logConnectionUrl}`);
console.log(`MongoDB database name: ${dbName}`);

// Create a new MongoClient with options
const client = new MongoClient(url, {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});

// Database connection
let db;

/**
 * Connect to MongoDB using the MongoDB native driver
 */
const connectDb = async () => {
  try {
    console.log("Attempting to connect to MongoDB using native driver...");
    await client.connect();
    console.log("Connected to MongoDB successfully!");
    db = client.db(dbName);

    // Also connect Mongoose
    await connectMongoose();

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    console.error("Connection details (sanitized):", {
      url: logConnectionUrl,
      dbName,
    });
    throw error;
  }
};

/**
 * Connect to MongoDB using Mongoose
 */
const connectMongoose = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log("Connecting Mongoose to MongoDB...");
      await mongoose.connect(url, {
        dbName,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Mongoose connected successfully!");
    } else {
      console.log("Mongoose already connected!");
    }
  } catch (error) {
    console.error("Error connecting Mongoose:", error);
    throw error;
  }
};

/**
 * Get database connection
 * @returns {Object} MongoDB database instance
 */
const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDb first.");
  }
  return db;
};

/**
 * Close database connection
 */
const closeDb = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("Mongoose connection closed");
    }

    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  } catch (error) {
    console.error("Error closing database connections:", error);
  }
};

/**
 * Create ObjectId from string
 * @param {string} id - String ID
 * @returns {ObjectId} MongoDB ObjectId
 */
const createObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid ID format: ${id}`);
  }
};

module.exports = {
  connectDb,
  getDb,
  closeDb,
  createObjectId,
  connectMongoose,
};
