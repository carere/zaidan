import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer>
      <div class="container-wrapper px-4 xl:px-6">
        <div class="flex h-(--footer-height) items-center justify-between">
          <div class="w-full px-1 text-center text-xs leading-loose text-muted-foreground sm:text-sm">
            Built by{" "}
            <a
              href={siteConfig.author.url}
              target="_blank"
              rel="noreferrer"
              class="font-medium underline underline-offset-4"
            >
              {siteConfig.author.name}
            </a>
            . The source code is available on{" "}
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              class="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </div>
        </div>
      </div>
    </footer>
  );
}
