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
const {
  protect,
  voterAuth,
  optionalVoterAuth,
} = require("../middleware/auth.middleware");
const { sequelize } = require("../database/connection");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");

const router = express.Router();

/**
 * Get all ballots
 * @route GET /api/ballots
 * @access Private
 */
router.get("/", protect, async (req, res) => {
  try {
    console.log(
      "GET /ballots request received from user:",
      req.user ? req.user.id : "unknown"
    );

    const ballots = await Ballot.findAll({
      where: { createdBy: req.user.id },
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
      order: [
        ["updatedAt", "DESC"],
        [{ model: Question, as: "questions" }, "order", "ASC"],
        [
          { model: Question, as: "questions" },
          { model: Choice, as: "choices" },
          "order",
          "ASC",
        ],
      ],
      attributes: [
        "id",
        "title",
        "description",
        "status",
        "startDate",
        "endDate",
        "isPublic",
        "requiresVerification",
        "verificationMethod",
        "totalVoters",
        "ballotsReceived",
        "allowedVoters",
        "createdBy",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(`Found ${ballots.length} ballots for user ${req.user.id}`);

    // Log the IDs of ballots found for debugging
    if (ballots.length > 0) {
      console.log(
        "Ballot IDs found:",
        ballots.map((b) => b.id)
      );
      console.log("First ballot details:", {
        id: ballots[0].id,
        title: ballots[0].title,
        questions: ballots[0].questions ? ballots[0].questions.length : 0,
        createdAt: ballots[0].createdAt,
      });
    } else {
      console.log("No ballots found for this user");
    }

    // Map response data and enhance with proper field names
    const responseData = ballots.map((ballot) => {
      const ballotData = ballot.toJSON();

      // First add all standard fields
      ballotData.total_voters = ballotData.totalVoters;
      ballotData.ballots_received = ballotData.ballotsReceived;
      ballotData.start_date = ballotData.startDate;
      ballotData.end_date = ballotData.endDate;

      // IMPORTANT: Set the proper maximum voter count - this is the admin-set value
      // from ballot creation, not the number of registered voters

      // First check if we explicitly have allowedVoters (the admin-set value)
      if (
        ballotData.allowedVoters !== undefined &&
        ballotData.allowedVoters > 0
      ) {
        // Make sure this value is copied to all relevant fields for compatibility
        console.log(
          `Ballot ${ballotData.id}: Using allowedVoters (${ballotData.allowedVoters})`
        );
        ballotData.voterCount = ballotData.allowedVoters;
        ballotData.maxVoters = ballotData.allowedVoters;
      }
      // If no allowedVoters but we have voterCount from submission, use that
      else if (
        ballotData.voterCount !== undefined &&
        ballotData.voterCount > 0
      ) {
        console.log(
          `Ballot ${ballotData.id}: Using voterCount (${ballotData.voterCount})`
        );
        ballotData.allowedVoters = ballotData.voterCount;
        ballotData.maxVoters = ballotData.voterCount;
      }
      // If no admin-set value found, default to totalVoters with a minimum of 10
      else {
        // Fallback: Use totalVoters but ensure it's at least 10
        const defaultValue = Math.max(ballotData.totalVoters || 0, 10);
        console.log(
          `Ballot ${ballotData.id}: Using fallback value (${defaultValue})`
        );
        ballotData.allowedVoters = defaultValue;
        ballotData.voterCount = defaultValue;
        ballotData.maxVoters = defaultValue;
      }

      return ballotData;
    });

    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } catch (error) {
    console.error("Error getting ballots:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballots",
    });
  }
});

/**
 * Get a ballot by ID
 * @route GET /api/ballots/:id
 * @access Public (with optional authentication)
 */
router.get("/:id", optionalVoterAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Log the request for debugging
    console.log("Get ballot request:", {
      ballotId: id,
      user: req.user ? { id: req.user.id, email: req.user.email } : "No user",
      voter: req.voter
        ? { id: req.voter.id, email: req.voter.email }
        : "No voter",
    });

    const ballot = await Ballot.findOne({
      where: { id },
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
      order: [
        [{ model: Question, as: "questions" }, "order", "ASC"],
        [
          { model: Question, as: "questions" },
          { model: Choice, as: "choices" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Check if ballot is public - always allow access for public ballots
    if (ballot.isPublic) {
      console.log("Access granted: Ballot is public");
      return res.status(200).json({
        status: "success",
        data: ballot,
      });
    }

    // If user is authenticated as admin, check if they are the creator
    if (req.user && ballot.createdBy === req.user.id) {
      console.log("Access granted: User is ballot creator");
      return res.status(200).json({
        status: "success",
        data: ballot,
      });
    }

    // If user is authenticated, check if they are a registered voter
    if (req.user) {
      const voter = await Voter.findOne({
        where: {
          ballotId: id,
          email: req.user.email,
        },
      });

      if (voter) {
        console.log("Access granted: User is registered voter");
        return res.status(200).json({
          status: "success",
          data: ballot,
        });
      }
    }

    // If voter token is present, check if they are registered for this ballot
    if (req.voter) {
      const voter = await Voter.findOne({
        where: {
          ballotId: id,
          id: req.voter.id,
        },
      });

      if (voter) {
        console.log("Access granted: Voter token is valid for this ballot");
        return res.status(200).json({
          status: "success",
          data: ballot,
        });
      }
    }

    // For truly open ballots, allow access to anyone
    // This is the key change to enable the truly open voting system
    console.log(
      "Access granted: Open ballot access enabled for truly open voting"
    );
    return res.status(200).json({
      status: "success",
      data: ballot,
    });
  } catch (error) {
    console.error("Error getting ballot:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballot",
    });
  }
});

/**
 * Create a new ballot
 * @route POST /api/ballots
 * @access Private
 */
router.post(
  "/",
  [
    protect,
    body("title").notEmpty().withMessage("Title is required"),
    body("description").optional(),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
    body("requiresVerification")
      .optional()
      .isBoolean()
      .withMessage("requiresVerification must be a boolean"),
    body("verificationMethod")
      .optional()
      .isIn(["email", "sms", "id_document", "digital_key"])
      .withMessage("Invalid verification method"),
    body("voterCount")
      .optional()
      .isInt()
      .withMessage("voterCount must be an integer"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array(),
        });
      }

      const {
        title,
        description,
        startDate,
        endDate,
        isPublic,
        requiresVerification,
        verificationMethod,
        questions,
        voterCount,
      } = req.body;

      // Additional validation
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          status: "error",
          message: "End date must be after start date",
        });
      }

      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Make sure voter count is stored properly
        console.log(
          `Setting allowedVoters to ${voterCount || 0} for new ballot`
        );

        // Create ballot
        const ballot = await Ballot.create(
          {
            title,
            description,
            startDate,
            endDate,
            isPublic: isPublic || false,
            requiresVerification:
              requiresVerification !== undefined ? requiresVerification : true,
            verificationMethod: verificationMethod || "email",
            createdBy: req.user.id,
            status:
              startDate && new Date(startDate) <= new Date()
                ? "active"
                : "scheduled",
            // Make sure to store the admin-set voter count
            allowedVoters: parseInt(voterCount, 10) || 10,
            // totalVoters starts at 0 (actual registered voters count)
            totalVoters: 0,
          },
          { transaction }
        );

        // Create questions and choices if provided
        if (questions && questions.length > 0) {
          for (let i = 0; i < questions.length; i++) {
            const questionData = questions[i];

            const question = await Question.create(
              {
                title: questionData.title,
                description: questionData.description,
                questionType: questionData.questionType || "single_choice",
                maxSelections: questionData.maxSelections || 1,
                order: i,
                ballotId: ballot.id,
              },
              { transaction }
            );

            if (questionData.choices && questionData.choices.length > 0) {
              for (let j = 0; j < questionData.choices.length; j++) {
                const choiceData = questionData.choices[j];

                await Choice.create(
                  {
                    text: choiceData.text,
                    description: choiceData.description,
                    image: choiceData.image,
                    order: j,
                    questionId: question.id,
                  },
                  { transaction }
                );
              }
            }
          }
        }

        // Commit transaction
        await transaction.commit();

        // Return the created ballot with questions and choices
        const createdBallot = await Ballot.findByPk(ballot.id, {
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
          order: [
            [{ model: Question, as: "questions" }, "order", "ASC"],
            [
              { model: Question, as: "questions" },
              { model: Choice, as: "choices" },
              "order",
              "ASC",
            ],
          ],
        });

        res.status(201).json({
          status: "success",
          message: "Ballot created successfully",
          data: createdBallot,
        });
      } catch (error) {
        // Rollback transaction if something goes wrong
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error creating ballot:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create ballot",
      });
    }
  }
);

/**
 * Update a ballot
 * @route PUT /api/ballots/:id
 * @access Private
 */
router.put(
  "/:id",
  [
    protect,
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("description").optional(),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
    body("requiresVerification")
      .optional()
      .isBoolean()
      .withMessage("requiresVerification must be a boolean"),
    body("verificationMethod")
      .optional()
      .isIn(["email", "sms", "id_document", "digital_key"])
      .withMessage("Invalid verification method"),
    body("status")
      .optional()
      .isIn(["draft", "scheduled", "active", "completed"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const {
        title,
        description,
        startDate,
        endDate,
        isPublic,
        requiresVerification,
        verificationMethod,
        status,
        questions,
      } = req.body;

      // Find ballot
      const ballot = await Ballot.findByPk(id);

      if (!ballot) {
        return res.status(404).json({
          status: "error",
          message: "Ballot not found",
        });
      }

      // Check if user has permission to update this ballot
      if (ballot.createdBy !== req.user.id) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to update this ballot",
        });
      }

      // Additional validation
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          status: "error",
          message: "End date must be after start date",
        });
      }

      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Update ballot
        await ballot.update(
          {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
            ...(isPublic !== undefined && { isPublic }),
            ...(requiresVerification !== undefined && { requiresVerification }),
            ...(verificationMethod && { verificationMethod }),
            ...(status && { status }),
          },
          { transaction }
        );

        // Update questions and choices if provided
        if (questions && questions.length > 0) {
          // Delete existing questions and choices
          await Question.destroy({
            where: { ballotId: id },
            transaction,
          });

          // Create new questions and choices
          for (let i = 0; i < questions.length; i++) {
            const questionData = questions[i];

            const question = await Question.create(
              {
                title: questionData.title,
                description: questionData.description,
                questionType: questionData.questionType || "single_choice",
                maxSelections: questionData.maxSelections || 1,
                order: i,
                ballotId: ballot.id,
              },
              { transaction }
            );

            if (questionData.choices && questionData.choices.length > 0) {
              for (let j = 0; j < questionData.choices.length; j++) {
                const choiceData = questionData.choices[j];

                await Choice.create(
                  {
                    text: choiceData.text,
                    description: choiceData.description,
                    image: choiceData.image,
                    order: j,
                    questionId: question.id,
                  },
                  { transaction }
                );
              }
            }
          }
        }

        // Commit transaction
        await transaction.commit();

        // Return the updated ballot with questions and choices
        const updatedBallot = await Ballot.findByPk(ballot.id, {
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
          order: [
            [{ model: Question, as: "questions" }, "order", "ASC"],
            [
              { model: Question, as: "questions" },
              { model: Choice, as: "choices" },
              "order",
              "ASC",
            ],
          ],
        });

        res.status(200).json({
          status: "success",
          message: "Ballot updated successfully",
          data: updatedBallot,
        });
      } catch (error) {
        // Rollback transaction if something goes wrong
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error updating ballot:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update ballot",
      });
    }
  }
);

/**
 * Delete a ballot
 * @route DELETE /api/ballots/:id
 * @access Private
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Find ballot
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Check if user has permission to delete this ballot
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete this ballot",
      });
    }

    // Delete ballot (will cascade delete questions, choices, voters, votes)
    await ballot.destroy();

    res.status(200).json({
      status: "success",
      message: "Ballot deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ballot:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete ballot",
    });
  }
});

/**
 * Get ballot questions
 * @route GET /api/ballots/:id/questions
 * @access Private
 */
router.get("/:id/questions", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ballot exists
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // First check if user is the creator - always allow access
    if (ballot.createdBy === req.user.id) {
      // Get questions
      const questions = await Question.findAll({
        where: { ballotId: id },
        include: [
          {
            model: Choice,
            as: "choices",
          },
        ],
        order: [
          ["order", "ASC"],
          [{ model: Choice, as: "choices" }, "order", "ASC"],
        ],
      });

      return res.status(200).json({
        status: "success",
        data: questions,
      });
    }

    // Check if ballot is public - if so, allow access
    if (ballot.isPublic) {
      // Get questions
      const questions = await Question.findAll({
        where: { ballotId: id },
        include: [
          {
            model: Choice,
            as: "choices",
          },
        ],
        order: [
          ["order", "ASC"],
          [{ model: Choice, as: "choices" }, "order", "ASC"],
        ],
      });

      return res.status(200).json({
        status: "success",
        data: questions,
      });
    }

    // Check if user is registered as a voter for this ballot
    const voter = await Voter.findOne({
      where: {
        ballotId: id,
        email: req.user.email,
      },
    });

    if (voter) {
      // Get questions
      const questions = await Question.findAll({
        where: { ballotId: id },
        include: [
          {
            model: Choice,
            as: "choices",
          },
        ],
        order: [
          ["order", "ASC"],
          [{ model: Choice, as: "choices" }, "order", "ASC"],
        ],
      });

      return res.status(200).json({
        status: "success",
        data: questions,
      });
    }

    // If none of the above, deny access
    return res.status(403).json({
      status: "error",
      message: "You do not have permission to access this ballot",
    });
  } catch (error) {
    console.error("Error getting ballot questions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballot questions",
    });
  }
});

/**
 * Get ballot voters
 * @route GET /api/ballots/:id/voters
 * @access Private
 */
