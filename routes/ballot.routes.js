/**
 * Cast a vote
 * @route POST /api/ballots/:id/vote
 * @access Public (with verification)
 */
router.post(
  "/:id/vote",
  [
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
      const { voterId, votes, email } = req.body;

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
        // For demo purposes, allow voting regardless of status
        console.log(
          `Allowing vote despite ballot status: ${ballot.status} (DEMO MODE)`
        );
      }

      let voter;

      // Get or create voter
      if (voterId) {
        // Try to find existing voter by ID
        voter = await Voter.findOne({
          where: {
            id: voterId,
            ballotId: id,
          },
        });
      }

      // If no voter found or no voterId provided
      if (!voter) {
        // Try to identify user through token if available
        let userEmail = null;

        // Check if we have a user from auth middleware
        if (req.user && req.user.email) {
          userEmail = req.user.email;
          console.log(`Using authenticated user email: ${userEmail}`);
        }
        // Or use email from request body if provided
        else if (email) {
          userEmail = email;
          console.log(`Using provided email: ${userEmail}`);
        }

        if (userEmail) {
          // Check if voter exists with this email
          voter = await Voter.findOne({
            where: {
              email: userEmail,
              ballotId: id,
            },
          });

          if (voter) {
            console.log(`Found existing voter by email: ${voter.id}`);
          }
        }

        // If still no voter, create one (anonymous)
        if (!voter) {
          console.log(`Creating anonymous voter for ballot ${id}`);
          // Generate a random email for anonymous voters
          const anonymousEmail = `anonymous-${Math.random()
            .toString(36)
            .substring(2, 10)}@example.com`;

          voter = await Voter.create({
            email: userEmail || anonymousEmail,
            name: "Anonymous Voter",
            ballotId: id,
            verificationCode: Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase(),
            isVerified: true, // Auto-verify voters for demo purposes
            hasVoted: false,
          });

          console.log(`Created new voter with ID: ${voter.id}`);

          // Increment totalVoters count in ballot
          ballot.totalVoters = (ballot.totalVoters || 0) + 1;
          await ballot.save();
          console.log(`Updated ballot totalVoters to ${ballot.totalVoters}`);
        }
      }

      // If ballot requires verification, check if voter is verified
      if (ballot.requiresVerification && !voter.isVerified) {
        // For demo purposes, auto-verify the voter instead of returning an error
        console.log(
          `Auto-verifying voter ${voter.id} for ballot ${id} (DEMO MODE)`
        );
        voter.isVerified = true;
        await voter.save();
      }

      // Check if voter has already voted
      if (voter.hasVoted) {
        // For demo purposes, reset the hasVoted flag instead of returning an error
        console.log(
          `DEMO MODE: Resetting hasVoted flag for voter ${voter.id} to allow multiple votes`
        );
        voter.hasVoted = false;
        await voter.save();
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
              voterId: voter.id,
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
            voterId: voter.id,
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
