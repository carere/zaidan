import { Link } from "@tanstack/solid-router";
import { ArrowRightIcon } from "lucide-solid";
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";

export function HomeHero() {
  return (
    <PageHeader class="md:**:[.container]:pb-8 lg:**:[.container]:pb-12">
      <Link to="/docs/changelog/$slug" params={{ slug: "image-crop-and-agent-docs" }} class="group">
        <Badge variant="secondary" class="bg-muted">
          <span>New: Image Crop and simpler Zaidan Agent</span>
          <ArrowRightIcon class="transition-transform group-hover:translate-x-0.5" />
        </Badge>
      </Link>

      <PageHeaderHeading class="max-w-4xl">
        The best foundation for your next SolidJS project
      </PageHeaderHeading>

      <PageHeaderDescription>
        Beautifully designed, accessible components built on Kobalte and Corvu. Copy, paste, and
        ship — or pull them in via the shadcn CLI.
      </PageHeaderDescription>

      <PageActions>
        <Button as={Link} to="/create" class="h-[31px] rounded-lg">
          Build Your Own <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </PageActions>
    </PageHeader>
  );
}
