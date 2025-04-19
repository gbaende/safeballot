/**
 * Database seed script
 * - Creates test data including users, ballots, questions, choices, voters, and votes
 * - Run with: node database/seed.js
 */

require("dotenv").config();
const { sequelize } = require("./connection");
const User = require("../models/user.model");
const Ballot = require("../models/ballot.model");
const Question = require("../models/question.model");
const Choice = require("../models/choice.model");
const Voter = require("../models/voter.model");
const Vote = require("../models/vote.model");
const bcrypt = require("bcryptjs");

const seed = async () => {
  try {
    console.log("Starting database seed...");

    // Connect to database
    await sequelize.authenticate();
    console.log("Connected to database");

    // Sync models with database
    await sequelize.sync({ force: true });
    console.log("Database synced");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "admin",
    });
    console.log("Admin user created");

    // Create test user
    const userPassword = await bcrypt.hash("password123", 10);
    const user = await User.create({
      name: "Test User",
      email: "user@example.com",
      password: userPassword,
      role: "user",
    });
    console.log("Test user created");

    // Create test ballot
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1); // Started yesterday

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 6); // Ends in 6 days

    const ballot = await Ballot.create({
      title: "Test Election 2024",
      description: "This is a test election with seed data",
      status: "active",
      startDate,
      endDate,
      isPublic: true,
      requiresVerification: false,
      verificationMethod: "email",
      createdBy: admin.id,
      totalVoters: 0, // Will be updated based on voters added
      ballotsReceived: 0, // Will be updated based on votes cast
    });
    console.log("Test ballot created");

    // Create questions
    const question1 = await Question.create({
      title: "Presidential Candidate",
      description: "Choose your preferred presidential candidate",
      ballotId: ballot.id,
      order: 0,
      required: true,
    });

    const question2 = await Question.create({
      title: "Vice Presidential Candidate",
      description: "Choose your preferred vice presidential candidate",
      ballotId: ballot.id,
      order: 1,
      required: true,
    });
    console.log("Test questions created");

    // Create choices for question 1
    const q1choices = await Promise.all([
      Choice.create({
        text: "John Smith",
        questionId: question1.id,
        order: 0,
        party: "Blue Party",
      }),
      Choice.create({
        text: "Jane Doe",
        questionId: question1.id,
        order: 1,
        party: "Red Party",
      }),
      Choice.create({
        text: "Sam Wilson",
        questionId: question1.id,
        order: 2,
        party: "Green Party",
      }),
    ]);

    // Create choices for question 2
    const q2choices = await Promise.all([
      Choice.create({
        text: "Sarah Johnson",
        questionId: question2.id,
        order: 0,
        party: "Blue Party",
      }),
      Choice.create({
        text: "Michael Brown",
        questionId: question2.id,
        order: 1,
        party: "Red Party",
      }),
      Choice.create({
        text: "Emily Davis",
        questionId: question2.id,
        order: 2,
        party: "Green Party",
      }),
    ]);
    console.log("Test choices created");

    // Create test voters (10 voters)
    const voters = [];
    for (let i = 1; i <= 10; i++) {
      const voter = await Voter.create({
        email: `voter${i}@example.com`,
        name: `Voter ${i}`,
        ballotId: ballot.id,
        verificationCode: Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase(),
        isVerified: true,
        hasVoted: i <= 7, // First 7 voters have voted
      });
      voters.push(voter);
    }
    console.log("10 test voters created");

    // Update ballot totalVoters count
    ballot.totalVoters = voters.length;
    await ballot.save();
    console.log("Updated ballot totalVoters count");

    // Create votes (7 of the 10 voters have voted)
    // Distribution:
    // Question 1: 4 votes for choice 1, 2 votes for choice 2, 1 vote for choice 3
    // Question 2: 3 votes for choice 1, 3 votes for choice 2, 1 vote for choice 3

    // Create votes for first question
    await Promise.all([
      // 4 votes for first choice
      Vote.create({
        voterId: voters[0].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[0].id,
      }),
      Vote.create({
        voterId: voters[1].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[0].id,
      }),
      Vote.create({
        voterId: voters[2].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[0].id,
      }),
      Vote.create({
        voterId: voters[3].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[0].id,
      }),

      // 2 votes for second choice
      Vote.create({
        voterId: voters[4].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[1].id,
      }),
      Vote.create({
        voterId: voters[5].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[1].id,
      }),

      // 1 vote for third choice
      Vote.create({
        voterId: voters[6].id,
        ballotId: ballot.id,
        questionId: question1.id,
        choiceId: q1choices[2].id,
      }),
    ]);

    // Create votes for second question
    await Promise.all([
      // 3 votes for first choice
      Vote.create({
        voterId: voters[0].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[0].id,
      }),
      Vote.create({
        voterId: voters[1].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[0].id,
      }),
      Vote.create({
        voterId: voters[2].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[0].id,
      }),

      // 3 votes for second choice
      Vote.create({
        voterId: voters[3].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[1].id,
      }),
      Vote.create({
        voterId: voters[4].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[1].id,
      }),
      Vote.create({
        voterId: voters[5].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[1].id,
      }),

      // 1 vote for third choice
      Vote.create({
        voterId: voters[6].id,
        ballotId: ballot.id,
        questionId: question2.id,
        choiceId: q2choices[2].id,
      }),
    ]);
    console.log("Test votes created");

    // Update ballot ballotsReceived count
    ballot.ballotsReceived = 7; // 7 voters have voted
    await ballot.save();
    console.log("Updated ballot ballotsReceived count");

    console.log("Database seed completed successfully!");
    console.log("\nTest Login Credentials:");
    console.log("Admin: admin@example.com / admin123");
    console.log("User: user@example.com / password123");
    console.log("\nTest Ballot ID:", ballot.id);
    console.log("Number of voters:", voters.length);
    console.log("Number of votes cast:", 7);

    // Disconnect from database
    await sequelize.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function if this script is run directly
if (require.main === module) {
  seed().then(() => {
    process.exit(0);
  });
}

module.exports = seed;
