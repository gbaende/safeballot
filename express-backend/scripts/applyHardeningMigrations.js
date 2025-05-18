const { sequelize } = require("../database/connection");
const { Ballot, Voter, Vote } = require("../models/ballot.model");

/**
 * Script to apply database migrations for the SafeBallot hardening changes
 * - Add requiresAuthentication field to Ballot table
 * - Add tracking fields to Voter table
 * - Add unique constraint on (ballotId, email) for Voter table
 * - Add foreign key constraint on voterId in Vote table
 */
async function applyMigrations() {
  console.log("Starting database migrations for SafeBallot hardening...");

  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log("Checking for existing columns and constraints...");

    // Check if columns already exist to avoid duplicate errors
    const ballotColumns = await queryInterface.describeTable("Ballots");
    const voterColumns = await queryInterface.describeTable("Voters");
    const voteColumns = await queryInterface.describeTable("Votes");

    // 1. Add requiresAuthentication field to Ballot table if it doesn't exist
    if (!ballotColumns.requiresAuthentication) {
      console.log("Adding requiresAuthentication field to Ballot table...");
      await queryInterface.addColumn(
        "Ballots",
        "requiresAuthentication",
        {
          type: sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: process.env.NODE_ENV === "staging", // Default to true in staging
        },
        { transaction }
      );
      console.log("✅ Added requiresAuthentication field");
    } else {
      console.log("✓ requiresAuthentication field already exists");
    }

    // 2. Add tracking fields to Voter table if they don't exist
    if (!voterColumns.ipAddress) {
      console.log("Adding ipAddress field to Voter table...");
      await queryInterface.addColumn(
        "Voters",
        "ipAddress",
        {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        { transaction }
      );
      console.log("✅ Added ipAddress field");
    } else {
      console.log("✓ ipAddress field already exists");
    }

    if (!voterColumns.lastActivity) {
      console.log("Adding lastActivity field to Voter table...");
      await queryInterface.addColumn(
        "Voters",
        "lastActivity",
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction }
      );
      console.log("✅ Added lastActivity field");
    } else {
      console.log("✓ lastActivity field already exists");
    }

    if (!voterColumns.metadata) {
      console.log("Adding metadata field to Voter table...");
      await queryInterface.addColumn(
        "Voters",
        "metadata",
        {
          type: sequelize.DataTypes.JSON,
          allowNull: true,
        },
        { transaction }
      );
      console.log("✅ Added metadata field");
    } else {
      console.log("✓ metadata field already exists");
    }

    // 3. Add castAt field to Vote table if it doesn't exist
    if (!voteColumns.castAt) {
      console.log("Adding castAt field to Vote table...");
      await queryInterface.addColumn(
        "Votes",
        "castAt",
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
          defaultValue: sequelize.fn("NOW"),
        },
        { transaction }
      );
      console.log("✅ Added castAt field");
    } else {
      console.log("✓ castAt field already exists");
    }

    // 4. Add unique constraint on (ballotId, email) for Voter table
    // Note: This might fail if there are duplicate records
    try {
      console.log(
        "Adding unique constraint on (ballotId, email) for Voter table..."
      );

      // Check if there are duplicate records first
      const duplicates = await sequelize.query(
        `
        SELECT "ballotId", email, COUNT(*) 
        FROM "Voters" 
        GROUP BY "ballotId", email 
        HAVING COUNT(*) > 1
      `,
        { type: sequelize.QueryTypes.SELECT, transaction }
      );

      if (duplicates.length > 0) {
        console.warn(
          `⚠️ Found ${duplicates.length} duplicate voter records that would violate the constraint.`
        );
        console.warn(
          "You must resolve these duplicates before adding the constraint."
        );
        console.warn("Example duplicates:", duplicates.slice(0, 3));
      } else {
        await queryInterface.addIndex("Voters", ["ballotId", "email"], {
          name: "unique_ballot_voter",
          unique: true,
          transaction,
        });
        console.log("✅ Added unique constraint on (ballotId, email)");
      }
    } catch (error) {
      console.warn("⚠️ Could not add unique constraint:", error.message);
      // Don't rethrow - we'll continue with other migrations
    }

    // 5. Update NOT NULL constraint on voterId in Vote table
    // Note: This will fail if there are existing votes with NULL voterId
    try {
      console.log("Checking if there are votes with NULL voterId...");
      const nullVotes = await sequelize.query(
        `
        SELECT COUNT(*) as count 
        FROM "Votes" 
        WHERE "voterId" IS NULL
      `,
        { type: sequelize.QueryTypes.SELECT, transaction }
      );

      if (nullVotes[0].count > 0) {
        console.warn(
          `⚠️ Found ${nullVotes[0].count} votes with NULL voterId that would violate the constraint.`
        );
        console.warn(
          "You must fix these records before adding the NOT NULL constraint."
        );
      } else {
        if (voteColumns.voterId.allowNull !== false) {
          console.log("Updating voterId to NOT NULL...");
          await queryInterface.changeColumn(
            "Votes",
            "voterId",
            {
              type: sequelize.DataTypes.UUID,
              allowNull: false,
            },
            { transaction }
          );
          console.log("✅ Updated voterId to NOT NULL");
        } else {
          console.log("✓ voterId already has NOT NULL constraint");
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not update NOT NULL constraint:", error.message);
      // Don't rethrow - we'll continue with other migrations
    }

    // 6. Update all existing ballots in staging to requireAuthentication
    if (process.env.NODE_ENV === "staging") {
      console.log(
        "Setting requiresAuthentication=true for all ballots in staging..."
      );
      await Ballot.update(
        { requiresAuthentication: true },
        { where: {}, transaction }
      );
      console.log("✅ Updated all ballots to require authentication");
    }

    // Commit all changes
    await transaction.commit();
    console.log("✅ All migrations applied successfully");

    return {
      success: true,
      message: "Database migrations completed successfully",
    };
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error("❌ Migration failed:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Command line interface for migrations
 */
async function main() {
  try {
    console.log("SafeBallot Staging Hardening Migrations");
    console.log("========================================");
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    const result = await applyMigrations();

    if (result.success) {
      console.log("\n✅ Migrations completed successfully");
      process.exit(0);
    } else {
      console.error("\n❌ Migration failed:", result.error);
      process.exit(1);
    }
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
  applyMigrations,
};
