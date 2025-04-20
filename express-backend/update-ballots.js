// Simple script to update existing ballots with allowedVoters field
const { Ballot } = require("./models/ballot.model");
const { sequelize } = require("./database/connection");

async function updateBallots() {
  try {
    console.log("Starting database update for ballots...");

    // First make sure the column exists
    try {
      await sequelize.query(
        'ALTER TABLE ballots ADD COLUMN IF NOT EXISTS "allowedVoters" INTEGER DEFAULT 10'
      );
      console.log("✅ Added allowedVoters column (if it didn't exist)");
    } catch (error) {
      console.log("Column might already exist:", error.message);
    }

    // Get all ballots
    const ballots = await Ballot.findAll();
    console.log(`Found ${ballots.length} ballots to check...`);

    // Update each one if needed
    let updatedCount = 0;
    for (const ballot of ballots) {
      if (!ballot.allowedVoters || ballot.allowedVoters === 0) {
        // Determine a good value to use
        const newValue = Math.max(ballot.totalVoters || 0, 10);

        console.log(
          `Updating ballot ${ballot.id}: Setting allowedVoters = ${newValue}`
        );
        ballot.allowedVoters = newValue;
        await ballot.save();
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} ballots with allowedVoters values`);
    console.log("Database update complete!");

    // Exit cleanly
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating database:", error);
    process.exit(1);
  }
}

// Run the update
updateBallots();
