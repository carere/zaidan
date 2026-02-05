export const siteConfig = {
  name: "Zaidan",
  url: "https://zaidan.carere.dev",
  description:
    "A beautiful ShadCN UI registry for SolidJS - accessible, customizable components built on Kobalte and Corvu.",
  author: {
    name: "Kevin Abatan",
    url: "https://github.com/carere",
  },
  links: {
    github: "https://github.com/carere/zaidan",
  },
  ogImage: "/og-image.png",
  twitterHandle: undefined,
} as const;

export type SiteConfig = typeof siteConfig;
