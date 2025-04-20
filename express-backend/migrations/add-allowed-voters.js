"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First add the column if it doesn't exist
    await queryInterface
      .addColumn("ballots", "allowedVoters", {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment:
          "Number of voters allowed to register, as set by admin during creation",
      })
      .catch((error) => {
        console.log("Column allowedVoters might already exist", error.message);
      });

    // Now update existing records to set allowedVoters to totalVoters or default of 10
    const [ballots] = await queryInterface.sequelize.query(
      "SELECT id, totalVoters FROM ballots WHERE allowedVoters IS NULL OR allowedVoters = 0"
    );

    for (const ballot of ballots) {
      await queryInterface.sequelize.query(
        `UPDATE ballots SET allowedVoters = ${
          ballot.totalVoters || 10
        } WHERE id = '${ballot.id}'`
      );
    }

    // Log migration completion
    console.log("Migration completed: Added allowedVoters to ballots table");
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the column on rollback
    await queryInterface.removeColumn("ballots", "allowedVoters");
    return Promise.resolve();
  },
};
