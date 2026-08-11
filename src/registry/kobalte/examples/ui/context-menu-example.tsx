import { Archive, ClipboardPaste, Copy, Pencil, Scissors, Share, Trash } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
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
} from "@/registry/kobalte/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";

export default function ContextMenuExample() {
  return (
    <ExampleWrapper>
      <ContextMenuBasic />
      <ContextMenuWithIcons />
      <ContextMenuWithSides />
      <ContextMenuWithShortcuts />
      <ContextMenuWithSubmenu />
      <ContextMenuWithGroups />
      <ContextMenuWithCheckboxes />
      <ContextMenuWithRadio />
      <ContextMenuWithDestructive />
      <ContextMenuInDialog />
      <ContextMenuWithInset />
    </ExampleWrapper>
  );
}

function ContextMenuBasic() {
  return (
    <Example title="Basic">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem>Back</ContextMenuItem>
            <ContextMenuItem disabled>Forward</ContextMenuItem>
            <ContextMenuItem>Reload</ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithIcons() {
  return (
    <Example title="With Icons">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem>
              <Copy />
              Copy
            </ContextMenuItem>
            <ContextMenuItem>
              <Scissors />
              Cut
            </ContextMenuItem>
            <ContextMenuItem>
              <ClipboardPaste />
              Paste
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem variant="destructive">
              <Trash />
              Delete
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithShortcuts() {
  return (
    <Example title="With Shortcuts">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem>
              Back
              <ContextMenuShortcut>⌘[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem disabled>
              Forward
              <ContextMenuShortcut>⌘]</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Reload
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem>
              Save
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Save As...
              <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithSubmenu() {
  return (
    <Example title="With Submenu">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem>
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Cut
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More Tools</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuGroup>
                <ContextMenuItem>Save Page...</ContextMenuItem>
                <ContextMenuItem>Create Shortcut...</ContextMenuItem>
                <ContextMenuItem>Name Window...</ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem>Developer Tools</ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithGroups() {
  return (
    <Example title="With Groups, Labels & Separators">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuLabel>File</ContextMenuLabel>
            <ContextMenuItem>
              New File
              <ContextMenuShortcut>⌘N</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Open File
              <ContextMenuShortcut>⌘O</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Save
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel>Edit</ContextMenuLabel>
            <ContextMenuItem>
              Undo
              <ContextMenuShortcut>⌘Z</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Redo
              <ContextMenuShortcut>⇧⌘Z</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem>
              Cut
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Paste
              <ContextMenuShortcut>⌘V</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem variant="destructive">
              Delete
              <ContextMenuShortcut>⌫</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithCheckboxes() {
  return (
    <Example title="With Checkboxes">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuCheckboxItem defaultChecked>Show Bookmarks Bar</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem defaultChecked>Show Developer Tools</ContextMenuCheckboxItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithRadio() {
  const [user, setUser] = createSignal("pedro");
  const [theme, setTheme] = createSignal("light");

  return (
    <Example title="With Radio Group">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuLabel>People</ContextMenuLabel>
            <ContextMenuRadioGroup value={user()} onChange={setUser}>
              <ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
              <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel>Theme</ContextMenuLabel>
            <ContextMenuRadioGroup value={theme()} onChange={setTheme}>
              <ContextMenuRadioItem value="light">Light</ContextMenuRadioItem>
              <ContextMenuRadioItem value="dark">Dark</ContextMenuRadioItem>
              <ContextMenuRadioItem value="system">System</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithDestructive() {
  return (
    <Example title="With Destructive Items">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem>
              <Pencil />
              Edit
            </ContextMenuItem>
            <ContextMenuItem>
              <Share />
              Share
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem>
              <Archive />
              Archive
            </ContextMenuItem>
            <ContextMenuItem variant="destructive">
              <Trash />
              Delete
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}

function ContextMenuWithSides() {
  const sides = ["top", "right", "bottom", "left"] as const;

  return (
    <Example title="With Sides" containerClass="col-span-2">
      <div class="flex flex-wrap justify-center gap-2">
        <For each={sides}>
          {(side) => (
            <ContextMenu placement={side}>
              <ContextMenuTrigger class="flex aspect-[2/0.5] items-center justify-center rounded-lg border p-4 text-sm capitalize">
                Right click ({side})
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuGroup>
                  <ContextMenuItem>Back</ContextMenuItem>
                  <ContextMenuItem>Forward</ContextMenuItem>
                  <ContextMenuItem>Reload</ContextMenuItem>
                </ContextMenuGroup>
              </ContextMenuContent>
            </ContextMenu>
          )}
        </For>
      </div>
    </Example>
  );
}

function ContextMenuInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Context Menu Example</DialogTitle>
            <DialogDescription>
              Right click on the area below to see the context menu.
            </DialogDescription>
          </DialogHeader>
          <ContextMenu>
            <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
              Right click here
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuGroup>
                <ContextMenuItem>
                  <Copy />
                  Copy
                </ContextMenuItem>
                <ContextMenuItem>
                  <Scissors />
                  Cut
                </ContextMenuItem>
                <ContextMenuItem>
                  <ClipboardPaste />
                  Paste
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>More Options</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuGroup>
                    <ContextMenuItem>Save Page...</ContextMenuItem>
                    <ContextMenuItem>Create Shortcut...</ContextMenuItem>
                    <ContextMenuItem>Name Window...</ContextMenuItem>
                  </ContextMenuGroup>
                  <ContextMenuSeparator />
                  <ContextMenuGroup>
                    <ContextMenuItem>Developer Tools</ContextMenuItem>
                  </ContextMenuGroup>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem variant="destructive">
                  <Trash />
                  Delete
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function ContextMenuWithInset() {
  const [showBookmarks, setShowBookmarks] = createSignal(true);
  const [showUrls, setShowUrls] = createSignal(false);
  const [theme, setTheme] = createSignal("system");

  return (
    <Example title="With Inset">
      <ContextMenu>
        <ContextMenuTrigger class="flex aspect-[2/0.5] w-full items-center justify-center rounded-lg border text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent class="w-44">
          <ContextMenuGroup>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem>
              <Copy />
              Copy
            </ContextMenuItem>
            <ContextMenuItem>
              <Scissors />
              Cut
            </ContextMenuItem>
            <ContextMenuItem inset>Paste</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel inset>Appearance</ContextMenuLabel>
            <ContextMenuCheckboxItem checked={showBookmarks()} onChange={setShowBookmarks}>
              Bookmarks
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem checked={showUrls()} onChange={setShowUrls}>
              Full URLs
            </ContextMenuCheckboxItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel inset>Theme</ContextMenuLabel>
            <ContextMenuRadioGroup value={theme()} onChange={setTheme}>
              <ContextMenuRadioItem value="light">Light</ContextMenuRadioItem>
              <ContextMenuRadioItem value="dark">Dark</ContextMenuRadioItem>
              <ContextMenuRadioItem value="system">System</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>More Options</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuGroup>
                <ContextMenuItem>Save Page...</ContextMenuItem>
                <ContextMenuItem>Create Shortcut...</ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    </Example>
  );
}
