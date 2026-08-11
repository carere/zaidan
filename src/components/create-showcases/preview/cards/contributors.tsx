import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/registry/kobalte/ui/card";

// GitHub usernames displayed as contributor avatars.
const usernames = [
  "shadcn",
  "vercel",
  "nextjs",
  "tailwindlabs",
  "typescript-lang",
  "eslint",
  "prettier",
  "babel",
  "webpack",
  "rollup",
  "parcel",
  "vite",
  "react",
  "vue",
  "angular",
  "solid",
];

export function Contributors() {
  return (
    <Card class="max-w-sm">
      <CardHeader>
        <CardTitle>
          Contributors <Badge variant="secondary">312</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <For each={usernames}>
            {(username) => (
              <Avatar class="grayscale">
                <AvatarImage src={`https://github.com/${username}.png`} alt={username} />
                <AvatarFallback>{username.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </For>
        </div>
      </CardContent>
      <CardFooter>
        <a href="/" class="text-sm underline underline-offset-4">
          + 810 contributors
        </a>
      </CardFooter>
    </Card>
  );
}

import { For } from "solid-js";
