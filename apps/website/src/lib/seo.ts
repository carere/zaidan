import { siteConfig } from "./site";

type PageMetadata = {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
};

export function createPageHead(page: PageMetadata) {
  const title = page.title === "Home" ? siteConfig.name : `${page.title} - ${siteConfig.name}`;
  const url = `${siteConfig.url}${page.path ?? ""}`;
  const image = page.image ?? `${siteConfig.url}${siteConfig.ogImage}`;

  return {
    meta: [
      // Basic meta
      { name: "description", content: page.description },
      { title: title },

      // Open Graph
      { property: "og:type", content: page.type ?? "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: url },
      { property: "og:site_name", content: siteConfig.name },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: page.description },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: page.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
