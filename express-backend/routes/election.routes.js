const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  Ballot,
  Question,
  Choice,
  Voter,
  Vote,
} = require("../models/ballot.model");
const { User } = require("../models/user.model");
const { protect, optionalVoterAuth } = require("../middleware/auth.middleware");
const { sequelize } = require("../database/connection");

const router = express.Router();

/**
 * Get election summary
 * @route GET /api/elections/summary
 * @access Public (with optional voter auth)
 */
router.get("/summary", optionalVoterAuth, async (req, res) => {
  try {
    // Handle different authentication contexts
    let userId;
    if (req.user) {
      userId = req.user.id;
    } else if (req.voter) {
      console.log(`Voter ${req.voter.id} accessing election summary`);
      // For voters without admin privileges, return a simplified summary
      return res.status(200).json({
        status: "success",
        data: {
          // Default values for non-admin users
          total_ballots: 0,
          active_ballots: 0,
          scheduled_ballots: 0,
          completed_ballots: 0,
          total_voters: 0,
          total_votes: 0,
          isAuthenticated: true,
          role: "voter",
        },
      });
    } else {
      console.log("Unauthenticated user accessing election summary");
      // For unauthenticated users, return a public summary
      return res.status(200).json({
        status: "success",
        data: {
          // Default values for unauthenticated users
          total_ballots: 0,
          active_ballots: 0,
          scheduled_ballots: 0,
          completed_ballots: 0,
          total_voters: 0,
          total_votes: 0,
          isAuthenticated: false,
          role: "public",
        },
      });
    }

    // Get summary of user's ballots - only if admin user
    const summary = await sequelize.query(
      `
      SELECT 
        COUNT(*) as total_ballots,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_ballots,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_ballots,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_ballots,
        SUM("totalVoters") as total_voters,
        SUM("ballotsReceived") as total_votes
      FROM ballots
      WHERE "createdBy" = :userId
    `,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Add authentication info to the response
    const result = {
      ...summary[0],
      isAuthenticated: true,
      role: "admin",
    };

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error getting election summary:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get election summary",
    });
  }
});

/**
 * Get recent elections
 * @route GET /api/elections/recent
 * @access Public (with optional voter auth)
 */
router.get("/recent", optionalVoterAuth, async (req, res) => {
  try {
    // Get user's recent ballots - check for user or voter contexts
    let userId;
    if (req.user) {
      userId = req.user.id;
    } else if (req.voter) {
      // If voter is authenticated, still show regular elections list
      // This path is for voter context, which may have different access patterns
      console.log(`Voter ${req.voter.id} accessing elections list`);
    } else {
      console.log("Unauthenticated user accessing elections list");
    }

    // Use userId filter only if we have an admin user
    let whereClause = {};
    if (userId) {
      whereClause.createdBy = userId;
    }

    // For unauthenticated or voter users, show only public/active ballots
    if (!userId) {
      whereClause.status = "active";
    }

    const recentBallots = await Ballot.findAll({
      where: whereClause,
      order: [["updatedAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
      attributes: [
        "id",
        "title",
        "description",
        "status",
        "startDate",
        "endDate",
        "totalVoters",
        "ballotsReceived",
        "allowedVoters",
        "createdAt",
        "updatedAt",
      ],
    });

    const processedBallots = recentBallots.map((ballot) => {
      const ballotData = ballot.toJSON();

      ballotData.total_voters = ballotData.totalVoters;
      ballotData.ballots_received = ballotData.ballotsReceived;
      ballotData.start_date = ballotData.startDate;
      ballotData.end_date = ballotData.endDate;

      if (
        ballotData.allowedVoters !== undefined &&
        ballotData.allowedVoters > 0
      ) {
        console.log(
          `Election ${ballotData.id}: Using allowedVoters (${ballotData.allowedVoters})`
        );
        ballotData.voterCount = ballotData.allowedVoters;
        ballotData.maxVoters = ballotData.allowedVoters;
      } else {
        const defaultValue = Math.max(ballotData.totalVoters || 0, 10);
        console.log(
          `Election ${ballotData.id}: Setting default allowedVoters (${defaultValue})`
        );
        ballotData.allowedVoters = defaultValue;
        ballotData.voterCount = defaultValue;
        ballotData.maxVoters = defaultValue;
      }

      return ballotData;
    });

    res.status(200).json({
      status: "success",
      data: processedBallots,
    });
  } catch (error) {
    console.error("Error getting recent elections:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get recent elections",
    });
  }
});

/**
 * Get upcoming elections
 * @route GET /api/elections/upcoming
 * @access Public (with optional voter auth)
 */
router.get("/upcoming", optionalVoterAuth, async (req, res) => {
  try {
    // Get user's upcoming ballots - check for user or voter contexts
    let userId;
    if (req.user) {
      userId = req.user.id;
    } else if (req.voter) {
      // If voter is authenticated, still show regular elections list
      // This path is for voter context, which may have different access patterns
      console.log(`Voter ${req.voter.id} accessing upcoming elections list`);
    } else {
      console.log("Unauthenticated user accessing upcoming elections list");
    }

    const now = new Date();

    // Add proper error handling for sequelize operators
    let whereClause = {
      status: "scheduled",
    };

    // Use userId filter only if we have an admin user
    if (userId) {
      whereClause.createdBy = userId;
    }

    // Only add startDate condition if sequelize.Op is defined
    if (sequelize.Op && sequelize.Op.gt) {
      whereClause.startDate = { [sequelize.Op.gt]: now };
    }

    const upcomingBallots = await Ballot.findAll({
      where: whereClause,
      order: [["startDate", "ASC"]],
      limit: 5,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
      // Explicitly include allowedVoters in the attributes
      attributes: [
        "id",
        "title",
        "description",
        "status",
        "startDate",
        "endDate",
        "totalVoters",
        "ballotsReceived",
        "allowedVoters",
        "createdAt",
        "updatedAt",
      ],
    });

    // Process the ballots to ensure correct data for display
    const processedBallots = upcomingBallots.map((ballot) => {
      const ballotData = ballot.toJSON();

      // Add snake_case versions for frontend compatibility
      ballotData.total_voters = ballotData.totalVoters;
      ballotData.ballots_received = ballotData.ballotsReceived;
      ballotData.start_date = ballotData.startDate;
      ballotData.end_date = ballotData.endDate;

      // CRITICAL: Ensure the admin-set voter count fields are properly set
      if (
        ballotData.allowedVoters !== undefined &&
        ballotData.allowedVoters > 0
      ) {
        console.log(
          `Election ${ballotData.id}: Using allowedVoters (${ballotData.allowedVoters})`
        );
        ballotData.voterCount = ballotData.allowedVoters;
        ballotData.maxVoters = ballotData.allowedVoters;
      }
      // If no allowedVoters but we have totalVoters, set a reasonable default
      else {
        const defaultValue = Math.max(ballotData.totalVoters || 0, 10);
        console.log(
          `Election ${ballotData.id}: Setting default allowedVoters (${defaultValue})`
        );
        ballotData.allowedVoters = defaultValue;
        ballotData.voterCount = defaultValue;
        ballotData.maxVoters = defaultValue;
      }

      return ballotData;
    });

    res.status(200).json({
      status: "success",
      data: processedBallots,
    });
  } catch (error) {
    console.error("Error getting upcoming elections:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get upcoming elections",
    });
  }
});

