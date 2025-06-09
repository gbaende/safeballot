const { sequelize } = require("../database/connection");

/**
 * Script to clean up duplicate email addresses in voters table
 * Keeps the most recent record for each email and removes duplicates
 */
async function cleanupDuplicateEmails() {
  console.log("🧹 Starting cleanup of duplicate email addresses...");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Start a transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Find duplicate emails
      const [duplicateEmails] = await sequelize.query(
        `
        SELECT email, COUNT(*) as count
        FROM voters 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `,
        { transaction }
      );

      console.log(
        `📊 Found ${duplicateEmails.length} duplicate email addresses`
      );

      if (duplicateEmails.length === 0) {
        console.log("✅ No duplicate emails found");
        await transaction.rollback();
        return;
      }

      // Log the duplicate emails
      console.log("🔍 Duplicate emails found:");
      duplicateEmails.forEach((dup, index) => {
        console.log(`  ${index + 1}. ${dup.email} (${dup.count} records)`);
      });

      let totalDeleted = 0;

      // For each duplicate email, keep the most recent record and delete the rest
      for (const dupEmail of duplicateEmails) {
        const [votersWithEmail] = await sequelize.query(
          `
          SELECT id, email, name, "createdAt", "ballotId"
          FROM voters 
          WHERE email = :email
          ORDER BY "createdAt" DESC
        `,
          {
            replacements: { email: dupEmail.email },
            transaction,
          }
        );

        // Keep the first (most recent) record, delete the rest
        const votersToDelete = votersWithEmail.slice(1);

        console.log(`📧 Processing ${dupEmail.email}:`);
        console.log(
          `  ✅ Keeping: ID ${votersWithEmail[0].id} (${votersWithEmail[0].createdAt})`
        );
        console.log(`  ❌ Deleting: ${votersToDelete.length} older records`);

        if (votersToDelete.length > 0) {
          // Delete each voter individually to avoid array syntax issues
          for (const voter of votersToDelete) {
            await sequelize.query(`DELETE FROM voters WHERE id = :id`, {
              replacements: { id: voter.id },
              transaction,
            });
          }

          totalDeleted += votersToDelete.length;
        }
      }

      console.log(
        `✅ Successfully deleted ${totalDeleted} duplicate voter records`
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

      // Verify no more duplicates
      const [remainingDuplicates] = await sequelize.query(`
        SELECT email, COUNT(*) as count
        FROM voters 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
      `);

      if (remainingDuplicates.length === 0) {
        console.log("✅ No duplicate emails remaining");
      } else {
        console.log(
          `⚠️ Still have ${remainingDuplicates.length} duplicate emails`
        );
      }
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
  cleanupDuplicateEmails()
    .then(() => {
      console.log("✅ Cleanup script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Cleanup script failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicateEmails };
