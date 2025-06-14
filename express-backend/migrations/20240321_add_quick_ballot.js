"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ballots", "quickBallot", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this ballot allows instant voting without registration",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("ballots", "quickBallot");
  },
};