/**
 * Get election status
 * @route GET /api/elections/status
 * @access Public (with optional voter auth)
 */
router.get("/status", optionalVoterAuth, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Election ID is required",
      });
    }

    // Get ballot status
    const ballot = await Ballot.findOne({
      where: { id },
      attributes: [
        "id",
        "status",
        "startDate",
        "endDate",
        "totalVoters",
        "ballotsReceived",
        "createdBy",
      ],
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Election not found",
      });
    }

    // Check if user has access to this ballot (only for sensitive data)
    const userHasAccess = req.user && ballot.createdBy === req.user.id;
    const isVoter = !!req.voter;

    // If neither admin user nor voter, only return public info
    if (!userHasAccess && !isVoter && ballot.status !== "active") {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this election",
      });
    }

    // Update status based on dates
    const now = new Date();

    if (ballot.status === "scheduled" && ballot.startDate <= now) {
      ballot.status = "active";
      // Only save if user has access
      if (userHasAccess) {
        await ballot.save();
      }
    } else if (ballot.status === "active" && ballot.endDate <= now) {
      ballot.status = "completed";
      // Only save if user has access
      if (userHasAccess) {
        await ballot.save();
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        id: ballot.id,
        status: ballot.status,
        startDate: ballot.startDate,
        endDate: ballot.endDate,
        totalVoters: ballot.totalVoters,
        ballotsReceived: ballot.ballotsReceived,
        participationRate:
          ballot.totalVoters > 0
            ? (ballot.ballotsReceived / ballot.totalVoters) * 100
            : 0,
        // Only include creator info if user has access
        createdBy: userHasAccess ? ballot.createdBy : undefined,
        accessLevel: userHasAccess ? "admin" : isVoter ? "voter" : "public",
      },
    });
  } catch (error) {
    console.error("Error getting election status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get election status",
    });
  }
});

/**
 * Start election
 * @route POST /api/elections/start
 * @access Private
 */
router.post("/start", protect, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Election ID is required",
      });
    }

    // Get ballot
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Election not found",
      });
    }

    // Check if user has access to this ballot
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to start this election",
      });
    }

    // Check if ballot can be started
    if (ballot.status !== "draft" && ballot.status !== "scheduled") {
      return res.status(400).json({
        status: "error",
        message: `Election cannot be started from ${ballot.status} status`,
      });
    }

    // Update ballot status
    ballot.status = "active";
    ballot.startDate = new Date();
    await ballot.save();

    res.status(200).json({
      status: "success",
      message: "Election started successfully",
      data: ballot,
    });
  } catch (error) {
    console.error("Error starting election:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to start election",
    });
  }
});

/**
 * End election
 * @route POST /api/elections/end
 * @access Private
 */
router.post("/end", protect, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Election ID is required",
      });
    }

    // Get ballot
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Election not found",
      });
    }

    // Check if user has access to this ballot
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to end this election",
      });
    }

    // Check if ballot can be ended
    if (ballot.status !== "active") {
      return res.status(400).json({
        status: "error",
        message: `Election cannot be ended from ${ballot.status} status`,
      });
    }

    // Update ballot status
    ballot.status = "completed";
    ballot.endDate = new Date();
    await ballot.save();

    res.status(200).json({
      status: "success",
      message: "Election ended successfully",
      data: ballot,
    });
  } catch (error) {
    console.error("Error ending election:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to end election",
    });
  }
});

module.exports = router;
