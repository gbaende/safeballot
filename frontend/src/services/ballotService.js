export const castVote = async (ballotId, voteData) => {
  return apiClient.post(`/ballots/${ballotId}/vote`, voteData);
};
