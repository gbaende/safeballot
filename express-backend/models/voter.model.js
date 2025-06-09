const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const Voter = sequelize.define(
  "Voter",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    voterId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        len: [1, 255],
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
      },
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
      },
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [2, 2], // State abbreviation
      },
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [5, 10], // ZIP code can be 5 or 9 digits
      },
    },
    ssn: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [9, 9], // SSN without dashes
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [10, 10], // Phone number without formatting
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verificationTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    registrationDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // Legacy fields for backward compatibility with existing ballot system
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.firstName && this.lastName) {
          return `${this.firstName} ${this.lastName}`;
        }
        // Fallback to stored name if firstName/lastName not available
        return this.getDataValue("storedName") || "Registered Voter";
      },
    },
    // Store the original name field for backward compatibility
    storedName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "name", // Maps to the existing 'name' column
    },
    ballotId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "ballots",
        key: "id",
      },
    },
    verificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hasVoted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "voters",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["ballotId"],
      },
      {
        fields: ["isVerified"],
      },
    ],
    hooks: {
      beforeSave: async (voter, options) => {
        // If firstName/lastName are not set but storedName is, try to split it
        if (!voter.firstName && !voter.lastName && voter.storedName) {
          const nameParts = voter.storedName.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            voter.firstName = nameParts[0];
            voter.lastName = nameParts.slice(1).join(" ");
          } else if (nameParts.length === 1) {
            voter.firstName = nameParts[0];
            voter.lastName = "User"; // Default last name
          }
        }

        // If firstName/lastName are set but storedName is not, create storedName
        if (voter.firstName && voter.lastName && !voter.storedName) {
          voter.storedName = `${voter.firstName} ${voter.lastName}`;
        }
      },
    },
  }
);

module.exports = Voter;
