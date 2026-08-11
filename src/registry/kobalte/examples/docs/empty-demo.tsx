import { ArrowUpRightIcon, FolderCodeIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";

export default function EmptyDemo() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCodeIcon />
        </EmptyMedia>
        <EmptyTitle>No Projects Yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any projects yet. Get started by creating your first project.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent class="flex-row justify-center gap-2">
        <Button>Create Project</Button>
        <Button variant="outline">Import Project</Button>
      </EmptyContent>
      <Button variant="link" as="a" href="#" class="text-muted-foreground" size="sm">
        Learn More <ArrowUpRightIcon />
      </Button>
    </Empty>
  );
}
