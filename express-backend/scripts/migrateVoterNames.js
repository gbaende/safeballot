const { sequelize } = require("../database/connection");

/**
 * Script to migrate existing voter names to firstName/lastName fields
 * This populates the new fields from the existing name column
 */
async function migrateVoterNames() {
  console.log("🔄 Starting migration of voter names to firstName/lastName...");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Start a transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // First, add the firstName and lastName columns if they don't exist
      console.log("📋 Adding firstName and lastName columns...");

      try {
        await sequelize.query(
          `
          ALTER TABLE voters 
          ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255)
        `,
          { transaction }
        );
        console.log("✅ Added firstName and lastName columns");
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log("✅ firstName and lastName columns already exist");
        } else {
          throw error;
        }
      }

      // Get all voters with names that need to be split
      const [votersToMigrate] = await sequelize.query(
        `
        SELECT id, name, "firstName", "lastName"
        FROM voters 
        WHERE name IS NOT NULL 
          AND name != ''
          AND ("firstName" IS NULL OR "lastName" IS NULL)
        ORDER BY "createdAt" DESC
      `,
        { transaction }
      );

      console.log(`📊 Found ${votersToMigrate.length} voters to migrate`);

      if (votersToMigrate.length === 0) {
        console.log(
          "✅ No migration needed - all voters already have firstName/lastName"
        );
        await transaction.rollback();
        return;
      }

      // Migrate each voter
      let migratedCount = 0;
      for (const voter of votersToMigrate) {
        const nameParts = voter.name.trim().split(/\s+/);
        let firstName, lastName;

        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(" ");
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = "User"; // Default last name
        } else {
          continue; // Skip empty names
        }

        // Update the voter record
        await sequelize.query(
          `
          UPDATE voters 
          SET "firstName" = :firstName, "lastName" = :lastName
          WHERE id = :id
        `,
          {
            replacements: { firstName, lastName, id: voter.id },
            transaction,
          }
        );

        migratedCount++;

        if (migratedCount <= 10) {
          console.log(`  ✅ ${voter.name} → ${firstName} ${lastName}`);
        }
      }

      if (migratedCount > 10) {
        console.log(`  ... and ${migratedCount - 10} more`);
      }

      console.log(`✅ Successfully migrated ${migratedCount} voter names`);

      // Commit the transaction
      await transaction.commit();
      console.log("🎉 Migration completed successfully!");

      // Show final stats
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total,
          COUNT("firstName") as with_first_name,
          COUNT("lastName") as with_last_name
        FROM voters
      `);

      console.log("📊 Final statistics:");
      console.log(`  Total voters: ${stats[0].total}`);
      console.log(`  With firstName: ${stats[0].with_first_name}`);
      console.log(`  With lastName: ${stats[0].with_last_name}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateVoterNames()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateVoterNames };
