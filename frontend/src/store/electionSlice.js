import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  elections: [],
  currentElection: null,
  electionResults: null,
  voters: [],
  loading: false,
  error: null,
  ballotBuilderState: {
    currentStep: 0,
    ballot: {
      title: "",
      description: "",
      questions: [],
      quickBallot: false,
    },
    duration: {
      startDate: null,
      endDate: null,
    },
    participants: 0,
  },
};

const electionSlice = createSlice({
  name: "elections",
  initialState,
  reducers: {
    // Fetch all elections
    fetchElectionsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchElectionsSuccess: (state, action) => {
      state.elections = action.payload;
      state.loading = false;
    },
    fetchElectionsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Get single election
    getElectionRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    getElectionSuccess: (state, action) => {
      state.currentElection = action.payload;
      state.loading = false;
    },
    getElectionFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Get election results
    getElectionResultsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    getElectionResultsSuccess: (state, action) => {
      state.electionResults = action.payload;
      state.loading = false;
    },
    getElectionResultsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Get voters
    getVotersRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    getVotersSuccess: (state, action) => {
      state.voters = action.payload;
      state.loading = false;
    },
    getVotersFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Ballot Builder actions
    setBallotBuilderStep: (state, action) => {
      state.ballotBuilderState.currentStep = action.payload;
    },
    updateBallotTitle: (state, action) => {
      if (typeof action.payload === "string") {
        state.ballotBuilderState.ballot.title = action.payload;
      } else {
        // Handle object payload with title and quickBallot
        state.ballotBuilderState.ballot.title = action.payload.title;
        state.ballotBuilderState.ballot.quickBallot =
          action.payload.quickBallot;
      }
    },
    updateBallotDescription: (state, action) => {
      state.ballotBuilderState.ballot.description = action.payload;
    },
    addBallotQuestion: (state, action) => {
      state.ballotBuilderState.ballot.questions.push(action.payload);
    },
    updateBallotQuestion: (state, action) => {
      const { index, question } = action.payload;
      state.ballotBuilderState.ballot.questions[index] = question;
    },
    removeBallotQuestion: (state, action) => {
      state.ballotBuilderState.ballot.questions =
        state.ballotBuilderState.ballot.questions.filter(
          (_, index) => index !== action.payload
        );
    },
    setElectionDuration: (state, action) => {
      state.ballotBuilderState.duration = action.payload;
    },
    setParticipantsCount: (state, action) => {
      state.ballotBuilderState.participants = action.payload;
    },
    resetBallotBuilder: (state) => {
      state.ballotBuilderState = initialState.ballotBuilderState;
    },

    // Create election
    createElectionRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createElectionSuccess: (state, action) => {
      state.elections.push(action.payload);
      state.loading = false;
      state.ballotBuilderState = initialState.ballotBuilderState; // Reset after creating
    },
    createElectionFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    clearErrors: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchElectionsRequest,
  fetchElectionsSuccess,
  fetchElectionsFailure,
  getElectionRequest,
  getElectionSuccess,
  getElectionFailure,
  getElectionResultsRequest,
  getElectionResultsSuccess,
  getElectionResultsFailure,
  getVotersRequest,
  getVotersSuccess,
  getVotersFailure,
  setBallotBuilderStep,
  updateBallotTitle,
  updateBallotDescription,
  addBallotQuestion,
  updateBallotQuestion,
  removeBallotQuestion,
  setElectionDuration,
  setParticipantsCount,
  resetBallotBuilder,
  createElectionRequest,
  createElectionSuccess,
  createElectionFailure,
  clearErrors,
} = electionSlice.actions;

export default electionSlice.reducer;
