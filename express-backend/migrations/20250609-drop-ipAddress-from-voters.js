"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop ipAddress column from Voters table
    await queryInterface.removeColumn("Voters", "ipAddress");
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add ipAddress column (nullable string) on rollback
    await queryInterface.addColumn("Voters", "ipAddress", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
