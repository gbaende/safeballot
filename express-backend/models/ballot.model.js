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
      defaultValue: true,
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
    totalVoters: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    ballotsReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    },
    name: {
      type: DataTypes.STRING,
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

module.exports = { Ballot, Question, Choice, Voter, Vote };
