/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { ArrowUpRight, CircleDashed, Folder, Plus } from "lucide-solid";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/ui/input-group";
import { Kbd } from "@/registry/ui/kbd";

export default function EmptyExample() {
  return (
    <ExampleWrapper>
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
    <Example title="Basic">
      <Empty>
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
            Learn more <ArrowUpRight />
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithMutedBackground() {
  return (
    <Example title="With Muted Background">
      <Empty class="bg-muted">
        <EmptyHeader>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            No results found for your search. Try adjusting your search terms.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Try again</Button>
          <Button variant="link" as="a" href="#" class="text-muted-foreground">
            Learn more <ArrowUpRight />
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithBorder() {
  return (
    <Example title="With Border">
      <Empty class="border">
        <EmptyHeader>
          <EmptyTitle>404 - Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist. Try searching for what you need
            below.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <InputGroup class="w-3/4">
            <InputGroupInput placeholder="Try searching for pages..." />
            <InputGroupAddon>
              <CircleDashed />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <EmptyDescription>
            Need help? <a href="#">Contact support</a>
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithIcon() {
  return (
    <Example title="With Icon">
      <Empty class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
          <EmptyTitle>Nothing to see here</EmptyTitle>
          <EmptyDescription>
            No posts have been created yet. Get started by <a href="#">creating your first post</a>.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">
            <Plus />
            New Post
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyWithMutedBackgroundAlt() {
  return (
    <Example title="With Muted Background Alt">
      <Empty class="bg-muted/50">
        <EmptyHeader>
          <EmptyTitle>404 - Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist. Try searching for what you need
            below.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <InputGroup class="w-3/4">
            <InputGroupInput placeholder="Try searching for pages..." />
            <InputGroupAddon>
              <CircleDashed />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <EmptyDescription>
            Need help? <a href="#">Contact support</a>
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </Example>
  );
}

function EmptyInCard() {
  return (
    <Example title="In Card">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
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
            Learn more <ArrowUpRight />
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}