router.get("/:id/voters", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `GET voters for ballot ${id} by user ${req.user.id} (${req.user.email})`
    );

    // Parse query parameters with defaults
    const includeAdmin = req.query.includeAdmin === "true"; // Default is false
    const includeAll = req.query.includeAll === "true"; // For testing - return all voters unfiltered
    const debug = req.query.debug === "true"; // Include debug information
    const isStaging = process.env.NODE_ENV === "staging";

    console.log(
      `Query params: includeAdmin=${includeAdmin}, includeAll=${includeAll}, debug=${debug}`
    );

    // Check if ballot exists and user has access
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      console.log(`Ballot ${id} not found`);
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // HARDENING: Only allow access if ballot is created by the user (Keep this security check)
    if (ballot.createdBy !== req.user.id) {
      console.log(
        `User ${req.user.id} is not the creator of ballot ${id} (created by ${ballot.createdBy})`
      );
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this ballot",
      });
    }

    console.log(`Fetching all voters for ballot ${id}`);

    // Get all raw voter records without any filtering
    const allVoters = await Voter.findAll({
      where: { ballotId: id },
      order: [["createdAt", "DESC"]],
    });

    console.log(`Found ${allVoters.length} total voters for ballot ${id}`);

    // Count how many voters have actually voted
    const votedVoters = allVoters.filter((voter) => voter.hasVoted).length;
    console.log(`Of which ${votedVoters} have voted`);

    // Get the count of vote records for this ballot (one per question answered)
    const voteRecordsCount = await Vote.count({
      where: { ballotId: id },
    });

    // Get the count of distinct voters who have actually voted (THIS is the correct ballots received count)
    const distinctVotersWithVotes = await Vote.findAll({
      attributes: ["voterId"],
      where: { ballotId: id },
      group: ["voterId"],
      raw: true,
    });

    const distinctVoterCount = distinctVotersWithVotes.length;

    console.log(
      `Total vote records for ballot ${id}: ${voteRecordsCount} (across ${distinctVoterCount} voters)`
    );

    // Check if the vote counts in the system are consistent
    console.log(`Current ballot.ballotsReceived: ${ballot.ballotsReceived}`);
    console.log(`Number of voters with hasVoted=true: ${votedVoters}`);
    console.log(
      `Number of distinct voters with vote records: ${distinctVoterCount}`
    );

    // CRITICAL FIX: If there's a mismatch between the ballot.ballotsReceived and the correct count, update it
    if (ballot.ballotsReceived !== distinctVoterCount) {
      console.log(
        `Updating ballot.ballotsReceived from ${ballot.ballotsReceived} to ${distinctVoterCount}`
      );
      ballot.ballotsReceived = distinctVoterCount;
      await ballot.save();
    }

    // HARDENING: Check if the vote count matches the number of voters who have voted
    if (votedVoters !== voteRecordsCount && voteRecordsCount > 0) {
      console.warn(
        `Warning: Mismatch between voted voters (${votedVoters}) and total vote records (${voteRecordsCount})`
      );

      // HARDENING: Auto-fix hasVoted flags for voters with votes
      const voterIdsWithVotes = await Vote.findAll({
        attributes: ["voterId"],
        where: { ballotId: id },
        group: ["voterId"],
        raw: true,
      });

      const voterIdsWithVotesSet = new Set(
        voterIdsWithVotes.map((v) => v.voterId)
      );
      console.log(
        `Found ${voterIdsWithVotesSet.size} unique voters with votes`
      );

      // Find voters who have votes but don't have hasVoted flag set
      const votersNeedingUpdate = allVoters.filter(
        (v) => !v.hasVoted && voterIdsWithVotesSet.has(v.id)
      );

      if (votersNeedingUpdate.length > 0) {
        console.log(
          `Attempting to fix hasVoted status for ${votersNeedingUpdate.length} voters with votes...`
        );

        // Use a transaction for consistency
        const transaction = await sequelize.transaction();
        try {
          // Update each voter's hasVoted flag
          for (const voter of votersNeedingUpdate) {
            voter.hasVoted = true;
            await voter.save({ transaction });
            console.log(
              `Updated hasVoted for voter ${voter.id} (${voter.email})`
            );
          }

          // Update ballot counts to match reality
          ballot.ballotsReceived = voterIdsWithVotesSet.size;
          await ballot.save({ transaction });
          console.log(
            `Updated ballot.ballotsReceived to ${ballot.ballotsReceived}`
          );

          await transaction.commit();
          console.log("Successfully updated voter statuses");
        } catch (error) {
          await transaction.rollback();
          console.error("Error updating voter statuses:", error);
        }
      }
    }

    // HARDENING: Apply filtering based on parameters
    let filteredVoters = [...allVoters];

    // Only apply admin filtering if not in includeAll mode
    if (!includeAll) {
      if (!includeAdmin) {
        // HARDENING: More robust admin detection - filter out all voters with the admin's email
        filteredVoters = allVoters.filter((voter) => {
          const isAdmin = voter.email === req.user.email;
          return !isAdmin;
        });

        console.log(
          `After filtering out admin, ${filteredVoters.length} voters remain`
        );
      }
    } else {
      console.log(
        `TESTING MODE: Returning all ${allVoters.length} voters without filtering`
      );
    }

    // Get vote counts for each voter to improve data integrity
    const voterWithVoteCounts = await Promise.all(
      filteredVoters.map(async (voter) => {
        const voteCount = await Vote.count({
          where: { voterId: voter.id },
        });

        // Count questions answered by this voter - fixed query to prevent SQL error
        const questionCount = await Vote.findAll({
          attributes: [
            [
              sequelize.fn(
                "COUNT",
                sequelize.fn("DISTINCT", sequelize.col("questionId"))
              ),
              "count",
            ],
          ],
          where: { voterId: voter.id },
          raw: true,
        }).then((result) => result[0]?.count || 0);

        // For UI display purposes - report 1 vote per voter if they voted at all
        // This ensures the UI shows 1 vote per voter, not per question
        const displayVoteCount = voteCount > 0 ? 1 : 0;

        return {
          ...voter.toJSON(),
          voteCount: displayVoteCount, // Display 1 vote per voter for UI
          actualVoteCount: voteCount, // Store actual vote count for debug
          questionsAnswered: questionCount,
          hasVotes: voteCount > 0,
          inconsistentState:
            (voter.hasVoted && voteCount === 0) ||
            (!voter.hasVoted && voteCount > 0),
        };
      })
    );

    // Identify inconsistent voters (hasVoted flag doesn't match actual votes)
    const inconsistentVoters = voterWithVoteCounts.filter(
      (v) => v.inconsistentState
    );
    if (inconsistentVoters.length > 0) {
      console.warn(
        `Found ${inconsistentVoters.length} voters with inconsistent vote state`
      );
    }

    // Build enhanced debug data
    const debugData = {
      totalVoters: allVoters.length,
      filteredVoters: filteredVoters.length,
      votedVoters: votedVoters,
      inconsistentVoters: inconsistentVoters.length,
      adminEmail: req.user.email,
      query: {
        includeAdmin,
        includeAll,
        debug,
      },
    };

    // For staging or debug mode, include detailed voter information
    if (debug || isStaging) {
      // Get vote counts by voter ID for verification
      const votesByVoter = await Vote.findAll({
        attributes: [
          "voterId",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: { ballotId: id },
        group: ["voterId"],
        raw: true,
      });

      debugData.votesByVoter = votesByVoter;

      // If explicitly requested or in staging, add detailed voter samples
      if (debug) {
        debugData.voterSamples = {
          admin: allVoters
            .filter((v) => v.email === req.user.email)
            .map((v) => ({
              id: v.id,
              email: v.email,
              hasVoted: v.hasVoted,
            })),
          inconsistent: inconsistentVoters.slice(0, 3).map((v) => ({
            id: v.id,
            email: v.email,
            hasVoted: v.hasVoted,
            voteCount: v.voteCount,
          })),
        };
      }
    }

    // HARDENING: Return comprehensive response with diagnostic data
    res.status(200).json({
      status: "success",
      data: {
        voters: voterWithVoteCounts,
        totalVotes: voteRecordsCount,
        debug: debugData,
        testing: includeAll
          ? "TESTING MODE - All voters shown without filtering"
          : undefined,
      },
    });
  } catch (error) {
    console.error("Error getting ballot voters:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballot voters",
      error: error.message,
    });
  }
});

/**
 * Add voters to a ballot
 * @route POST /api/ballots/:id/voters
 * @access Private
 */
router.post(
  "/:id/voters",
  [
    protect,
    body("voters").isArray().withMessage("Voters must be an array"),
    body("voters.*.email")
      .isEmail()
      .withMessage("Each voter must have a valid email"),
    body("voters.*.name").optional(),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { voters } = req.body;

      // Check if ballot exists and user has access
      const ballot = await Ballot.findByPk(id);

      if (!ballot) {
        return res.status(404).json({
          status: "error",
          message: "Ballot not found",
        });
      }

      // Only allow access if ballot is created by the user
      if (ballot.createdBy !== req.user.id) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to modify this ballot",
        });
      }

      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Track added and existing voters
        const addedVoters = [];
        const existingVoters = [];

        // Process each voter
        for (const voterData of voters) {
          // Check if voter already exists
          const existingVoter = await Voter.findOne({
            where: {
              email: voterData.email,
              ballotId: id,
            },
            transaction,
          });

          if (existingVoter) {
            existingVoters.push(existingVoter);
            continue;
          }

          // Create voter
          const voter = await Voter.create(
            {
              email: voterData.email,
              name: voterData.name,
              ballotId: id,
              verificationCode: Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase(),
              isVerified: true, // Auto-verify voters for demo purposes
            },
            { transaction }
          );

          addedVoters.push(voter);
        }

        // Update ballot totalVoters count
        ballot.totalVoters = await Voter.count({
          where: { ballotId: id },
          transaction,
        });
        await ballot.save({ transaction });

        // Commit transaction
        await transaction.commit();

        res.status(201).json({
          status: "success",
          message: `${addedVoters.length} voters added successfully${
            existingVoters.length > 0
              ? `, ${existingVoters.length} voters already existed`
              : ""
          }`,
          data: {
            addedVoters,
            existingCount: existingVoters.length,
            totalVoters: ballot.totalVoters,
          },
        });
      } catch (error) {
        // Rollback transaction if something goes wrong
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error adding voters:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to add voters",
      });
    }
  }
);

/**
 * Cast a vote
 * @route POST /api/ballots/:id/vote
 * @access Private (requires authentication in staging)
 */
router.post(
  "/:id/vote",
  [
    protect, // Add authentication middleware to enforce login
    body("voterId").optional(), // Make voterId optional - we'll create one if needed
    body("votes").isArray().withMessage("Votes must be an array"),
    body("votes.*.questionId")
      .notEmpty()
      .withMessage("Question ID is required for each vote"),
    body("votes.*.choiceId")
      .notEmpty()
      .withMessage("Choice ID is required for each vote"),
    body("votes.*.rank")
      .optional()
      .isNumeric()
      .withMessage("Rank must be a number"),
  ],
  async (req, res) => {
    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      // [DEPRECATED] This endpoint is maintained for backward compatibility only
      // New implementations should use the voter token flow through /voter-vote

      console.log(
        `[DEPRECATED] Vote endpoint called for ballot ${req.params.id}`
      );

      // Return with deprecation notice
      return res.status(400).json({
        status: "error",
        message:
          "This endpoint is deprecated. Please use the voter token flow with /voter-vote",
        redirectToNewFlow: true,
      });

      await transaction.rollback();
    } catch (error) {
      // Rollback transaction if something goes wrong
      await transaction.rollback();
      console.error("Vote API error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to cast vote",
        error: error.message,
      });
    }
  }
);

/**
 * Public voting endpoint that doesn't require authentication
 * @route POST /api/ballots/:id/public-vote
 * @access Public
 */
