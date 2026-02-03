import { createMemo, createResource, Suspense } from "solid-js";

import { Github } from "@/components/icons/github";
import { Button } from "@/registry/kobalte/ui/button";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";

export function StarsCount() {
  const [data] = createResource(async () => {
    const response = await fetch("https://api.github.com/repos/carere/zaidan", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "zaidan-app/1.0.0",
      },
    });
    return (await response.json()) as { stargazers_count: number };
  });

  const formattedCount = createMemo(() => {
    const json = data();
    if (!json) return;
    return json.stargazers_count >= 1000
      ? `${Math.round(json.stargazers_count / 1000)}k`
      : json.stargazers_count.toLocaleString();
  });

  return <span class="w-fit text-muted-foreground text-xs tabular-nums">{formattedCount()}</span>;
}

export function GitHubLink() {
  return (
    <Button
      as="a"
      href="https://github.com/carere/zaidan"
      target="_blank"
      rel="noreferrer"
      size="sm"
      variant="ghost"
      class="h-8 shadow-none"
    >
      <Github class="fill-foreground" />
      <Suspense fallback={<Skeleton class="h-4 w-[42px]" />}>
        <StarsCount />
      </Suspense>
    </Button>
  );
}
