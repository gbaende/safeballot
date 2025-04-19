const express = require("express");
const { body, validationResult } = require("express-validator");
const { protectAdmin } = require("../middleware/auth.middleware");
const {
  Ballot,
  Question,
  Choice,
  Voter,
  Vote,
} = require("../models/ballot.model");
const { User } = require("../models/user.model");

const router = express.Router();

// Admin-only routes
router.use(protectAdmin);

/**
 * Get admin dashboard data
 * @route GET /api/admin/dashboard
 * @access Private (Admin only)
 */
router.get("/dashboard", async (req, res) => {
  try {
    // Get counts
    const [userCount, ballotCount, voterCount, voteCount] = await Promise.all([
      User.count(),
      Ballot.count(),
      Voter.count(),
      Vote.count(),
    ]);

    // Get recent ballots
    const recentBallots = await Ballot.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      data: {
        counts: {
          users: userCount,
          ballots: ballotCount,
          voters: voterCount,
          votes: voteCount,
        },
        recentBallots,
      },
    });
  } catch (error) {
    console.error("Error getting admin dashboard data:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get admin dashboard data",
    });
  }
});

/**
 * Emergency endpoint for direct database access (DEVELOPMENT ONLY)
 * @route GET /api/admin/direct-data
 * @access Private (Admin only)
 */
router.get("/direct-data", async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        status: "error",
        message: "This endpoint is only available in development environment",
      });
    }

    console.log("⚠️ EMERGENCY: Direct database access requested");
    const dataType = req.query.type || "ballots";

    let data;
    switch (dataType) {
      case "ballots":
        data = await Ballot.findAll({
          include: [
            {
              model: Question,
              as: "questions",
              include: [
                {
                  model: Choice,
                  as: "choices",
                },
              ],
            },
          ],
          order: [["updatedAt", "DESC"]],
        });
        console.log(`Returning ${data.length} ballots via emergency access`);
        break;

      case "voters":
        data = await Voter.findAll({
          order: [["createdAt", "DESC"]],
        });
        console.log(`Returning ${data.length} voters via emergency access`);
        break;

      case "users":
        data = await User.findAll({
          attributes: ["id", "email", "name", "role", "createdAt", "updatedAt"],
          order: [["createdAt", "DESC"]],
        });
        console.log(`Returning ${data.length} users via emergency access`);
        break;

      default:
        return res.status(400).json({
          status: "error",
          message: "Invalid data type requested",
        });
    }

    res.status(200).json({
      status: "success",
      message: "Emergency data access successful",
      data,
    });
  } catch (error) {
    console.error("Error in emergency data access:", error);
    res.status(500).json({
      status: "error",
      message: "Emergency data access failed",
    });
  }
});

module.exports = router;
