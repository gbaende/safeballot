import api, { ballotService as apiBallotService } from "./api";

/**
 * Get voter information from localStorage and session storage
 * @param {string} ballotId - The ballot ID
 * @returns {object|null} The voter information object or null if not found
 */
export const getVoterInfo = (ballotId) => {
  let voterInfo = null;

  // Try all possible sources where voter info might be stored
  const sources = [
    // Ballot-specific storage (preferred)
    { type: "localStorage", key: `voter_info_${ballotId}` },
    // Session storage
    { type: "sessionStorage", key: "voterInfo" },
    // General localStorage
    { type: "localStorage", key: "voterInfo" },
    // Voter user data
    { type: "localStorage", key: "voterUser" },
    // User data
    { type: "localStorage", key: "user" },
  ];

  // Try each source in order of preference
  for (const source of sources) {
    try {
      let data = null;
      if (source.type === "localStorage") {
        data = localStorage.getItem(source.key);
      } else if (source.type === "sessionStorage") {
        data = sessionStorage.getItem(source.key);
      }

      if (data) {
        const parsedData = JSON.parse(data);

        // Extract appropriate information based on data structure
        if (source.key === "user" || source.key === "voterUser") {
          voterInfo = {
            name: parsedData.name,
            email: parsedData.email,
          };
        } else {
          voterInfo = parsedData;
        }

        console.log(`Retrieved voter info from ${source.type}.${source.key}:`, {
          name: voterInfo.name,
          hasEmail: !!voterInfo.email,
        });

        // If we found valid info, return it
        if (voterInfo && voterInfo.name && voterInfo.email) {
          return voterInfo;
        }
      }
    } catch (e) {
      console.warn(
        `Error extracting voter info from ${source.type}.${source.key}:`,
        e
      );
    }
  }

  // Final fallback: try to construct from separate fields
  try {
    const verifiedEmail = localStorage.getItem(`verified_email_${ballotId}`);
    const verifiedName = localStorage.getItem(`verified_name_${ballotId}`);

    if (
      verifiedEmail ||
      verifiedName ||
      localStorage.getItem("voterEmail") ||
      localStorage.getItem("voterName")
    ) {
      voterInfo = {
        name:
          verifiedName ||
          localStorage.getItem("voterName") ||
          "Registered Voter",
        email: verifiedEmail || localStorage.getItem("voterEmail"),
      };

      console.log("Constructed voter info from separate fields:", voterInfo);
      return voterInfo;
    }
  } catch (e) {
    console.warn("Error constructing voter info from separate fields:", e);
  }

  return null;
};

// Export the ballotService functions from api.js
export const ballotService = {
  ...apiBallotService,
  getVoterInfo,
  // Override castVote to include voter information
  castVote: async (ballotId, voteData) => {
    console.log(`[VOTE API] Casting vote for ballot ${ballotId}`);

    // Ensure we have voter info in the payload
    if (!voteData.voter || !voteData.voter.name) {
      console.log(
        "[VOTE API] No voter info in payload, attempting to retrieve"
      );
      voteData.voter = getVoterInfo(ballotId);
      console.log("[VOTE API] Retrieved voter info:", voteData.voter);
    }

    // Log the full payload that will be sent
    console.log("[VOTE API] Final vote payload:", {
      rankings: voteData.rankings ? Object.keys(voteData.rankings).length : 0,
      voter: voteData.voter,
    });

    try {
      // Use the authenticated voter-vote endpoint with our API instance
      const response = await api.post(
        `/ballots/${ballotId}/voter-vote`,
        voteData
      );

      // Store that this user has voted on this ballot
      localStorage.setItem(`hasVoted_${ballotId}`, "true");

      console.log("[VOTE API] Vote cast successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("[VOTE API] Error casting vote:", error);
      throw error;
    }
  },
};
