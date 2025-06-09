const { sequelize } = require("../database/connection");

/**
 * Script to clean up voter records that would cause migration issues
 * This removes voters with empty/anonymous names since we can't split them into firstName/lastName
 */
async function cleanupVotersForMigration() {
  console.log("🧹 Starting cleanup of problematic voter records...");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Start a transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Find voters with problematic names that can't be split into firstName/lastName
      const [problematicVoters] = await sequelize.query(
        `
        SELECT id, email, name, "ballotId", "createdAt" 
        FROM voters 
        WHERE name IS NULL 
           OR name = '' 
           OR name = 'Anonymous Voter'
           OR name = 'Registered Voter'
           OR TRIM(name) = ''
        ORDER BY "createdAt" DESC
      `,
        { transaction }
      );

      console.log(
        `📊 Found ${problematicVoters.length} voters with problematic names`
      );

      if (problematicVoters.length === 0) {
        console.log("✅ No cleanup needed - all voters have valid names");
        await transaction.rollback();
        return;
      }

      // Log the voters that will be deleted
      console.log("🔍 Voters to be deleted:");
      problematicVoters.forEach((voter, index) => {
        console.log(
          `  ${index + 1}. ID: ${voter.id}, Email: ${voter.email}, Name: "${
            voter.name
          }", Ballot: ${voter.ballotId}`
        );
      });

      // Delete the problematic voters
      const [deleteResult] = await sequelize.query(
        `
        DELETE FROM voters 
        WHERE name IS NULL 
           OR name = '' 
           OR name = 'Anonymous Voter'
           OR name = 'Registered Voter'
           OR TRIM(name) = ''
      `,
        { transaction }
      );

      console.log(
        `✅ Successfully deleted ${problematicVoters.length} problematic voter records`
      );

      // Update ballot totalVoters counts to reflect the cleanup
      console.log("🔄 Updating ballot voter counts...");
      await sequelize.query(
        `
        UPDATE ballots 
        SET "totalVoters" = (
          SELECT COUNT(*) 
          FROM voters 
          WHERE voters."ballotId" = ballots.id
        )
      `,
        { transaction }
      );

      console.log("✅ Updated ballot voter counts");

      // Commit the transaction
      await transaction.commit();
      console.log("🎉 Cleanup completed successfully!");

      // Show final stats
      const [finalCount] = await sequelize.query(
        "SELECT COUNT(*) as count FROM voters"
      );
      console.log(`📊 Remaining voters in table: ${finalCount[0].count}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupVotersForMigration()
    .then(() => {
      console.log("✅ Cleanup script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Cleanup script failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupVotersForMigration };
