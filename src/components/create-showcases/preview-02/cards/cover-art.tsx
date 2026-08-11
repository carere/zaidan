import { Image } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardDescription, CardFooter } from "@/registry/kobalte/ui/card";
import { Item } from "@/registry/kobalte/ui/item";

export function CoverArt() {
  return (
    <Card>
      <CardContent class="flex flex-col gap-3">
        <div class="text-center text-xs font-normal tracking-wider text-muted-foreground uppercase">
          Cover Art
        </div>
        <Item as="label" for="cover-art" class="aspect-square cursor-pointer" variant="outline">
          <span class="flex size-full items-center justify-center">
            <Image class="size-10 text-muted-foreground/50" />
            <span class="sr-only">Upload cover art</span>
          </span>
        </Item>
        <input id="cover-art" type="file" accept="image/jpeg,image/png" class="sr-only" />
      </CardContent>
      <CardFooter class="flex-col gap-2">
        <Button
          variant="secondary"
          class="w-full"
          onClick={() => document.getElementById("cover-art")?.click()}
        >
          Upload Artwork
        </Button>
        <CardDescription class="text-center text-xs">
          Minimum 3000 × 3000px
          <br />
          JPEG or PNG only
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