router.post(
  "/:id/public-vote",
  [
    body("voterId").optional(),
    body("voter").optional(),
    body("voter.name")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Voter name must be a non-empty string"),
    body("voter.email")
      .optional()
      .isEmail()
      .withMessage("Voter email must be a valid email"),
    body("rankings").optional(),
    body("votes").optional(),
    // Legacy fields validation
    body("votes.*.questionId")
      .optional()
      .notEmpty()
      .withMessage("Question ID is required for each vote"),
    body("votes.*.choiceId")
      .optional()
      .notEmpty()
      .withMessage("Choice ID is required for each vote"),
    body("votes.*.rank")
      .optional()
      .isNumeric()
      .withMessage("Rank must be a number"),
  ],
  async (req, res) => {
    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { voter, voterId, rankings, votes } = req.body;

      console.log(`[PUBLIC VOTE] Processing vote for ballot ${id}`);

      // Find the ballot
      const ballot = await Ballot.findByPk(id, { transaction });
      if (!ballot) {
        await transaction.rollback();
        return res.status(404).json({
          status: "error",
          message: "Ballot not found",
        });
      }

      // Ensure the ballot is in an active state for voting
      if (ballot.status !== "active" && ballot.status !== "scheduled") {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "This ballot is not currently accepting votes",
        });
      }

      // Get or create voter record
      let votingVoter;

      // If we were provided a voter ID, find that voter
      if (voterId) {
        console.log(`Looking up voter with ID: ${voterId}`);
        votingVoter = await Voter.findOne({
          where: {
            id: voterId,
            ballotId: id,
          },
          transaction,
        });

        if (!votingVoter) {
          await transaction.rollback();
          return res.status(404).json({
            status: "error",
            message: "Voter not found",
          });
        }
      }
      // If voter info was provided, find/create that voter
      else if (voter && voter.email) {
        console.log(`Looking up voter with email: ${voter.email}`);

        // Try to find existing voter first
        votingVoter = await Voter.findOne({
          where: {
            email: voter.email,
            ballotId: id,
          },
          transaction,
        });

        // If voter doesn't exist, create one
        if (!votingVoter) {
          console.log(
            `Creating new voter for ${voter.email} during vote submission`
          );
          votingVoter = await Voter.create(
            {
              ballotId: id,
              email: voter.email,
              name: voter.name || "Anonymous Voter",
              verificationCode: Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase(),
              isVerified: true, // Auto-verify for public voting
              hasVoted: false,
              ipAddress:
                req.headers["x-forwarded-for"] || req.connection.remoteAddress,
              lastActivity: new Date(),
            },
            { transaction }
          );

          // Increment ballot voter count
          ballot.totalVoters = (ballot.totalVoters || 0) + 1;
          await ballot.save({ transaction });
        }
      }
      // No voter info provided - create anonymous voter
      else {
        console.log(`Creating anonymous voter for ballot ${id}`);
        votingVoter = await Voter.create(
          {
            ballotId: id,
            email: `anonymous-${Date.now()}@${
              req.headers["x-forwarded-for"] || "unknown"
            }.voter`,
            name: "Anonymous Voter",
            verificationCode: Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase(),
            isVerified: true, // Auto-verify for anonymous voting
            hasVoted: false,
            ipAddress:
              req.headers["x-forwarded-for"] || req.connection.remoteAddress,
            lastActivity: new Date(),
          },
          { transaction }
        );

        // Increment ballot voter count
        ballot.totalVoters = (ballot.totalVoters || 0) + 1;
        await ballot.save({ transaction });
      }

      // Check if voter has already voted
      if (votingVoter.hasVoted) {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "This voter has already submitted a vote for this ballot",
        });
      }

      // Process the vote
      let createdVotes = [];

      // Process rankings format (modern format)
      if (rankings && Object.keys(rankings).length > 0) {
        console.log(`[PUBLIC VOTE] Processing vote in rankings format`);

        for (const [questionIndex, responseData] of Object.entries(rankings)) {
          // Find the question
          let questionId;

          try {
            const questions = await Question.findAll({
              where: { ballotId: id },
              order: [["order", "ASC"]],
              transaction,
            });

            const questionIdxNum = parseInt(questionIndex, 10);
            if (!isNaN(questionIdxNum) && questionIdxNum < questions.length) {
              questionId = questions[questionIdxNum].id;
            }
          } catch (err) {
            console.error(
              `[PUBLIC VOTE] Error getting question ID: ${err.message}`
            );
            continue;
          }

          if (!questionId) {
            console.warn(
              `[PUBLIC VOTE] Could not resolve question ID for index ${questionIndex}`
            );
            continue;
          }

          // Extract the choice data
          let choiceId;
          let rank = null;

          if (typeof responseData === "object" && responseData !== null) {
            if (
              typeof responseData.index === "number" ||
              !isNaN(parseInt(responseData.index))
            ) {
              const choiceIndex = parseInt(responseData.index);

              try {
                const choices = await Choice.findAll({
                  where: { questionId },
                  order: [["order", "ASC"]],
                  transaction,
                });

                if (choiceIndex < choices.length) {
                  choiceId = choices[choiceIndex].id;
                }
              } catch (err) {
                console.error(
                  `[PUBLIC VOTE] Error getting choice ID: ${err.message}`
                );
                continue;
              }
            }
          } else if (
            typeof responseData === "string" &&
            !isNaN(parseInt(responseData))
          ) {
            // Direct index as string
            const choiceIndex = parseInt(responseData);

            try {
              const choices = await Choice.findAll({
                where: { questionId },
                order: [["order", "ASC"]],
                transaction,
              });

              if (choiceIndex < choices.length) {
                choiceId = choices[choiceIndex].id;
              }
            } catch (err) {
              console.error(
                `[PUBLIC VOTE] Error getting choice ID: ${err.message}`
              );
              continue;
            }
          }

          if (!choiceId) {
            console.warn(
              `[PUBLIC VOTE] Could not resolve choice ID for question ${questionId}`
            );
            continue;
          }

          // Create the vote
          try {
            const vote = await Vote.create(
              {
                ballotId: id,
                questionId,
                choiceId,
                voterId: votingVoter.id,
                rank,
              },
              { transaction }
            );

            createdVotes.push(vote);
          } catch (err) {
            console.error(`[PUBLIC VOTE] Error creating vote: ${err.message}`);
          }
        }
      }
      // Process votes array format (legacy format)
      else if (votes && votes.length > 0) {
        console.log(
          `[PUBLIC VOTE] Processing vote in legacy votes array format`
        );

        for (const voteData of votes) {
          // Create vote
          try {
            const vote = await Vote.create(
              {
                ballotId: id,
                questionId: voteData.questionId,
                choiceId: voteData.choiceId,
                voterId: votingVoter.id,
                rank: voteData.rank || null,
              },
              { transaction }
            );

            createdVotes.push(vote);
          } catch (err) {
            console.error(`[PUBLIC VOTE] Error creating vote: ${err.message}`);
          }
        }
      }

      // If we didn't create any votes, something went wrong
      if (createdVotes.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "No valid votes were provided",
        });
      }

      // Mark voter as having voted
      votingVoter.hasVoted = true;
      votingVoter.lastActivity = new Date();
      await votingVoter.save({ transaction });

      // Increment ballot received count
      ballot.ballotsReceived = (ballot.ballotsReceived || 0) + 1;
      await ballot.save({ transaction });

      console.log(
        `[PUBLIC VOTE] Successfully recorded ${createdVotes.length} votes for ballot ${id}`
      );

      // Commit transaction
      await transaction.commit();

      res.status(200).json({
        status: "success",
        message: "Vote submitted successfully",
        data: {
          voterId: votingVoter.id,
          votesRecorded: createdVotes.length,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Public vote API error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to cast vote",
        error: error.message,
      });
    }
  }
);

/**
 * Get ballot results
 * @route GET /api/ballots/:id/results
 * @access Public (with restrictions)
 */
