const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  Ballot,
  Question,
  Choice,
  Voter,
  Vote,
} = require("../models/ballot.model");
const { protect } = require("../middleware/auth.middleware");
const { sequelize } = require("../database/connection");

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

    res.status(200).json({
      status: "success",
      data: ballots,
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
 * @access Private
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Log the request for debugging
    console.log("Get ballot request:", {
      ballotId: id,
      user: req.user ? { id: req.user.id, email: req.user.email } : "No user",
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

    // First check if user is the creator - always allow access
    if (ballot.createdBy === req.user.id) {
      console.log("Access granted: User is ballot creator");
      return res.status(200).json({
        status: "success",
        data: ballot,
      });
    }

    // Check if ballot is public - if so, allow access
    if (ballot.isPublic) {
      console.log("Access granted: Ballot is public");
      return res.status(200).json({
        status: "success",
        data: ballot,
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
      console.log("Access granted: User is registered voter");
      return res.status(200).json({
        status: "success",
        data: ballot,
      });
    }

    // Log access denied for debugging
    console.log("Access denied: User is not authorized to access this ballot", {
      ballotId: id,
      userEmail: req.user.email,
      createdBy: ballot.createdBy,
      isPublic: ballot.isPublic,
    });

    // If none of the above, deny access
    return res.status(403).json({
      status: "error",
      message: "You do not have permission to access this ballot",
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
        message: "You do not have permission to access this ballot",
      });
    }

    // Get voters
    const voters = await Voter.findAll({
      where: { ballotId: id },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      data: voters,
    });
  } catch (error) {
    console.error("Error getting ballot voters:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get ballot voters",
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
 * @access Public (with verification)
 */
router.post(
  "/:id/vote",
  [
    body("voterId").notEmpty().withMessage("Voter ID is required"),
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
      const { voterId, votes } = req.body;

      // Check if ballot exists
      const ballot = await Ballot.findByPk(id);

      if (!ballot) {
        return res.status(404).json({
          status: "error",
          message: "Ballot not found",
        });
      }

      // Check if ballot is active
      if (ballot.status !== "active") {
        return res.status(400).json({
          status: "error",
          message: `Ballot is not active (current status: ${ballot.status})`,
        });
      }

      // Check if voter exists and is verified
      const voter = await Voter.findOne({
        where: {
          id: voterId,
          ballotId: id,
        },
      });

      if (!voter) {
        return res.status(404).json({
          status: "error",
          message: "Voter not found",
        });
      }

      // If ballot requires verification, check if voter is verified
      if (ballot.requiresVerification && !voter.isVerified) {
        // For demo purposes, auto-verify the voter instead of returning an error
        console.log(
          `Auto-verifying voter ${voterId} for ballot ${id} (DEMO MODE)`
        );
        voter.isVerified = true;
        await voter.save();
      }

      // Check if voter has already voted
      if (voter.hasVoted) {
        return res.status(400).json({
          status: "error",
          message: "Voter has already cast a vote",
        });
      }

      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Process each vote
        for (const voteData of votes) {
          // Check if question belongs to this ballot
          const question = await Question.findOne({
            where: {
              id: voteData.questionId,
              ballotId: id,
            },
            transaction,
          });

          if (!question) {
            throw new Error(
              `Question with ID ${voteData.questionId} not found in this ballot`
            );
          }

          // Check if choice belongs to this question
          const choice = await Choice.findOne({
            where: {
              id: voteData.choiceId,
              questionId: voteData.questionId,
            },
            transaction,
          });

          if (!choice) {
            throw new Error(
              `Choice with ID ${voteData.choiceId} not found for question ${voteData.questionId}`
            );
          }

          // Create vote
          await Vote.create(
            {
              voterId,
              ballotId: id,
              questionId: voteData.questionId,
              choiceId: voteData.choiceId,
              rank: voteData.rank || null,
            },
            { transaction }
          );
        }

        // Mark voter as having voted
        voter.hasVoted = true;
        await voter.save({ transaction });

        // Update ballot ballotsReceived count
        ballot.ballotsReceived = (ballot.ballotsReceived || 0) + 1;
        await ballot.save({ transaction });

        // Commit transaction
        await transaction.commit();

        res.status(201).json({
          status: "success",
          message: "Vote cast successfully",
          data: {
            voterId,
            ballotId: id,
            votesCount: votes.length,
          },
        });
      } catch (error) {
        // Rollback transaction if something goes wrong
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error casting vote:", error);
      res.status(500).json({
        status: "error",
        message: `Failed to cast vote: ${error.message}`,
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
  try {
    const { id } = req.params;
    console.log(
      `Register voter request for ballot ${id} by user ${req.user.id} (${req.user.email})`
    );

    // Check if ballot exists
    const ballot = await Ballot.findByPk(id);
    if (!ballot) {
      console.log(`Ballot ${id} not found`);
      return res.status(404).json({
        status: "error",
        message: "Ballot not found",
      });
    }

    // Check if ballot is still accepting registrations
    if (ballot.status === "completed") {
      console.log(`Ballot ${id} is already completed, cannot register voters`);
      return res.status(400).json({
        status: "error",
        message:
          "This ballot is already completed and not accepting new voters",
      });
    }

    // Check if user is already registered as a voter for this ballot
    const existingVoter = await Voter.findOne({
      where: {
        ballotId: id,
        email: req.user.email,
      },
    });

    if (existingVoter) {
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

    // Register user as a voter
    const voter = await Voter.create({
      ballotId: id,
      email: req.user.email,
      name: req.user.name || "Anonymous Voter",
      verificationCode,
      hasVoted: false,
      isVerified: true, // Auto-verify voters for demo purposes
    });

    console.log(
      `Successfully registered user ${req.user.email} as voter ${voter.id} for ballot ${id} (auto-verified for demo)`
    );

    // Increment totalVoters count in ballot
    await ballot.increment("totalVoters");
    await ballot.save();

    console.log(
      `Updated total voters for ballot ${id} to ${ballot.totalVoters + 1}`
    );

    res.status(201).json({
      status: "success",
      message: "You have been registered as a voter for this ballot",
      data: {
        voter,
      },
    });
  } catch (error) {
    console.error("Error registering voter:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to register as a voter",
    });
  }
});

module.exports = router;
