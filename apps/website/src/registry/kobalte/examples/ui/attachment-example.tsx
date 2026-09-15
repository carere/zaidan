/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileSearchIcon,
  FileTextIcon,
  FileWarningIcon,
  PresentationIcon,
  RefreshCwIcon,
  TableIcon,
  XIcon,
} from "lucide-solid";
import { createSignal, For, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { Example, ExampleWrapper } from "@/components/example";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/registry/kobalte/ui/attachment";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Spinner } from "@/registry/kobalte/ui/spinner";

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";
type AttachmentSize = "default" | "sm" | "xs";
type AttachmentOrientation = "horizontal" | "vertical";

type GalleryFile = {
  name: string;
  meta: string;
  Icon: typeof FileTextIcon;
};

type GalleryImage = Pick<GalleryFile, "name" | "meta"> & {
  src: string;
  alt: string;
};

const files: GalleryFile[] = [
  { name: "sales-dashboard.pdf", meta: "PDF · 2.4 MB", Icon: FileTextIcon },
  { name: "customer-import.csv", meta: "CSV · 18 KB", Icon: TableIcon },
  { name: "message-renderer.tsx", meta: "TypeScript · 12 KB", Icon: FileCodeIcon },
  { name: "source-assets.zip", meta: "ZIP · 4.2 MB", Icon: FileArchiveIcon },
  { name: "quarterly-review.key", meta: "Keynote · 9 MB", Icon: PresentationIcon },
];

const images: GalleryImage[] = [
  {
    name: "workspace.png",
    meta: "PNG · 820 KB",
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80",
    alt: "Workspace",
  },
  {
    name: "desk-reference.jpg",
    meta: "JPG · 1.1 MB",
    src: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80",
    alt: "Desk",
  },
  {
    name: "office-reference.jpg",
    meta: "JPG · 940 KB",
    src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80",
    alt: "Office",
  },
];

const states: { state: AttachmentState; description: string }[] = [
  { state: "idle", description: "Ready to upload" },
  { state: "uploading", description: "Uploading · 64%" },
  { state: "processing", description: "Processing document" },
  { state: "error", description: "Upload failed. Try again." },
  { state: "done", description: "Uploaded · 1.8 MB" },
];

export default function AttachmentExample() {
  return (
    <ExampleWrapper>
      <AttachmentFiles />
      <AttachmentContentOnly />
      <AttachmentStates />
      <AttachmentImages />
      <AttachmentImageStates />
      <AttachmentSizes />
      <AttachmentScrollableGroup />
      <AttachmentTriggers />
    </ExampleWrapper>
  );
}

function FileAttachment(props: {
  file: GalleryFile;
  state?: AttachmentState;
  orientation?: AttachmentOrientation;
  size?: AttachmentSize;
  description?: string;
  class?: string;
  actions?: JSX.Element;
}) {
  const description = () => props.description ?? props.file.meta;
  const icon = () => {
    if (props.state === "uploading") return <Spinner />;
    if (props.state === "error") return <FileWarningIcon />;
    if (props.state === "done") return <CheckIcon />;
    if (props.state === "idle") return <ClockIcon />;
    return <Dynamic component={props.file.Icon} />;
  };

  return (
    <Attachment
      state={props.state}
      orientation={props.orientation}
      size={props.size}
      class={props.class}
    >
      <AttachmentMedia>{icon()}</AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{props.file.name}</AttachmentTitle>
        <AttachmentDescription>{description()}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        {props.actions ?? (
          <AttachmentAction aria-label={`Remove ${props.file.name}`}>
            <XIcon />
          </AttachmentAction>
        )}
      </AttachmentActions>
    </Attachment>
  );
}

function ImageAttachment(props: {
  image: GalleryImage;
  state?: AttachmentState;
  orientation?: AttachmentOrientation;
  description?: string;
  class?: string;
  trigger?: boolean;
}) {
  return (
    <Attachment state={props.state} orientation={props.orientation} class={props.class}>
      <AttachmentMedia variant="image">
        <img src={props.image.src} alt={props.image.alt} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{props.image.name}</AttachmentTitle>
        <AttachmentDescription>{props.description ?? props.image.meta}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label={`Remove ${props.image.name}`}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
      <Show when={props.trigger}>
        <AttachmentTrigger
          as="a"
          href={props.image.src}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${props.image.name}`}
        />
      </Show>
    </Attachment>
  );
}

function AttachmentFiles() {
  return (
    <Example title="Files" class="gap-8">
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Horizontal</div>
        <div class="flex flex-col gap-3">
          <For each={files.slice(0, 3)}>
            {(file) => <FileAttachment file={file} class="w-full" />}
          </For>
        </div>
      </div>
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Vertical</div>
        <AttachmentGroup class="w-full">
          <For each={files}>{(file) => <FileAttachment file={file} orientation="vertical" />}</For>
        </AttachmentGroup>
      </div>
    </Example>
  );
}

function ContentOnlyAttachment(props: {
  title: string;
  description?: string;
  size?: AttachmentSize;
  href?: string;
}) {
  return (
    <Attachment size={props.size} class="w-full">
      <AttachmentContent>
        <AttachmentTitle>{props.title}</AttachmentTitle>
        <Show when={props.description}>
          <AttachmentDescription>{props.description}</AttachmentDescription>
        </Show>
      </AttachmentContent>
      <Show
        when={props.href}
        fallback={
          <AttachmentActions>
            <AttachmentAction aria-label={`Remove ${props.title}`}>
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        }
      >
        {(href) => <AttachmentTrigger as="a" href={href()} aria-label={`Open ${props.title}`} />}
      </Show>
    </Attachment>
  );
}

function AttachmentContentOnly() {
  return (
    <Example title="Content Only" class="gap-8">
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Title</div>
        <div class="flex flex-col gap-3">
          <ContentOnlyAttachment title="React Documentation" />
          <ContentOnlyAttachment title="Tailwind CSS" />
          <ContentOnlyAttachment title="shadcn/ui" size="sm" href="https://ui.shadcn.com" />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Title and Description</div>
        <div class="flex flex-col gap-3">
          <ContentOnlyAttachment
            title="Building accessible components"
            description="react.dev · 8 min read"
          />
          <ContentOnlyAttachment
            title="Utility-first CSS framework"
            description="tailwindcss.com"
          />
          <ContentOnlyAttachment
            title="Compound components in React"
            description="ui.shadcn.com/docs"
            size="sm"
            href="https://ui.shadcn.com/docs"
          />
        </div>
      </div>
    </Example>
  );
}

function StateAttachments(props: { orientation?: AttachmentOrientation }) {
  return (
    <For each={states}>
      {({ state, description }) => (
        <FileAttachment
          file={
            state === "error"
              ? { name: "financial-model.xlsx", meta: "", Icon: FileWarningIcon }
              : state === "done"
                ? { name: "uploaded-report.pdf", meta: "", Icon: CheckIcon }
                : state === "uploading"
                  ? { name: "design-system.zip", meta: "", Icon: FileArchiveIcon }
                  : state === "processing"
                    ? { name: "market-research.pdf", meta: "", Icon: FileTextIcon }
                    : { name: "selected-file.pdf", meta: "", Icon: ClockIcon }
          }
          state={state}
          orientation={props.orientation}
          description={props.orientation === "vertical" ? description.split(" · ")[0] : description}
          class={props.orientation ? undefined : "w-full"}
          actions={
            <>
              <Show when={state === "error"}>
                <AttachmentAction aria-label="Retry upload">
                  <RefreshCwIcon />
                </AttachmentAction>
              </Show>
              <AttachmentAction aria-label={`Remove ${state} attachment`}>
                <XIcon />
              </AttachmentAction>
            </>
          }
        />
      )}
    </For>
  );
}

function AttachmentStates() {
  return (
    <Example title="States" class="gap-8">
      <div class="flex w-full flex-col gap-3">
        <div class="px-1 text-xs font-medium text-muted-foreground">Horizontal</div>
        <div class="flex flex-col gap-2">
          <StateAttachments />
        </div>
      </div>
      <div class="flex w-full flex-col gap-3">
        <div class="px-1 text-xs font-medium text-muted-foreground">Vertical</div>
        <AttachmentGroup class="w-full">
          <StateAttachments orientation="vertical" />
        </AttachmentGroup>
      </div>
    </Example>
  );
}

function AttachmentImages() {
  return (
    <Example title="Images" class="gap-8">
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Horizontal</div>
        <div class="flex flex-col gap-3">
          <For each={images}>
            {(image) => <ImageAttachment image={image} class="w-full" trigger />}
          </For>
        </div>
      </div>
      <div class="flex w-full flex-col gap-2">
        <div class="px-1 text-xs font-medium text-muted-foreground">Vertical</div>
        <AttachmentGroup class="w-full">
          <For each={images}>
            {(image) => <ImageAttachment image={image} orientation="vertical" trigger />}
          </For>
        </AttachmentGroup>
      </div>
    </Example>
  );
}

function AttachmentImageStates() {
  return (
    <Example title="Image States" class="gap-8">
      <div class="flex w-full flex-col gap-3">
        <div class="px-1 text-xs font-medium text-muted-foreground">Horizontal</div>
        <div class="flex flex-col gap-2">
          <For each={states}>
            {({ state, description }, index) => (
              <ImageAttachment
                image={images[index() % images.length]}
                state={state}
                description={description.replace("document", "image")}
                class="w-full"
              />
            )}
          </For>
        </div>
      </div>
      <div class="flex w-full flex-col gap-3">
        <div class="px-1 text-xs font-medium text-muted-foreground">Vertical</div>
        <AttachmentGroup class="w-full">
          <For each={states}>
            {({ state, description }, index) => (
              <ImageAttachment
                image={images[index() % images.length]}
                state={state}
                orientation="vertical"
                description={description.split(" · ")[0]}
              />
            )}
          </For>
        </AttachmentGroup>
      </div>
    </Example>
  );
}

function AttachmentSizes() {
  return (
    <Example title="Sizes" class="gap-3">
      <FileAttachment
        file={{ name: "Default attachment", meta: "PDF · 2.4 MB", Icon: FileTextIcon }}
        class="w-full"
      />
      <FileAttachment
        file={{ name: "Small attachment", meta: "PDF · 2.4 MB", Icon: FileTextIcon }}
        size="sm"
        class="w-full"
      />
      <FileAttachment
        file={{ name: "Extra small attachment", meta: "", Icon: FileTextIcon }}
        size="xs"
        description=""
        class="w-full"
      />
    </Example>
  );
}

function AttachmentScrollableGroup() {
  return (
    <Example title="Scrollable Group" class="gap-4">
      <AttachmentGroup class="w-full">
        <FileAttachment
          file={{ name: "briefing-notes.pdf", meta: "PDF · 1.4 MB", Icon: FileTextIcon }}
          class="w-64"
        />
        <ImageAttachment image={images[0]} class="w-64" />
        <FileAttachment
          file={{ name: "customers.csv", meta: "CSV · 18 KB", Icon: TableIcon }}
          class="w-64"
        />
        <FileAttachment
          file={{ name: "renderer.tsx", meta: "TSX · 12 KB", Icon: FileCodeIcon }}
          class="w-64"
        />
      </AttachmentGroup>
      <AttachmentGroup class="w-full">
        <FileAttachment
          file={{ name: "invoice.pdf", meta: "PDF", Icon: FileTextIcon }}
          orientation="vertical"
        />
        <ImageAttachment
          image={{ ...images[1], name: "desk.jpg", meta: "JPG" }}
          orientation="vertical"
        />
        <FileAttachment
          file={{ name: "assets.zip", meta: "ZIP", Icon: FileArchiveIcon }}
          orientation="vertical"
        />
        <ImageAttachment
          image={{ ...images[2], name: "office.jpg", meta: "JPG" }}
          orientation="vertical"
        />
        <FileAttachment
          file={{ name: "notes.pdf", meta: "PDF", Icon: FileTextIcon }}
          orientation="vertical"
        />
      </AttachmentGroup>
    </Example>
  );
}

function AttachmentTriggers() {
  const [isVisible, setIsVisible] = createSignal(true);

  return (
    <Example title="Triggers" class="gap-3">
      <Show
        when={isVisible()}
        fallback={
          <Button variant="outline" onClick={() => setIsVisible(true)}>
            Restore attachment
          </Button>
        }
      >
        <FileAttachment
          file={{ name: "contract-review.pdf", meta: "PDF · 820 KB", Icon: FileTextIcon }}
          class="w-full"
          actions={
            <>
              <AttachmentAction aria-label="Download attachment">
                <DownloadIcon />
              </AttachmentAction>
              <AttachmentAction aria-label="Remove attachment" onClick={() => setIsVisible(false)}>
                <XIcon />
              </AttachmentAction>
            </>
          }
        />
      </Show>
      <Dialog>
        <Attachment class="w-full">
          <AttachmentMedia>
            <FileSearchIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>research-summary.pdf</AttachmentTitle>
            <AttachmentDescription>Open preview dialog</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Copy link">
              <CopyIcon />
            </AttachmentAction>
            <AttachmentAction aria-label="Remove research-summary.pdf">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
          <DialogTrigger as={AttachmentTrigger} aria-label="Preview research-summary.pdf" />
        </Attachment>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>research-summary.pdf</DialogTitle>
            <DialogDescription>
              Attachment triggers can open dialogs while actions remain independently reachable.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