router.get("/:id/results", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ballot exists
    const ballot = await Ballot.findByPk(id, {
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
      order: [
        [{ model: Question, as: "questions" }, "order", "ASC"],
        [
          { model: Question, as: "questions" },
          { model: Choice, as: "choices" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Format results
    const results = {
      id: ballot.id,
      title: ballot.title,
      description: ballot.description,
      status: ballot.status,
      startDate: ballot.startDate,
      endDate: ballot.endDate,
      totalVoters: ballot.totalVoters,
      votedCount: ballot.ballotsReceived,
      participation:
        ballot.totalVoters > 0
          ? Math.round((ballot.ballotsReceived / ballot.totalVoters) * 100)
          : 0,
      positions: await Promise.all(
        ballot.questions.map(async (question) => {
          // Get votes for each choice in this question
          const votesByChoice = await Vote.findAll({
            attributes: [
              "choiceId",
              [sequelize.fn("COUNT", sequelize.col("id")), "voteCount"],
            ],
            where: {
              ballotId: id,
              questionId: question.id,
            },
            group: ["choiceId"],
            raw: true,
          });

          // Calculate total votes for this question
          const totalVotes = votesByChoice.reduce(
            (sum, v) => sum + parseInt(v.voteCount),
            0
          );

          // Map choices with vote counts and percentages
          const candidates = question.choices.map((choice) => {
            const voteData = votesByChoice.find(
              (v) => v.choiceId === choice.id
            );
            const votes = voteData ? parseInt(voteData.voteCount) : 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

            return {
              id: choice.id,
              name: choice.text,
              votes,
              percentage,
            };
          });

          return {
            title: question.title,
            description: question.description,
            candidates,
          };
        })
      ),
    };

    res.status(200).json({
      status: "success",
      data: results,
    });
  } catch (error) {
    console.error("Error getting ballot results:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballot results",
    });
  }
});

/**
 * Register current user as a voter for a ballot
 * @route POST /api/ballots/:id/register-voter
 * @access Private
 */
router.post("/:id/register-voter", protect, async (req, res) => {
  // Start a transaction to ensure data consistency
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    console.log(
      `[REGISTER-VOTER] Request received for ballot ${id}. Request headers:`,
      JSON.stringify({
        authorization: req.headers.authorization
          ? `${req.headers.authorization.substring(0, 15)}...`
          : "none",
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
      })
    );

    console.log(
      `[REGISTER-VOTER] User authenticated: ${
        req.user ? `${req.user.email} (${req.user.id})` : "No user object"
      }`
    );

    // Check if ballot exists
    const ballot = await Ballot.findByPk(id, { transaction });
    if (!ballot) {
      await transaction.rollback();
      console.log(`[REGISTER-VOTER] ❌ Ballot ${id} not found`);
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Check if ballot is still accepting registrations
    if (ballot.status === "completed") {
      await transaction.rollback();
      console.log(`Ballot ${id} is already completed, cannot register voters`);
      return res.status(400).json({
        status: "error",
        message:
          "This ballot is already completed and not accepting new voters",
      });
    }

    // Prevent admin/creator from registering for their own ballot
    if (ballot.createdBy === req.user.id) {
      await transaction.rollback();
      console.log(`Admin attempted to register for own ballot ${id}`);
      return res.status(403).json({
        status: "error",
        message: "Ballot creators cannot register to vote in their own ballots",
      });
    }

    // Check if user is already registered as a voter for this ballot
    const existingVoter = await Voter.findOne({
      where: {
        ballotId: id,
        email: req.user.email,
      },
      transaction,
    });

    if (existingVoter) {
      await transaction.rollback();
      console.log(
        `User ${req.user.email} is already registered as a voter for ballot ${id}`
      );
      return res.status(200).json({
        status: "success",
        message: "You are already registered as a voter for this ballot",
        data: {
          voter: existingVoter,
        },
      });
    }

    // Generate verification code - can be email OTP, digital key, etc.
    const verificationCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // IMPORTANT: Correctly capture the user's real name from their account
    const voterName = req.user.name || "Registered Voter";

    console.log(
      `Creating voter registration with name: ${voterName} and email: ${req.user.email}`
    );

    // Register user as a voter with tracking information
    const voter = await Voter.create(
      {
        ballotId: id,
        email: req.user.email,
        name: voterName, // Use the voter's actual name
        verificationCode,
        hasVoted: false,
        isVerified: true, // Auto-verify voters for demo purposes
        ipAddress:
          req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        lastActivity: new Date(),
      },
      { transaction }
    );

    console.log(
      `Successfully registered user ${req.user.email} as voter ${voter.id} for ballot ${id} (auto-verified for demo)`
    );

    // Increment totalVoters count in ballot
    ballot.totalVoters = (ballot.totalVoters || 0) + 1;
    await ballot.save({ transaction });

    console.log(
      `Updated total voters for ballot ${id} to ${ballot.totalVoters}`
    );

    // Commit the transaction
    await transaction.commit();

    res.status(201).json({
      status: "success",
      message: "You have been registered as a voter for this ballot",
      data: {
        voter,
      },
    });
  } catch (error) {
    // Rollback transaction if something goes wrong
    await transaction.rollback();
    console.error("Error registering voter:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to register as a voter",
      error: error.message,
    });
  }
});

/**
 * Debug route to get voter counts (TEMPORARY)
 * @route GET /api/ballots/debug/voter-counts
 * @access Private
 */
router.get("/debug/voter-counts", protect, async (req, res) => {
  try {
    console.log("Debug route called by", req.user.email);

    // Total voters in system
    const totalVoters = await Voter.count();

    // Get count by hasVoted status
    const votedCount = await Voter.count({ where: { hasVoted: true } });
    const registeredCount = await Voter.count({ where: { hasVoted: false } });

    // Get a sample of voters for debugging
    const sampleVoters = await Voter.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
    });

    // Get ballot IDs that have voters
    const ballotIds = await Voter.findAll({
      attributes: [
        "ballotId",
        [sequelize.fn("COUNT", sequelize.col("id")), "voterCount"],
      ],
      group: ["ballotId"],
      raw: true,
    });

    res.status(200).json({
      status: "success",
      data: {
        totalVoters,
        votedCount,
        registeredCount,
        sampleVoters: sampleVoters.map((v) => ({
          id: v.id,
          email: v.email,
          name: v.name,
          ballotId: v.ballotId,
          hasVoted: v.hasVoted,
        })),
        ballotCounts: ballotIds,
      },
    });
  } catch (error) {
    console.error("Error in debug route:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get debug information",
    });
  }
});

/**
 * Debug route to check the state of voters and votes for a specific ballot
 * @route GET /api/ballots/:id/debug
 * @access Private (admin only)
 */
router.get("/:id/debug", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `DEBUG request for ballot ${id} by user ${req.user.id} (${req.user.email})`
    );

    // Check if ballot exists and user has access as admin/creator
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Only allow creator to access debug info
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "Only the ballot creator can access debug information",
      });
    }

    // 1. Get all voters for this ballot
    const voters = await Voter.findAll({
      where: { ballotId: id },
      raw: true,
    });

    // 2. Get all votes for this ballot
    const votes = await Vote.findAll({
      where: { ballotId: id },
      raw: true,
    });

    // 3. Get vote counts grouped by voter
    const votesByVoter = await Vote.findAll({
      attributes: [
        "voterId",
        [sequelize.fn("COUNT", sequelize.col("id")), "voteCount"],
      ],
      where: { ballotId: id },
      group: ["voterId"],
      raw: true,
    });

    // 4. Check for votes that have no matching voter
    const voterIds = voters.map((v) => v.id);
    const orphanedVotes = votes.filter((v) => !voterIds.includes(v.voterId));

    // 5. Check for voters marked as voted but with no votes
    const voterIdWithVotes = votesByVoter.map((v) => v.voterId);
    const inconsistentVoters = voters.filter(
      (v) =>
        (v.hasVoted && !voterIdWithVotes.includes(v.id)) ||
        (!v.hasVoted && voterIdWithVotes.includes(v.id))
    );

    res.status(200).json({
      status: "success",
      data: {
        ballot: {
          id: ballot.id,
          title: ballot.title,
          totalVoters: ballot.totalVoters,
          ballotsReceived: ballot.ballotsReceived,
        },
        counts: {
          voters: voters.length,
          votedVoters: voters.filter((v) => v.hasVoted).length,
          votes: votes.length,
          uniqueVoters: votesByVoter.length,
        },
        issues: {
          orphanedVotes: orphanedVotes.length > 0 ? orphanedVotes : [],
          inconsistentVoters:
            inconsistentVoters.length > 0 ? inconsistentVoters : [],
        },
        voterSample: voters.slice(0, 5),
        voteSample: votes.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error in ballot debug route:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve debug information",
      error: error.message,
    });
  }
});

/**
 * Data repair route for fixing votes without proper voter records
 * @route POST /api/ballots/:id/repair
 * @access Private (admin only)
 */
