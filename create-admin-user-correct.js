const { sequelize } = require("./database/connection");
const { User } = require("./models/user.model");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    // Delete existing user if exists
    await User.destroy({ where: { email: "gedeonbaende1234@gmail.com" } });
    console.log("Deleted existing user if any");

    // Create admin user - let the model handle password hashing
    const user = await User.create({
      name: "Gedeon Baende",
      email: "gedeonbaende1234@gmail.com",
      password: "password123", // Plain text - model will hash it
      role: "admin",
      isVerified: true,
    });

    console.log("Admin user created successfully:", user.email);
    console.log("Login credentials: gedeonbaende1234@gmail.com / password123");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
