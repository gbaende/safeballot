const {
  Ballot,
  Question,
  Choice,
  Voter,
  Vote,
} = require("../models/ballot.model");
const { User } = require("../models/user.model");
const { sequelize } = require("../database/connection");

/**
 * Validates that a ballot's votes are properly linked to voter records
 * and that ballot counts are accurate
 * @param {string} ballotId - The ID of the ballot to validate
 * @returns {Object} - Validation results
 */
async function validateBallot(ballotId) {
  console.log(`Validating ballot integrity for ballot ${ballotId}...`);
  const results = {
    ballotId,
    passed: false,
    issues: {
      orphanedVotes: [],
      adminVotes: [],
      countAccuracy: {
        passed: false,
        actualVoteCount: 0,
        ballotVoteCount: 0,
        votedVoterCount: 0,
      },
      voterFlagsConsistent: {
        passed: false,
        inconsistencies: [],
      },
    },
    recommendations: [],
  };

  try {
    // Get ballot details
    const ballot = await Ballot.findByPk(ballotId);
    if (!ballot) {
      throw new Error(`Ballot ${ballotId} not found`);
    }

    // Get ballot creator
    const creator = await User.findByPk(ballot.createdBy);
    if (!creator) {
      results.recommendations.push(
        "Could not find ballot creator. Verify user exists."
      );
    }

    // Get all votes for this ballot
    const votes = await Vote.findAll({
      where: { ballotId },
      raw: true,
    });
    console.log(`Found ${votes.length} votes for ballot ${ballotId}`);

    // Get all voters for this ballot
    const voters = await Voter.findAll({
      where: { ballotId },
      raw: true,
    });
    console.log(`Found ${voters.length} voters for ballot ${ballotId}`);

    // 1. Check for orphaned votes (votes without valid voter records)
    const voterIds = new Set(voters.map((v) => v.id));
    const orphanedVotes = votes.filter((vote) => !voterIds.has(vote.voterId));

    if (orphanedVotes.length > 0) {
      console.warn(
        `Found ${orphanedVotes.length} orphaned votes without voter records`
      );
      results.issues.orphanedVotes = orphanedVotes.map((v) => ({
        voteId: v.id,
        voterId: v.voterId,
        questionId: v.questionId,
        choiceId: v.choiceId,
      }));
      results.recommendations.push(
        `Run repair script to fix ${orphanedVotes.length} orphaned votes`
      );
    } else {
      console.log("✅ No orphaned votes found");
    }

    // 2. Check if admin has voted
    if (creator) {
      const adminEmail = creator.email;
      const adminVoters = voters.filter((v) => v.email === adminEmail);

      // Check if admin voters have votes
      const adminVoterIds = adminVoters.map((v) => v.id);
      const adminVotes = votes.filter((v) => adminVoterIds.includes(v.voterId));

      if (adminVotes.length > 0) {
        console.warn(
          `Found ${adminVotes.length} votes cast by admin user (${adminEmail})`
        );
        results.issues.adminVotes = adminVotes.map((v) => ({
          voteId: v.id,
          voterId: v.voterId,
          adminEmail,
        }));
        results.recommendations.push(
          "Admin users should not vote in their own ballots - implement role separation check"
        );
      } else {
        console.log("✅ No admin votes found");
      }
    }

    // 3. Verify ballot counts match actual votes
    const actualVoteCount = votes.length;
    const ballotVoteCount = ballot.ballotsReceived || 0;

    // Count voters marked as having voted
    const votedVoterCount = voters.filter((v) => v.hasVoted).length;

    // Save count data
    results.issues.countAccuracy.actualVoteCount = actualVoteCount;
    results.issues.countAccuracy.ballotVoteCount = ballotVoteCount;
    results.issues.countAccuracy.votedVoterCount = votedVoterCount;

    // Compare counts
    if (actualVoteCount !== ballotVoteCount) {
      console.warn(
        `Ballot vote count mismatch: ballot.ballotsReceived=${ballotVoteCount}, actual votes=${actualVoteCount}`
      );
      results.recommendations.push(
        `Update ballot.ballotsReceived to ${actualVoteCount} to match actual vote count`
      );
    } else {
      console.log("✅ Ballot vote count matches actual vote count");
      results.issues.countAccuracy.passed = true;
    }

    // 4. Check voter hasVoted flags match actual votes
    // Group votes by voter
    const votesByVoter = {};
    votes.forEach((vote) => {
      if (!votesByVoter[vote.voterId]) {
        votesByVoter[vote.voterId] = [];
      }
      votesByVoter[vote.voterId].push(vote);
    });

    // Check for inconsistencies
    const inconsistencies = [];

    voters.forEach((voter) => {
      const hasVotes =
        !!votesByVoter[voter.id] && votesByVoter[voter.id].length > 0;

      if (voter.hasVoted && !hasVotes) {
        inconsistencies.push({
          voterId: voter.id,
          email: voter.email,
          problem: "Marked as voted but has no votes",
          hasVoted: true,
          actualVotes: 0,
        });
      } else if (!voter.hasVoted && hasVotes) {
        inconsistencies.push({
          voterId: voter.id,
          email: voter.email,
          problem: "Has votes but not marked as voted",
          hasVoted: false,
          actualVotes: votesByVoter[voter.id].length,
        });
      }
    });

    if (inconsistencies.length > 0) {
      console.warn(
        `Found ${inconsistencies.length} voters with inconsistent hasVoted flags`
      );
      results.issues.voterFlagsConsistent.inconsistencies = inconsistencies;
      results.recommendations.push(
        `Update hasVoted flags for ${inconsistencies.length} voters to match their actual vote status`
      );
    } else {
      console.log("✅ All voter hasVoted flags match their actual vote status");
      results.issues.voterFlagsConsistent.passed = true;
    }

    // Determine overall pass/fail
    results.passed =
      orphanedVotes.length === 0 &&
      (creator ? results.issues.adminVotes.length === 0 : true) &&
      results.issues.countAccuracy.passed &&
      results.issues.voterFlagsConsistent.passed;

    if (results.passed) {
      console.log(
        "✅ BALLOT VALIDATION PASSED - All integrity checks successful"
      );
    } else {
      console.warn(
        "❌ BALLOT VALIDATION FAILED - See issues and recommendations"
      );
    }

    return results;
  } catch (error) {
    console.error("Error validating ballot:", error);
    return {
      ...results,
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Validates all ballots in the system
 * @returns {Object} - Validation results for all ballots
 */
async function validateAllBallots() {
  try {
    const ballots = await Ballot.findAll({
      attributes: ["id", "title"],
      raw: true,
    });

    console.log(`Validating ${ballots.length} ballots...`);

    const results = [];
    for (const ballot of ballots) {
      const result = await validateBallot(ballot.id);
      results.push({
        ...result,
        title: ballot.title,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    console.log(
      `Validation complete: ${passedCount} of ${results.length} ballots passed all checks`
    );

    return {
      totalBallots: results.length,
      passedCount,
      results,
    };
  } catch (error) {
    console.error("Error validating ballots:", error);
    return {
      error: error.message,
    };
  }
}

/**
 * Command line interface for the validation script
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // No args, validate all ballots
      const results = await validateAllBallots();
      console.log(JSON.stringify(results, null, 2));
    } else if (args[0] === "--ballot" && args[1]) {
      // Validate specific ballot
      const ballotId = args[1];
      const result = await validateBallot(ballotId);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("Usage:");
      console.log(
        "  node validateVoteIntegrity.js             # Validate all ballots"
      );
      console.log(
        "  node validateVoteIntegrity.js --ballot ID # Validate specific ballot"
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// If running directly (not imported)
if (require.main === module) {
  main();
}

// Export for use in other scripts
module.exports = {
  validateBallot,
  validateAllBallots,
};
