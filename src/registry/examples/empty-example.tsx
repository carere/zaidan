import { FolderOpen } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/ui/empty";

export default function EmptyExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <EmptyBasic />
      <EmptyWithMutedBackground />
      <EmptyWithBorder />
      <EmptyWithIcon />
      <EmptyWithMutedBackgroundAlt />
      <EmptyInCard />
    </ExampleWrapper>
  );
}

function EmptyBasic() {
  return (
    <Example title="Basic" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px]">
        <EmptyHeader>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any projects yet. Get started by creating your first project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex gap-2">
            <Button as="a" href="#">
              Create project
            </Button>
            <Button variant="outline">Import project</Button>
          </div>
          <Button variant="link" as="a" href="#" class="text-muted-foreground">
            Learn more
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithMutedBackground() {
  return (
    <Example title="With Muted Background" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px] bg-muted">
        <EmptyHeader>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filter to find what you&apos;re looking for.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Clear filters</Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithBorder() {
  return (
    <Example title="With Border" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px] border">
        <EmptyHeader>
          <EmptyTitle>No results</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t find any results matching your search.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">Try again</Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithIcon() {
  return (
    <Example title="With Icon" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen class="size-10" />
          </EmptyMedia>
          <EmptyTitle>No files</EmptyTitle>
          <EmptyDescription>
            Upload files to get started. You can drag and drop or click to browse.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Upload files</Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithMutedBackgroundAlt() {
  return (
    <Example title="With Muted Background Alt" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px] bg-muted/50">
        <EmptyHeader>
          <EmptyTitle>No notifications</EmptyTitle>
          <EmptyDescription>
            You&apos;re all caught up! Check back later for new updates.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Example>
  );
}

function EmptyInCard() {
  return (
    <Example title="In Card" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px] rounded-lg border bg-card p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen class="size-10" />
          </EmptyMedia>
          <EmptyTitle>Create your first project</EmptyTitle>
          <EmptyDescription>
            Get started by creating a new project. You can always import existing projects later.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex gap-2">
            <Button>New project</Button>
            <Button variant="outline">Import</Button>
          </div>
        </EmptyContent>
      </Empty>
    </Example>
  );
}
