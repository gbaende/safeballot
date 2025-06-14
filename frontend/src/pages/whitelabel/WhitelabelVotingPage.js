import React from "react";
import { useParams } from "react-router-dom";
import VotingPage from "../Ballot/VotingPage";
import { brandingConfigs } from "../../config/brandingConfigs";

/**
 * Wrapper around the core VotingPage that injects whitelabel branding based
 * on the `brand` path parameter. Example URL:
 *   /acme/vote/<ballotId>/<slug>
 *
 * If no brand configuration is found, the default brand will be used.
 */
const WhitelabelVotingPage = () => {
  // React-router v6 will merge params from the route, so we only need brand
  const { brand } = useParams();
  const branding = brandingConfigs[brand] || brandingConfigs["default"];

  return <VotingPage branding={branding} />;
};

export default WhitelabelVotingPage;
