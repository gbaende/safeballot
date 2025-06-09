const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");
const { User } = require("./user.model");

const Ballot = sequelize.define(
  "Ballot",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("draft", "scheduled", "active", "completed"),
      defaultValue: "draft",
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    requiresVerification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    requiresAuthentication: {
      type: DataTypes.BOOLEAN,
      defaultValue: process.env.NODE_ENV === "staging",
    },
    verificationMethod: {
      type: DataTypes.ENUM("email", "sms", "id_document", "digital_key"),
      defaultValue: "email",
    },
    createdBy: {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    allowedVoters: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment:
        "Number of voters allowed to register, as set by admin during creation",
    },
    totalVoters: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of voters who have registered",
    },
    ballotsReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of completed votes received",
    },
    // Secure access key for public ballot links
    accessKey: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    // Track how many times the access key has been used
    keyUsageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Maximum number of times the key can be used (null for unlimited)
    maxKeyUsage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Whether the access key is enabled
    accessKeyEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "ballots",
    timestamps: true,
  }
);

// Define the Question model
const Question = sequelize.define(
  "Question",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    questionType: {
      type: DataTypes.ENUM("single_choice", "multiple_choice", "rank_choice"),
      defaultValue: "single_choice",
    },
    maxSelections: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    ballotId: {
      type: DataTypes.UUID,
      references: {
        model: "ballots",
        key: "id",
      },
    },
  },
  {
    tableName: "questions",
    timestamps: true,
  }
);

// Define the Choice model
const Choice = sequelize.define(
  "Choice",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    questionId: {
      type: DataTypes.UUID,
      references: {
        model: "questions",
        key: "id",
      },
    },
  },
  {
    tableName: "choices",
    timestamps: true,
  }
);

// Define the Voter model
const Voter = sequelize.define(
  "Voter",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Name cannot be empty",
        },
        notAnonymousWithRealEmail(value) {
          if (
            value === "Anonymous Voter" &&
            this.email &&
            !this.email.includes("anonymous-")
          ) {
            throw new Error(
              "Cannot set name to 'Anonymous Voter' with a real email address"
            );
          }
        },
      },
      defaultValue: "Registered Voter",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ssn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
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
      allowNull: true,
    },
    voterId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hasVoted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ballotId: {
      type: DataTypes.UUID,
      references: {
        model: "ballots",
        key: "id",
      },
    },
  },
  {
    tableName: "voters",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["ballotId", "email"],
        name: "unique_ballot_voter",
      },
    ],
    hooks: {
      beforeSave: (voter, options) => {
        if (
          (voter.name === "Anonymous Voter" || !voter.name) &&
          voter.email &&
          !voter.email.includes("anonymous-")
        ) {
          const username = voter.email.split("@")[0];
          voter.name = username
            .split(/[._-]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          console.log(
            `Auto-improved voter name from email ${voter.email} to ${voter.name}`
          );
        }
      },
    },
  }
);

// Define the Vote model
const Vote = sequelize.define(
  "Vote",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    voterId: {
      type: DataTypes.UUID,
      references: {
        model: "voters",
        key: "id",
      },
    },
    ballotId: {
      type: DataTypes.UUID,
      references: {
        model: "ballots",
        key: "id",
      },
    },
    questionId: {
      type: DataTypes.UUID,
      references: {
        model: "questions",
        key: "id",
      },
    },
    choiceId: {
      type: DataTypes.UUID,
      references: {
        model: "choices",
        key: "id",
      },
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    voteTimestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    castAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "votes",
    timestamps: true,
  }
);

// Define associations
Ballot.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Ballot.hasMany(Question, { foreignKey: "ballotId", as: "questions" });
Ballot.hasMany(Voter, { foreignKey: "ballotId", as: "voters" });

Question.belongsTo(Ballot, { foreignKey: "ballotId" });
Question.hasMany(Choice, { foreignKey: "questionId", as: "choices" });

Choice.belongsTo(Question, { foreignKey: "questionId" });
Choice.hasMany(Vote, { foreignKey: "choiceId", as: "votes" });

Voter.belongsTo(Ballot, { foreignKey: "ballotId" });
Voter.hasMany(Vote, { foreignKey: "voterId", as: "votes" });

Vote.belongsTo(Voter, { foreignKey: "voterId" });
Vote.belongsTo(Ballot, { foreignKey: "ballotId" });
Vote.belongsTo(Question, { foreignKey: "questionId" });
Vote.belongsTo(Choice, { foreignKey: "choiceId" });

// Add a function to generate and set a secure access key
Ballot.prototype.generateAccessKey = async function () {
  // Generate a secure random key
  const crypto = require("crypto");
  const accessKey = crypto.randomBytes(24).toString("hex");

  // Update the ballot with the new key
  this.accessKey = accessKey;
  await this.save();

  return accessKey;
};

// Add a function to validate and increment the access key usage
Ballot.prototype.validateAccessKey = async function (key) {
  // Check if keys match
  if (this.accessKey !== key) {
    return { valid: false, reason: "invalid_key" };
  }

  // Check if key is enabled
  if (!this.accessKeyEnabled) {
    return { valid: false, reason: "key_disabled" };
  }

  // Check usage limits if set
  if (this.maxKeyUsage !== null && this.keyUsageCount >= this.maxKeyUsage) {
    return { valid: false, reason: "usage_limit_reached" };
  }

  // Increment usage count
  this.keyUsageCount += 1;
  await this.save();

  return { valid: true, ballot: this };
};

module.exports = { Ballot, Question, Choice, Voter, Vote };
