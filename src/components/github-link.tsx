import { Github } from "lucide-solid";
import { type ComponentProps, createSignal, onMount, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";

const FALLBACK_STAR_COUNT = 50;
const GITHUB_REPO_URL = "https://github.com/carere/zaidan";
const UNGH_API_URL = "https://ungh.cc/repos/carere/zaidan";

interface UnghRepoResponse {
  repo: {
    stars: number;
    forks: number;
    watchers: number;
  };
}

async function getGithubStarCount(): Promise<number> {
  try {
    const response = await fetch(UNGH_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as UnghRepoResponse;
    return data.repo?.stars ?? FALLBACK_STAR_COUNT;
  } catch (error) {
    console.warn("Failed to fetch GitHub stars:", error);
    return FALLBACK_STAR_COUNT;
  }
}

type GitHubLinkProps = Omit<ComponentProps<"a">, "href" | "target" | "rel">;

export function GitHubLink(props: GitHubLinkProps) {
  const [local, others] = splitProps(props, ["class"]);
  const [stars, setStars] = createSignal(FALLBACK_STAR_COUNT);

  onMount(async () => {
    const count = await getGithubStarCount();
    setStars(count);
  });

  const formatStarCount = () => {
    const count = stars();
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      class={cn("size-8 w-auto gap-1.5 px-2", local.class)}
      title={`View on GitHub (${stars()} stars)`}
      as="a"
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      {...others}
    >
      <span class="sr-only">View Zaidan on GitHub</span>
      <Github class="size-4" />
      <span class="font-medium text-xs tabular-nums">{formatStarCount()}</span>
    </Button>
  );
}
