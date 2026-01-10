import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/ui/context-menu";

export default function ContextMenuExample() {
  return (
    <ExampleWrapper>
      <ContextMenuDemo />
      <ContextMenuBasic />
      <ContextMenuWithCheckboxes />
      <ContextMenuWithRadioGroup />
    </ExampleWrapper>
  );
}

function ContextMenuDemo() {
  const [showBookmarks, setShowBookmarks] = createSignal(true);
  const [showFullUrls, setShowFullUrls] = createSignal(false);
  const [selectedPerson, setSelectedPerson] = createSignal("pedro");

  return (
    <Example title="Demo">
      <ContextMenu>
        <ContextMenuTrigger class="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent class="w-52">
          <ContextMenuItem inset>
            Back
            <ContextMenuShortcut>⌘[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset disabled>
            Forward
            <ContextMenuShortcut>⌘]</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset>
            Reload
            <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
            <ContextMenuSubContent class="w-44">
              <ContextMenuItem>Save Page...</ContextMenuItem>
              <ContextMenuItem>Create Shortcut...</ContextMenuItem>
              <ContextMenuItem>Name Window...</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem>Developer Tools</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={showBookmarks()} onChange={setShowBookmarks}>
            Show Bookmarks
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={showFullUrls()} onChange={setShowFullUrls}>
            Show Full URLs
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup value={selectedPerson()} onChange={setSelectedPerson}>
            <ContextMenuLabel inset>People</ContextMenuLabel>
            <ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
            <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuBasic() {
  return (
    <Example title="Basic">
      <ContextMenu>
        <ContextMenuTrigger class="flex h-[100px] w-[200px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Profile</ContextMenuItem>
          <ContextMenuItem>Billing</ContextMenuItem>
          <ContextMenuItem>Team</ContextMenuItem>
          <ContextMenuItem>Subscription</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithCheckboxes() {
  const [statusBar, setStatusBar] = createSignal(true);
  const [activityBar, setActivityBar] = createSignal(false);
  const [panel, setPanel] = createSignal(false);

  return (
    <Example title="With Checkboxes">
      <ContextMenu>
        <ContextMenuTrigger class="flex h-[100px] w-[200px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click
        </ContextMenuTrigger>
        <ContextMenuContent class="w-56">
          <ContextMenuCheckboxItem checked={statusBar()} onChange={setStatusBar}>
            Status Bar
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={activityBar()} onChange={setActivityBar}>
            Activity Bar
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={panel()} onChange={setPanel}>
            Panel
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithRadioGroup() {
  const [position, setPosition] = createSignal("bottom");

  return (
    <Example title="With Radio Group">
      <ContextMenu>
        <ContextMenuTrigger class="flex h-[100px] w-[200px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click
        </ContextMenuTrigger>
        <ContextMenuContent class="w-56">
          <ContextMenuLabel>Panel Position</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup value={position()} onChange={setPosition}>
            <ContextMenuRadioItem value="top">Top</ContextMenuRadioItem>
            <ContextMenuRadioItem value="bottom">Bottom</ContextMenuRadioItem>
            <ContextMenuRadioItem value="right">Right</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}
