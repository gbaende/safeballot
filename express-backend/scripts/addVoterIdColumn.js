const { sequelize } = require("../database/connection");

async function addVoterIdColumn() {
  try {
    console.log("🔧 Starting voterId column migration...");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    // Start transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Check if voterId column already exists
      const [results] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'voters' AND column_name = 'voterId';`,
        { transaction }
      );

      if (results.length > 0) {
        console.log("✅ voterId column already exists");
        await transaction.rollback();
        return;
      }

      // Add voterId column to voters table
      await sequelize.query(
        `ALTER TABLE voters ADD COLUMN "voterId" VARCHAR(255) UNIQUE;`,
        { transaction }
      );
      console.log("✅ Added voterId column to voters table");

      // Create index for better performance
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_voters_voter_id ON voters("voterId");`,
        { transaction }
      );
      console.log("✅ Created index on voterId column");

      // Commit transaction
      await transaction.commit();
      console.log("🎯 Migration completed successfully!");

      // Show updated schema
      const [updatedResults] = await sequelize.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'voters' 
         ORDER BY ordinal_position;`
      );

      console.log("\n📋 Updated voters table schema:");
      updatedResults.forEach((col) =>
        console.log(
          `  - ${col.column_name}: ${col.data_type} (${
            col.is_nullable === "YES" ? "nullable" : "not null"
          })`
        )
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
if (require.main === module) {
  addVoterIdColumn()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = addVoterIdColumn;
