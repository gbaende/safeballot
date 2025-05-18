import { useState, useEffect, useRef } from "react";
import { electionService, ballotService } from "../services/api";

/**
 * Custom hook to fetch ballots/elections from the API or localStorage
 * @returns {Object} The elections data, loading state, and error state
 */
const useFetchBallots = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    // Skip if we've already fetched data
    if (dataFetchedRef.current) return;

    const fetchData = async () => {
      dataFetchedRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // First try to get data from localStorage
        const userBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );

        if (userBallots.length > 0) {
          console.log(
            "useFetchBallots: Using existing ballots from localStorage:",
            userBallots.length
          );
          setElections(userBallots);
          setLoading(false);
          return;
        }

        // If no localStorage data, try the API
        try {
          console.log("useFetchBallots: Fetching from API...");
          const response = await ballotService.getBallots();
          console.log("useFetchBallots: API response:", response);

          if (response.data && response.data.data) {
            // Filter for current user's ballots
            const adminUser = JSON.parse(
              localStorage.getItem("adminUser") || "{}"
            );
            const userId = adminUser.id;
            const userEmail = adminUser.email;

            const userBallots = response.data.data.filter((ballot) => {
              if (!userId && !userEmail) return false;

              // Check ID-based ownership
              const idMatch =
                ballot.userId === userId ||
                ballot.user_id === userId ||
                ballot.created_by === userId ||
                ballot.createdBy === userId ||
                ballot.creator_id === userId ||
                ballot.creatorId === userId ||
                ballot.admin_id === userId ||
                ballot.adminId === userId ||
                ballot.owner_id === userId ||
                ballot.ownerId === userId;

              // Check email-based ownership
              const emailMatch =
                userEmail &&
                (ballot.admin_email === userEmail ||
                  ballot.adminEmail === userEmail ||
                  ballot.creator_email === userEmail ||
                  ballot.creatorEmail === userEmail ||
                  ballot.user_email === userEmail ||
                  ballot.userEmail === userEmail ||
                  ballot.owner_email === userEmail ||
                  ballot.ownerEmail === userEmail);

              return idMatch || emailMatch;
            });

            // Store in localStorage for future use
            localStorage.setItem("userBallots", JSON.stringify(userBallots));

            setElections(userBallots);
          } else {
            setElections([]);
          }
        } catch (apiError) {
          console.error("API fetch failed, trying fallback methods:", apiError);

          // Try to get elections from various other endpoints
          try {
            const recentResponse = await electionService.getRecentElections();
            if (
              recentResponse.data &&
              recentResponse.data.data &&
              recentResponse.data.data.length > 0
            ) {
              setElections(recentResponse.data.data);
              return;
            }
          } catch (e) {
            console.error("Failed to get recent elections:", e);
          }

          // Finally set error if nothing worked
          setError("Failed to fetch elections. Please try again later.");
        }
      } catch (err) {
        console.error("Error in useFetchBallots:", err);
        setError("An error occurred while fetching elections data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { elections, loading, error };
};

export default useFetchBallots;
