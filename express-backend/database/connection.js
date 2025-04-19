const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

// Parse the DATABASE_URL if provided, otherwise use individual params
let sequelize;

if (process.env.DATABASE_URL) {
  // Using connection string directly instead of URL property to avoid parsing issues
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  });
} else {
  // Using individual params - fallback
  sequelize = new Sequelize({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || process.env.USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "safeballot",
    dialect: "postgres",
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  });
}

// Connect to database
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Successfully connected to the database");

    // Create the database if it doesn't exist (this won't work in PostgreSQL directly)
    // But we can try to sync the models which will create tables if they don't exist
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("Database migrations completed");
    }

    return sequelize;
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
};
