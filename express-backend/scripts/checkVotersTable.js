const { sequelize } = require("../database/connection");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    // Get table structure
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'voters' 
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Current voters table structure:");
    results.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    // Get count of voters
    const [count] = await sequelize.query(
      "SELECT COUNT(*) as count FROM voters"
    );
    console.log(`\n📊 Total voters in table: ${count[0].count}`);

    // Check if there are any voters with missing name data
    const [emptyNames] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM voters 
      WHERE name IS NULL OR name = '' OR name = 'Anonymous Voter'
    `);
    console.log(`📊 Voters with empty/anonymous names: ${emptyNames[0].count}`);

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
