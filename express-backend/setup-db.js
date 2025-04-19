const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

// Function to create the database if it doesn't exist
async function setupDatabase() {
  // Extract database name from connection string
  const urlParts = process.env.DATABASE_URL.split("/");
  const dbName = urlParts[urlParts.length - 1];

  // Create connection string to postgres database to create our app database
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
    console.log(
      "Connected to postgres database to check if app database exists"
    );

    // Check if our database exists
    const checkResult = await client.query(
      `
      SELECT 1 FROM pg_database WHERE datname = $1
    `,
      [dbName]
    );

    // If the database doesn't exist, create it
    if (checkResult.rowCount === 0) {
      console.log(`Database ${dbName} does not exist, creating it...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully`);
    } else {
      // Database already exists, don't recreate it
      console.log(`Database ${dbName} already exists, using existing database`);
    }
  } catch (err) {
    console.error("Error setting up database:", err);
    // In case of "role does not exist" error
    if (
      err.message.includes("role") &&
      err.message.includes("does not exist")
    ) {
      console.log("Could not connect to PostgreSQL with the specified user.");
      console.log(
        "Please ensure PostgreSQL is installed and running and that the user in DATABASE_URL has appropriate permissions."
      );
      console.log(
        `Using your system username (${process.env.USER}) may work better on macOS.`
      );
    }
  } finally {
    // Close the connection
    await client.end();
    console.log("Database setup completed");
  }
}

// Run the function if this script is run directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase;