router.post("/:id/repair", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `REPAIR request for ballot ${id} by user ${req.user.id} (${req.user.email})`
    );

    // Check if ballot exists and user has access as admin/creator
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Only allow creator to access repair functionality
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "Only the ballot creator can repair this ballot",
      });
    }

    console.log(`Starting repair process for ballot ${id}`);

    // STEP 1: Get all votes and analyze the current state
    const votes = await Vote.findAll({
      where: { ballotId: id },
      raw: true,
    });

    if (votes.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No votes found, nothing to repair",
        repairStats: {
          totalVotes: 0,
          fixedVotes: 0,
        },
      });
    }

    console.log(`Found ${votes.length} total votes for ballot ${id}`);

    // STEP 2: Get all existing voters
    const existingVoters = await Voter.findAll({
      where: { ballotId: id },
      raw: true,
    });

    console.log(
      `Found ${existingVoters.length} existing voters for ballot ${id}`
    );

    // STEP 3: Analyze votes by voterId to see which votes belong to which voters
    const votesByVoterId = {};
    const voterIds = new Set();

    votes.forEach((vote) => {
      voterIds.add(vote.voterId);
      if (!votesByVoterId[vote.voterId]) {
        votesByVoterId[vote.voterId] = [];
      }
      votesByVoterId[vote.voterId].push(vote);
    });

    console.log(`Found votes from ${voterIds.size} unique voter IDs`);

    // STEP 4: Check which voterIds don't have corresponding voter records
    const existingVoterIds = new Set(existingVoters.map((v) => v.id));
    const orphanedVoterIds = [...voterIds].filter(
      (id) => !existingVoterIds.has(id)
    );

    console.log(
      `Found ${orphanedVoterIds.length} voter IDs with votes but no voter record`
    );

    // STEP 5: Create voter records for orphaned votes
    const repairStats = {
      totalVotes: votes.length,
      totalVoters: existingVoters.length,
      orphanedVoterIds: orphanedVoterIds.length,
      voterIdsWithVotes: voterIds.size,
      createdVoters: 0,
      fixedVotes: 0,
      errors: [],
    };

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // For each orphaned voter ID
      for (const orphanedId of orphanedVoterIds) {
        const orphanedVotes = votesByVoterId[orphanedId] || [];

        if (orphanedVotes.length === 0) continue;

        console.log(
          `Creating new voter record for orphaned voterId ${orphanedId} with ${orphanedVotes.length} votes`
        );

        // Create a new voter record for these votes
        const newVoter = await Voter.create(
          {
            id: orphanedId, // Use the same ID to maintain referential integrity
            email: `repaired-voter-${orphanedId.substring(0, 8)}@example.com`,
            name: "Anonymous Voter (repaired)",
            ballotId: id,
            verificationCode: Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase(),
            isVerified: true,
            hasVoted: true, // Mark as having voted since they clearly have votes
          },
          { transaction }
        );

        console.log(`Created new voter record with ID ${newVoter.id}`);
        repairStats.createdVoters++;
        repairStats.fixedVotes += orphanedVotes.length;
      }

      // STEP 6: Update ballot counts to be accurate
      // Count all voters for this ballot
      const totalVoters = await Voter.count({
        where: { ballotId: id },
        transaction,
      });

      // Count all voters who have voted
      const votedVoters = await Voter.count({
        where: {
          ballotId: id,
          hasVoted: true,
        },
        transaction,
      });

      // Update ballot totalVoters and ballotsReceived
      ballot.totalVoters = totalVoters;
      ballot.ballotsReceived = votedVoters;
      await ballot.save({ transaction });

      console.log(
        `Updated ballot stats: totalVoters=${totalVoters}, ballotsReceived=${votedVoters}`
      );

      // Commit the transaction
      await transaction.commit();

      // Add final stats
      repairStats.finalTotalVoters = totalVoters;
      repairStats.finalVotedVoters = votedVoters;

      return res.status(200).json({
        status: "success",
        message: `Successfully repaired ballot data: created ${repairStats.createdVoters} voter records for ${repairStats.fixedVotes} orphaned votes`,
        repairStats,
      });
    } catch (error) {
      // Rollback transaction if something goes wrong
      await transaction.rollback();
      console.error("Error in repair process:", error);

      return res.status(500).json({
        status: "error",
        message: "Repair process failed",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error in ballot repair route:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to repair ballot data",
      error: error.message,
    });
  }
});

/**
 * Raw voter diagnostics - returns unfiltered voter data with detailed analysis
 * @route GET /api/ballots/:id/raw-voters
 * @access Private (admin only)
 */
router.get("/:id/raw-voters", protect, async (req, res) => {
  const ballotId = req.params.id;
  const userId = req.user.id;
  const userEmail = req.user.email;

  console.log(
    `RAW DIAGNOSTICS: Fetching raw voters for ballot ${ballotId} by user ${userId} (${userEmail})`
  );

  try {
    // Check if ballot exists
    const ballot = await Ballot.findByPk(ballotId, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
        {
          model: Question,
          include: [
            {
              model: Choice,
            },
          ],
        },
      ],
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Security check - only creator can see raw voter data
    if (ballot.createdBy !== userId) {
      return res.status(403).json({
        status: "error",
        message:
          "You are not authorized to access this ballot's raw voter data",
      });
    }

    console.log(
      `RAW DIAGNOSTICS: Authorization passed. Ballot created by ${ballot.creator.email}`
    );

    // Get all raw voter records without any filtering
    const rawVoters = await Voter.findAll({
      where: { ballotId },
      raw: true,
    });

    console.log(
      `RAW DIAGNOSTICS: Found ${rawVoters.length} raw voter records in database`
    );

    // Get all raw votes for this ballot's questions
    const questionIds = ballot.Questions.map((q) => q.id);

    const rawVotes = await Vote.findAll({
      where: {
        questionId: {
          [Op.in]: questionIds,
        },
      },
      include: [
        {
          model: Question,
          attributes: ["id", "text"],
        },
        {
          model: Choice,
          attributes: ["id", "text"],
        },
      ],
      raw: true,
      nest: true,
    });

    console.log(
      `RAW DIAGNOSTICS: Found ${rawVotes.length} raw votes for ${questionIds.length} questions`
    );

    // Analyze votes per voter
    const votesByVoter = {};
    const voterIdsInVotes = new Set();

    rawVotes.forEach((vote) => {
      voterIdsInVotes.add(vote.voterId);

      if (!votesByVoter[vote.voterId]) {
        votesByVoter[vote.voterId] = [];
      }

      votesByVoter[vote.voterId].push({
        voteId: vote.id,
        questionId: vote.questionId,
        questionText: vote.Question?.text || "Unknown Question",
        choiceId: vote.choiceId,
        choiceText: vote.Choice?.text || "Unknown Choice",
      });
    });

    console.log(
      `RAW DIAGNOSTICS: Identified ${voterIdsInVotes.size} unique voter IDs in vote records`
    );

    // Identify orphaned voter IDs (votes with no voter record)
    const voterIdSet = new Set(rawVoters.map((v) => v.id));
    const orphanedVoterIds = [...voterIdsInVotes].filter(
      (id) => !voterIdSet.has(id)
    );

    console.log(
      `RAW DIAGNOSTICS: Found ${orphanedVoterIds.length} orphaned voter IDs in vote records`
    );

    // Create enhanced voter data with vote counts
    const voterData = rawVoters.map((voter) => {
      const voterVotes = votesByVoter[voter.id] || [];
      const isAdmin = voter.email === req.user.email;

      return {
        id: voter.id,
        email: voter.email,
        hasVotedFlag: voter.hasVoted,
        voteCount: voterVotes.length,
        isAdmin,
        hasVotes: voterVotes.length > 0,
        inconsistentState:
          (voter.hasVoted && voterVotes.length === 0) ||
          (!voter.hasVoted && voterVotes.length > 0),
        votes: voterVotes,
        createdAt: voter.createdAt,
        updatedAt: voter.updatedAt,
      };
    });

    // Track votes by question and choice
    const votesByQuestion = {};
    ballot.Questions.forEach((question) => {
      votesByQuestion[question.id] = {
        questionText: question.text,
        totalVotes: 0,
        choices: {},
      };

      question.Choices.forEach((choice) => {
        votesByQuestion[question.id].choices[choice.id] = {
          choiceText: choice.text,
          votes: 0,
        };
      });
    });

    // Populate vote counts by question and choice
    rawVotes.forEach((vote) => {
      if (votesByQuestion[vote.questionId]) {
        votesByQuestion[vote.questionId].totalVotes++;

        if (votesByQuestion[vote.questionId].choices[vote.choiceId]) {
          votesByQuestion[vote.questionId].choices[vote.choiceId].votes++;
        }
      }
    });

    // Get orphaned votes (votes with IDs that don't have voter records)
    const orphanedVotes = [];
    orphanedVoterIds.forEach((voterId) => {
      if (votesByVoter[voterId]) {
        votesByVoter[voterId].forEach((vote) => {
          orphanedVotes.push({
            voterId,
            ...vote,
          });
        });
      }
    });

    // Return detailed diagnostics
    return res.json({
      status: "success",
      message: "Raw voter diagnostics retrieved",
      data: {
        ballotId,
        ballotTitle: ballot.title,
        createdById: ballot.createdBy,
        isCreator: ballot.createdBy === userId,
        ballotState: {
          totalVoters: ballot.totalVoters,
          ballotsReceived: ballot.ballotsReceived,
        },
        rawVoterCount: rawVoters.length,
        totalVotes: rawVotes.length,
        uniqueVoterCount: voterIdsInVotes.size,
        voterIdsInVotes: [...voterIdsInVotes],
        orphanedVoterIds,
        orphanedVoterCount: orphanedVoterIds.length,
        inconsistentVoterCount: voterData.filter((v) => v.inconsistentState)
          .length,
        voterData: voterData.sort((a, b) => {
          // Sort admin first, then by vote count (highest first), then by email
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          if (a.voteCount !== b.voteCount) return b.voteCount - a.voteCount;
          return a.email.localeCompare(b.email);
        }),
        votesByQuestion,
        orphanedVotes,
        rawVotes: rawVotes.slice(0, 10), // Just send the first 10 raw votes to limit response size
      },
    });
  } catch (error) {
    console.error("RAW DIAGNOSTICS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve raw voter data",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Special repair endpoint to fix anonymous voters by updating with real names
 * @route POST /api/ballots/:id/repair-voters
 * @access Private (admin only)
 */
router.post("/:id/repair-voters", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `VOTER REPAIR: Request for ballot ${id} by user ${req.user.id} (${req.user.email})`
    );

    // Check if ballot exists and user has access as admin/creator
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Only allow creator to access repair functionality
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "Only the ballot creator can repair voter data",
      });
    }

    console.log(`Starting voter repair process for ballot ${id}`);

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Get all voters with anonymous-looking names or emails
      const anonymousVoters = await Voter.findAll({
        where: {
          ballotId: id,
          [Op.or]: [
            { name: "Anonymous Voter" },
            { email: { [Op.like]: "anonymous-%" } },
          ],
        },
        transaction,
      });

      // 2. For each voter, check if there's a better source of information
      console.log(
        `Found ${anonymousVoters.length} potentially anonymous voters to repair`
      );

      let repairedVoters = 0;

      for (const voter of anonymousVoters) {
        // Skip truly anonymous voters (both name and email are anonymous)
        if (
          voter.name === "Anonymous Voter" &&
          voter.email.includes("anonymous-")
        ) {
          console.log(`Skipping truly anonymous voter: ${voter.id}`);
          continue;
        }

        // If name is anonymous but email is not, update the name based on email
        if (
          voter.name === "Anonymous Voter" &&
          !voter.email.includes("anonymous-")
        ) {
          const username = voter.email.split("@")[0];
          const betterName = username
            .split(/[._-]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          console.log(
            `Improving voter name: "${voter.name}" → "${betterName}" (email: ${voter.email})`
          );

          voter.name = betterName;
          await voter.save({ transaction });
          repairedVoters++;
        }
      }

      // 3. Find votes without proper voter association
      const orphanedVotes = await Vote.findAll({
        attributes: ["id", "voterId", "ballotId"],
        include: [
          {
            model: Voter,
            attributes: ["id", "name", "email"],
            required: false,
          },
        ],
        where: {
          ballotId: id,
          "$Voter.id$": null, // This finds votes with no associated voter
        },
        transaction,
      });

      console.log(
        `Found ${orphanedVotes.length} votes without valid voter association`
      );

      // 4. Commit transaction
      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Voter repair completed successfully",
        data: {
          anonymousVotersFound: anonymousVoters.length,
          votersRepaired: repairedVoters,
          orphanedVotesFound: orphanedVotes.length,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error in voter repair process:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in voter repair endpoint:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to repair voter data",
      error: error.message,
    });
  }
});

/**
 * Create a direct voter record with explicit information (backup for registration flow)
 * @route POST /api/ballots/:id/create-direct-voter
 * @access Public (requires minimal authentication)
 */
router.post("/:id/create-direct-voter", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // [DEPRECATED] This endpoint is disabled - direct voter creation is no longer supported
    console.log(
      `[DISABLED] Direct voter creation endpoint called for ballot ${req.params.id}`
    );

    await transaction.rollback();
    return res.status(400).json({
      status: "error",
      message:
        "Direct voter creation is no longer supported. Please use the access key flow.",
      redirectToAccessKeyFlow: true,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("[VOTER CREATION] Error creating direct voter:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create voter record",
      error: error.message,
    });
  }
});

/**
 * Public endpoint for voter registration without authentication
 * @route POST /api/ballots/:id/public-register-voter
 * @access Public
 */
router.post("/:id/public-register-voter", async (req, res) => {
  // Start a transaction to ensure data consistency
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { voter } = req.body;

    console.log(`[PUBLIC-REGISTER] Processing request for ballot ${id}`);

    if (!voter || !voter.email) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Voter email is required",
      });
    }

    // Check if ballot exists
    const ballot = await Ballot.findByPk(id, { transaction });
    if (!ballot) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Check if ballot is still accepting registrations
    if (ballot.status === "completed") {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message:
          "This ballot is already completed and not accepting new voters",
      });
    }

    // Check if voter already exists
    let existingVoter = await Voter.findOne({
      where: {
        ballotId: id,
        email: voter.email,
      },
      transaction,
    });

    // If voter already exists, return it
    if (existingVoter) {
      console.log(`Voter ${voter.email} already exists for ballot ${id}`);

      // If they had a default name, update it with the provided one
      if (
        (existingVoter.name === "Anonymous Voter" || !existingVoter.name) &&
        voter.name
      ) {
        existingVoter.name = voter.name;
        await existingVoter.save({ transaction });
        console.log(`Updated existing voter name to ${voter.name}`);
      }

      // Generate a JWT token for this voter
      const token = jwt.sign(
        {
          voterId: existingVoter.id,
          email: existingVoter.email,
          ballotId: id,
          role: "voter",
          name: existingVoter.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      await transaction.commit();
      return res.status(200).json({
        status: "success",
        message: "Voter already registered",
        data: {
          voter: existingVoter,
          token,
        },
      });
    }

    // Create new voter record
    const voterName = voter.name || "Anonymous Voter";
    console.log(
      `Creating new voter: ${voterName} (${voter.email}) for ballot ${id}`
    );

    const newVoter = await Voter.create(
      {
        ballotId: id,
        email: voter.email,
        name: voterName,
        verificationCode: Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase(),
        isVerified: true, // Auto-verify for public registration
        hasVoted: false,
        ipAddress:
          req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        lastActivity: new Date(),
      },
      { transaction }
    );

    // Increment totalVoters count in ballot
    ballot.totalVoters = (ballot.totalVoters || 0) + 1;
    await ballot.save({ transaction });

    console.log(
      `Successfully registered voter ${newVoter.id} for ballot ${id}`
    );

    // Generate a JWT token for this new voter
    const token = jwt.sign(
      {
        voterId: newVoter.id,
        email: newVoter.email,
        ballotId: id,
        role: "voter",
        name: newVoter.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Commit the transaction
    await transaction.commit();

    res.status(201).json({
      status: "success",
      message: "Voter registered successfully",
      data: {
        voter: newVoter,
        token,
      },
    });
  } catch (error) {
    // Rollback transaction if something goes wrong
    await transaction.rollback();
    console.error("[PUBLIC REGISTRATION] Error registering voter:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to register as a voter",
      error: error.message,
    });
  }
});

/**
 * Generate or regenerate an access key for a ballot
 * @route POST /api/ballots/:id/generate-access-key
 * @access Private (admin only)
 */
router.post("/:id/generate-access-key", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { maxUsage } = req.body;

    // Find the ballot
    const ballot = await Ballot.findByPk(id);

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Verify the user is the ballot creator
    if (ballot.createdBy !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message:
          "You don't have permission to generate an access key for this ballot",
      });
    }

    // Generate new access key
    const accessKey = await ballot.generateAccessKey();

    // Update maxKeyUsage if provided
    if (maxUsage !== undefined) {
      ballot.maxKeyUsage = maxUsage;
      await ballot.save();
    }

    res.status(200).json({
      status: "success",
      message: "Access key generated successfully",
      data: {
        accessKey,
        maxKeyUsage: ballot.maxKeyUsage,
      },
    });
  } catch (error) {
    console.error("Error generating ballot access key:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate access key",
    });
  }
});

/**
 * Validate an access key and return minimal ballot info
 * @route GET /api/ballots/access/:accessKey
 * @access Public
 */
router.get("/access/:accessKey", async (req, res) => {
  try {
    const { accessKey } = req.params;

    if (!accessKey) {
      return res.status(400).json({
        status: "error",
        message: "Access key is required",
      });
    }

    // Find the ballot by access key
    const ballot = await Ballot.findOne({
      where: { accessKey },
      attributes: [
        "id",
        "title",
        "status",
        "accessKeyEnabled",
        "keyUsageCount",
        "maxKeyUsage",
      ],
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Invalid access key",
      });
    }

    // Validate the access key
    const validation = await ballot.validateAccessKey(accessKey);

    if (!validation.valid) {
      return res.status(403).json({
        status: "error",
        message: `Access key is ${
          validation.reason === "key_disabled"
            ? "disabled"
            : "invalid or expired"
        }`,
        reason: validation.reason,
      });
    }

    // Return minimal ballot info
    res.status(200).json({
      status: "success",
      data: {
        ballotId: ballot.id,
        title: ballot.title,
        status: ballot.status,
      },
    });
  } catch (error) {
    console.error("Error validating ballot access key:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to validate access key",
    });
  }
});

/**
 * Register a voter with a ballot using an access key and issue a voter token
 * @route POST /api/ballots/register-with-key
 * @access Public
 */
