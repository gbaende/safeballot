const { MongoUser } = require("./models/mongo.models");
const { Voter } = require("./models/ballot.model");
const { User } = require("./models/user.model");
const bcrypt = require("bcryptjs");
const { connectDb, getDb } = require("./db/db");
const { generateOtpCode, saveOtp } = require("./utils/otpStore");
const models = require("./models/ballot.model");

// Connect to MongoDB
async function connectDatabases() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await connectDb();
    console.log("Connected to MongoDB");

    // Make sure Sequelize is connected
    console.log("Testing SQL connection...");
    if (models.sequelize) {
      await models.sequelize.authenticate();
      console.log("SQL connection working");
    } else {
      console.log("No sequelize instance found, skipping SQL connection test");
    }
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

// Test voter existence in SQL
async function checkSqlVoter(email) {
  try {
    console.log(`Checking SQL Voter with email: ${email}`);
    const voter = await Voter.findOne({ where: { email } });
    console.log("SQL Voter result:", voter ? "Found" : "Not found");
    if (voter) {
      console.log("Voter data:", {
        id: voter.id,
        email: voter.email,
        name: voter.name,
        ballotId: voter.ballotId,
      });
    }
    return voter;
  } catch (err) {
    console.error("SQL Voter query error:", err);
    return null;
  }
}

// Test voter existence in MongoDB
async function checkMongoUser(email) {
  try {
    console.log(`Checking MongoDB user with email: ${email}`);
    const mongoUser = await MongoUser.findOne({ email: email.toLowerCase() });
    console.log("MongoDB user result:", mongoUser ? "Found" : "Not found");
    if (mongoUser) {
      console.log("MongoDB user data:", {
        id: mongoUser._id,
        email: mongoUser.email,
        role: mongoUser.role,
        sqlId: mongoUser.sqlId,
      });
    }
    return mongoUser;
  } catch (err) {
    console.error("MongoDB query error:", err);
    return null;
  }
}

// Test SQL User existence
async function checkSqlUser(email) {
  try {
    console.log(`Checking SQL User with email: ${email}`);
    const user = await User.findOne({ where: { email } });
    console.log("SQL User result:", user ? "Found" : "Not found");
    if (user) {
      console.log("User data:", {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    }
    return user;
  } catch (err) {
    console.error("SQL User query error:", err);
    return null;
  }
}

// Test the process of creating a voter in MongoDB
async function createTestMongoVoter(email) {
  try {
    // First delete if exists
    const existingUser = await MongoUser.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      console.log(`Deleting existing MongoDB user with email: ${email}`);
      await MongoUser.deleteOne({ email: email.toLowerCase() });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash("password123", 12);
    const newUser = new MongoUser({
      email: email.toLowerCase(),
      name: "Test Voter",
      password: hashedPassword,
      role: "voter",
    });

    await newUser.save();
    console.log("Created test voter in MongoDB:", newUser._id.toString());

    return newUser;
  } catch (err) {
    console.error("Error creating test voter:", err);
    return null;
  }
}

// Test OTP generation
async function testOtpGeneration(userId, email) {
  try {
    console.log(`Generating OTP for user: ${userId}, email: ${email}`);
    const code = generateOtpCode();
    await saveOtp(userId, code, email);
    console.log(`Generated OTP: ${code}`);
    return code;
  } catch (err) {
    console.error("OTP generation error:", err);
    return null;
  }
}

// Main debug function
async function debugVoterLogin() {
  await connectDatabases();

  const testEmail = "test-voter@example.com";

  // Check if voter exists
  const sqlVoter = await checkSqlVoter(testEmail);
  const mongoUser = await checkMongoUser(testEmail);
  const sqlUser = await checkSqlUser(testEmail);

  // Create test voter if doesn't exist
  let testVoter = mongoUser;
  if (!testVoter) {
    testVoter = await createTestMongoVoter(testEmail);
  }

  // Test OTP generation
  if (testVoter) {
    const otp = await testOtpGeneration(
      testVoter._id.toString(),
      testVoter.email
    );
    console.log("Debug completed successfully");
  } else {
    console.log("Failed to find or create test voter");
  }

  // Close connections
  try {
    if (models.sequelize) {
      await models.sequelize.close();
      console.log("SQL connection closed");
    }

    // Close MongoDB - get the mongoose instance
    const mongoose = require("mongoose");
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (err) {
    console.error("Error closing connections:", err);
  }

  process.exit(0);
}

// Run the debug function
debugVoterLogin().catch((err) => {
  console.error("Debug script error:", err);
  process.exit(1);
});
