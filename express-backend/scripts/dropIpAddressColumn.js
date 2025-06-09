const { sequelize } = require("../database/connection");

async function dropIpAddressColumn() {
  try {
    console.log("🔧 Starting ipAddress column removal...");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    // Start transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Check if ipAddress column exists
      const [results] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'voters' AND column_name = 'ipAddress';`,
        { transaction }
      );

      if (results.length === 0) {
        console.log("✅ ipAddress column does not exist (already removed)");
        await transaction.rollback();
        return;
      }

      // Drop ipAddress column from voters table
      await sequelize.query(`ALTER TABLE voters DROP COLUMN "ipAddress";`, {
        transaction,
      });
      console.log("✅ Dropped ipAddress column from voters table");

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
  dropIpAddressColumn()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = dropIpAddressColumn;
