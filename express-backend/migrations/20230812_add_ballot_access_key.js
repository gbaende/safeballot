"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Ballots", "accessKey", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn("Ballots", "keyUsageCount", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addColumn("Ballots", "maxKeyUsage", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("Ballots", "accessKeyEnabled", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Ballots", "accessKey");
    await queryInterface.removeColumn("Ballots", "keyUsageCount");
    await queryInterface.removeColumn("Ballots", "maxKeyUsage");
    await queryInterface.removeColumn("Ballots", "accessKeyEnabled");
  },
};
