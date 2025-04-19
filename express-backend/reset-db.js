const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

// Function to reset the database
async function resetDatabase() {
  // Extract database name from connection string
  const urlParts = process.env.DATABASE_URL.split("/");
  const dbName = urlParts[urlParts.length - 1];

  // Create connection string to postgres database
  const adminConString = process.env.DATABASE_URL.replace(
    `/${dbName}`,
    "/postgres"
  );

  const client = new Client({
    connectionString: adminConString,
  });

  try {
    // Connect to the postgres database
    await client.connect();
    console.log("Connected to postgres database to reset app database");

    // Force disconnect all other connections first
    await client.query(
      `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
    `,
      [dbName]
    );

    // Drop and recreate the database
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Database ${dbName} dropped successfully`);

    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database ${dbName} recreated successfully`);
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    // Close the connection
    await client.end();
    console.log("Database reset completed");
  }
}

// Run the function if this script is run directly
if (require.main === module) {
  resetDatabase().catch(console.error);
}

module.exports = resetDatabase;
