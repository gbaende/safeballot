const { sequelize } = require("../database/connection");

/**
 * Script to clean up voter records with null firstName values
 * This needs to run before the migration that adds NOT NULL constraint
 */
async function cleanupNullVoters() {
  console.log("🧹 Starting cleanup of voter records with null firstName...");

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Check how many voters have null firstName
    const [nullVotersCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM voters WHERE "firstName" IS NULL`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`📊 Found ${nullVotersCount.count} voters with null firstName`);

    if (nullVotersCount.count === 0) {
      console.log("✅ No cleanup needed - all voters have firstName values");
      return;
    }

    // Get details of voters to be deleted for logging
    const [votersToDelete] = await sequelize.query(
      `SELECT id, email, name, "ballotId", "createdAt" 
       FROM voters 
       WHERE "firstName" IS NULL 
       ORDER BY "createdAt" DESC 
       LIMIT 10`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log("🔍 Sample voters to be deleted:");
    votersToDelete.forEach((voter, index) => {
      console.log(
        `  ${index + 1}. ID: ${voter.id}, Email: ${voter.email}, Name: ${
          voter.name
        }, Ballot: ${voter.ballotId}`
      );
    });

    if (nullVotersCount.count > 10) {
      console.log(`  ... and ${nullVotersCount.count - 10} more`);
    }

    // Delete voters with null firstName
    const [result] = await sequelize.query(
      `DELETE FROM voters WHERE "firstName" IS NULL`,
      { type: sequelize.QueryTypes.DELETE }
    );

    console.log(
      `✅ Successfully deleted ${nullVotersCount.count} voter records with null firstName`
    );

    // Update ballot totalVoters counts to reflect the cleanup
    console.log("🔄 Updating ballot voter counts...");
    await sequelize.query(`
      UPDATE ballots 
      SET "totalVoters" = (
        SELECT COUNT(*) 
        FROM voters 
        WHERE voters."ballotId" = ballots.id
      )
    `);

    console.log("✅ Updated ballot voter counts");
    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupNullVoters()
    .then(() => {
      console.log("✅ Cleanup script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Cleanup script failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupNullVoters };
