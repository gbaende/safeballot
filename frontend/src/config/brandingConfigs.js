export const brandingConfigs = {
  // Example brand configs – extend or modify as needed
  acme: {
    brandName: "ACME Corp",
    logo: "/images/logos/acme-logo.png", // put logo assets in public folder
    sponsors: [
      {
        name: "Sponsor One",
        logo: "/images/sponsors/sponsor1.png",
        url: "https://sponsorone.com",
      },
      {
        name: "Sponsor Two",
        logo: "/images/sponsors/sponsor2.png",
        url: "https://sponsortwo.com",
      },
    ],
    primaryColor: "#E53E3E",
  },
  nike: {
    brandName: "Nike",
    logo: "/images/logos/nike.png",
    sponsors: [],
    primaryColor: "#111111",
  },
  sdfc: {
    brandName: "San Diego FC",
    logo: "/images/logos/sdfc.png",
    sponsors: [],
    primaryColor: "#006272", // placeholder teal club colour
  },
  default: {
    brandName: "SafeBallot",
    logo: "/images/logos/safeballot.png",
    sponsors: [],
    primaryColor: "#1976d2",
  },
};