router.post("/register-with-key", async (req, res) => {
  try {
    const { accessKey, name, email, password } = req.body;

    if (!accessKey || !name || !email) {
      return res.status(400).json({
        status: "error",
        message: "Access key, name, and email are required",
      });
    }

    // Find the ballot by access key
    const ballot = await Ballot.findOne({
      where: { accessKey },
    });

    if (!ballot) {
      return res.status(404).json({
        status: "error",
        message: "Invalid access key",
      });
    }

    // Validate the access key (without incrementing usage as that happens on successful registration)
    if (!ballot.accessKeyEnabled) {
      return res.status(403).json({
        status: "error",
        message: "Access key is disabled",
        reason: "key_disabled",
      });
    }

    if (
      ballot.maxKeyUsage !== null &&
      ballot.keyUsageCount >= ballot.maxKeyUsage
    ) {
      return res.status(403).json({
        status: "error",
        message: "Access key usage limit reached",
        reason: "usage_limit_reached",
      });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Check if a voter with this email already exists for this ballot
      let voter = await Voter.findOne({
        where: {
          ballotId: ballot.id,
          email: email,
        },
        transaction,
      });

      // If voter already exists, update their record
      if (voter) {
        console.log(
          `Voter ${email} already exists for ballot ${ballot.id}, updating record`
        );

        // If voter has already voted, they cannot re-register
        if (voter.hasVoted) {
          await transaction.rollback();
          return res.status(400).json({
            status: "error",
            message: "This email has already been used to vote in this ballot",
            alreadyVoted: true,
          });
        }

        // Update the voter's name if they had an anonymous name
        if (voter.name === "Anonymous Voter" || !voter.name) {
          voter.name = name;
          await voter.save({ transaction });
        }
      } else {
        // Create a new voter record
        console.log(
          `Creating new voter record for ${email} in ballot ${ballot.id}`
        );

        voter = await Voter.create(
          {
            ballotId: ballot.id,
            email: email,
            name: name,
            verificationCode: Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase(),
            isVerified: true, // Auto-verify for now
            hasVoted: false,
            ipAddress:
              req.headers["x-forwarded-for"] || req.connection.remoteAddress,
            lastActivity: new Date(),
          },
          { transaction }
        );

        // Increment the ballot's voter count
        ballot.totalVoters = (ballot.totalVoters || 0) + 1;
        await ballot.save({ transaction });
      }

      // Increment the access key usage count
      ballot.keyUsageCount += 1;
      await ballot.save({ transaction });

      // CRITICAL FIX: Generate a JWT token with explicit voter role
      const token = jwt.sign(
        {
          voterId: voter.id,
          email: voter.email,
          ballotId: ballot.id,
          role: "voter", // Explicitly set role to voter
          name: voter.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Log the token info for debugging
      console.log(`Generated voter token for ${email} with role: voter`);
      console.log(`Token preview: ${token.substring(0, 15)}...`);

      // Commit the transaction
      await transaction.commit();

      // Return success response with token and voter info
      res.status(200).json({
        status: "success",
        message: "Voter registered successfully",
        data: {
          token,
          voter: {
            id: voter.id,
            name: voter.name,
            email: voter.email,
            ballotId: ballot.id,
          },
          ballot: {
            id: ballot.id,
            title: ballot.title,
          },
          // Add instructions for frontend token storage
          tokenStorage: {
            key: "voterToken", // Store under this key
            separate: true, // Keep separate from admin token
          },
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error registering voter with access key:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to register voter",
      error: error.message,
    });
  }
});

/**
 * Vote on a ballot using voter token
 * @route POST /api/ballots/:id/voter-vote
 * @access Private (voter only)
 */
router.post("/:id/voter-vote", voterAuth, async (req, res) => {
  // Start a transaction to ensure data consistency
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { rankings, votes } = req.body;

    // ENHANCED VALIDATION: Ensure we have a valid voter token
    if (!req.voter || !req.voter.id) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Valid voter token is required",
        requiresAuthentication: true,
      });
    }

    // Validate that the voter is registered for this specific ballot
    if (req.voter.ballotId !== id) {
      await transaction.rollback();
      return res.status(403).json({
        status: "error",
        message: "You are not registered for this ballot",
      });
    }

    console.log(
      `[VOTER VOTE] Processing vote for ballot ${id} from voter ${req.voter.id} (${req.voter.name})`
    );

    // Find the voter record
    const voter = await Voter.findByPk(req.voter.id, { transaction });

    if (!voter) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Voter record not found",
      });
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "You have already submitted a vote for this ballot",
      });
    }

    // Find the ballot
    const ballot = await Ballot.findByPk(id, { transaction });

    if (!ballot) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Ensure the ballot is in an active state for voting
    if (ballot.status !== "active" && ballot.status !== "scheduled") {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "This ballot is not currently accepting votes",
      });
    }

    // Process the vote - similar to the public-vote endpoint but simplified
    let createdVotes = [];

    // Handle rankings format
    if (rankings && Object.keys(rankings).length > 0) {
      console.log(`[VOTER VOTE] Processing rankings format vote`);

      for (const [questionIndex, responseData] of Object.entries(rankings)) {
        // Find the question
        let questionId;

        try {
          const questions = await Question.findAll({
            where: { ballotId: id },
            order: [["order", "ASC"]],
            transaction,
          });

          const questionIdxNum = parseInt(questionIndex, 10);
          if (!isNaN(questionIdxNum) && questionIdxNum < questions.length) {
            questionId = questions[questionIdxNum].id;
          }
        } catch (err) {
          console.error(
            `[VOTER VOTE] Error getting question ID: ${err.message}`
          );
          continue;
        }

        if (!questionId) {
          console.warn(
            `[VOTER VOTE] Could not resolve question ID for index ${questionIndex}`
          );
          continue;
        }

        // Extract the choice data
        let choiceId;
        let rank = null;

        if (typeof responseData === "object" && responseData !== null) {
          if (
            typeof responseData.index === "number" ||
            !isNaN(parseInt(responseData.index))
          ) {
            const choiceIndex = parseInt(responseData.index);

            try {
              const choices = await Choice.findAll({
                where: { questionId },
                order: [["order", "ASC"]],
                transaction,
              });

              if (choiceIndex < choices.length) {
                choiceId = choices[choiceIndex].id;
              }
            } catch (err) {
              console.error(
                `[VOTER VOTE] Error getting choice ID: ${err.message}`
              );
              continue;
            }
          }
        } else if (
          typeof responseData === "string" &&
          !isNaN(parseInt(responseData))
        ) {
          // Direct index as string
          const choiceIndex = parseInt(responseData);

          try {
            const choices = await Choice.findAll({
              where: { questionId },
              order: [["order", "ASC"]],
              transaction,
            });

            if (choiceIndex < choices.length) {
              choiceId = choices[choiceIndex].id;
            }
          } catch (err) {
            console.error(
              `[VOTER VOTE] Error getting choice ID: ${err.message}`
            );
            continue;
          }
        }

        if (!choiceId) {
          console.warn(
            `[VOTER VOTE] Could not resolve choice ID for question ${questionId}`
          );
          continue;
        }

        // Create the vote record
        try {
          const newVote = await Vote.create(
            {
              voterId: req.voter.id,
              ballotId: id,
              questionId,
              choiceId,
              rank,
              castAt: new Date(),
            },
            { transaction }
          );

          createdVotes.push(newVote);
          console.log(
            `[VOTER VOTE] Created vote for question ${questionId}, choice ${choiceId}`
          );
        } catch (err) {
          console.error(`[VOTER VOTE] Error creating vote: ${err.message}`);
        }
      }
    }
    // Legacy votes array format
    else if (votes && votes.length > 0) {
      console.log(`[VOTER VOTE] Processing legacy votes array format`);

      for (const voteData of votes) {
        try {
          // Verify question belongs to this ballot
          const question = await Question.findOne({
            where: {
              id: voteData.questionId,
              ballotId: id,
            },
            transaction,
          });

          if (!question) {
            console.warn(
              `[VOTER VOTE] Question ${voteData.questionId} not found in this ballot`
            );
            continue;
          }

          // Verify choice belongs to this question
          const choice = await Choice.findOne({
            where: {
              id: voteData.choiceId,
              questionId: voteData.questionId,
            },
            transaction,
          });

          if (!choice) {
            console.warn(
              `[VOTER VOTE] Choice ${voteData.choiceId} not found for question ${voteData.questionId}`
            );
            continue;
          }

          // Create vote record
          const newVote = await Vote.create(
            {
              voterId: req.voter.id,
              ballotId: id,
              questionId: voteData.questionId,
              choiceId: voteData.choiceId,
              rank: voteData.rank || null,
              castAt: new Date(),
            },
            { transaction }
          );

          createdVotes.push(newVote);
          console.log(
            `[VOTER VOTE] Created vote for question ${voteData.questionId}, choice ${voteData.choiceId}`
          );
        } catch (err) {
          console.error(`[VOTER VOTE] Error creating vote: ${err.message}`);
        }
      }
    } else {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "No valid rankings or votes data provided",
      });
    }

    if (createdVotes.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Failed to process vote data",
      });
    }

    // Mark voter as having voted
    voter.hasVoted = true;
    voter.lastActivity = new Date();
    await voter.save({ transaction });
    console.log(`[VOTER VOTE] Marked voter ${voter.id} as having voted`);

    // Update ballot counts
    ballot.ballotsReceived = (ballot.ballotsReceived || 0) + 1;
    await ballot.save({ transaction });
    console.log(
      `[VOTER VOTE] Updated ballot.ballotsReceived to ${ballot.ballotsReceived}`
    );

    // Commit transaction
    await transaction.commit();
    console.log(
      `[VOTER VOTE] Transaction committed successfully. ${createdVotes.length} votes recorded.`
    );

    // Return response
    res.status(201).json({
      status: "success",
      message: "Vote cast successfully",
      data: {
        voterId: voter.id,
        voterName: voter.name,
        ballotId: id,
        votesCount: createdVotes.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Rollback transaction if something goes wrong
    await transaction.rollback();
    console.error("Voter vote API error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to cast vote",
      error: error.message,
    });
  }
});

module.exports = router;
