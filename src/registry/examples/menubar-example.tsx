import {
  Bold,
  Check,
  CircleDashed,
  ClipboardPaste,
  Copy,
  File,
  Folder,
  Image,
  Italic,
  Link,
  LogOut,
  Save,
  Scissors,
  Search,
  Settings,
  Table,
  Trash,
  Underline,
  User,
} from "lucide-solid";
import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/registry/ui/menubar";

export default function MenubarExample() {
  return (
    <ExampleWrapper>
      <MenubarBasic />
      <MenubarWithSubmenu />
      <MenubarWithCheckboxes />
      <MenubarWithRadio />
      <MenubarWithIcons />
      <MenubarWithShortcuts />
      <MenubarFormat />
      <MenubarInsert />
      <MenubarDestructive />
      <MenubarInDialog />
    </ExampleWrapper>
  );
}

function MenubarBasic() {
  return (
    <Example title="Basic">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New Window <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>New Incognito Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarWithSubmenu() {
  return (
    <Example title="With Submenu">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email link</MenubarItem>
                <MenubarItem>Messages</MenubarItem>
                <MenubarItem>Notes</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarWithCheckboxes() {
  return (
    <Example title="With Checkboxes">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent class="w-64">
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>Always Show Full URLs</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Reload <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>Strikethrough</MenubarCheckboxItem>
            <MenubarCheckboxItem>Code</MenubarCheckboxItem>
            <MenubarCheckboxItem>Superscript</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarWithRadio() {
  const [user, setUser] = createSignal("benoit");
  const [theme, setTheme] = createSignal("system");

  return (
    <Example title="With Radio">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Profiles</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={user()} onChange={setUser}>
              <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
              <MenubarRadioItem value="luis">Luis</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Edit...</MenubarItem>
            <MenubarItem inset>Add Profile...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={theme()} onChange={setTheme}>
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
              <MenubarRadioItem value="system">System</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarWithIcons() {
  return (
    <Example title="With Icons">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <File />
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Folder />
              Open Folder
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Save />
              Save <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>More</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem>
                <CircleDashed />
                Settings
              </MenubarItem>
              <MenubarItem>
                <CircleDashed />
                Help
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive">
                <CircleDashed />
                Delete
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarWithShortcuts() {
  return (
    <Example title="With Shortcuts">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New Window <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Cut <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Copy <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Paste <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarFormat() {
  return (
    <Example title="Format">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Bold />
              Bold <MenubarShortcut>⌘B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Italic />
              Italic <MenubarShortcut>⌘I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Underline />
              Underline <MenubarShortcut>⌘U</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarCheckboxItem checked>Strikethrough</MenubarCheckboxItem>
            <MenubarCheckboxItem>Code</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Show Ruler</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>Show Grid</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>Zoom In</MenubarItem>
            <MenubarItem inset>Zoom Out</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarInsert() {
  return (
    <Example title="Insert">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Insert</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>
                <Image />
                Media
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Image</MenubarItem>
                <MenubarItem>Video</MenubarItem>
                <MenubarItem>Audio</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              <Link />
              Link <MenubarShortcut>⌘K</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Table />
              Table
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent class="w-44">
            <MenubarItem>
              <Search />
              Find & Replace <MenubarShortcut>⌘F</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Check />
              Spell Check
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarDestructive() {
  return (
    <Example title="Destructive">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent class="w-40">
            <MenubarItem>
              <File />
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Folder />
              Open Folder
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <Trash />
              Delete File <MenubarShortcut>⌘⌫</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Account</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <User />
              Profile
            </MenubarItem>
            <MenubarItem>
              <Settings />
              Settings
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <LogOut />
              Sign out
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <Trash />
              Delete
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  );
}

function MenubarInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menubar Example</DialogTitle>
            <DialogDescription>Use the menubar below to see the menu options.</DialogDescription>
          </DialogHeader>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Copy />
                  Copy
                </MenubarItem>
                <MenubarItem>
                  <Scissors />
                  Cut
                </MenubarItem>
                <MenubarItem>
                  <ClipboardPaste />
                  Paste
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>More Options</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>Save Page...</MenubarItem>
                    <MenubarItem>Create Shortcut...</MenubarItem>
                    <MenubarItem>Name Window...</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Developer Tools</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem variant="destructive">
                  <Trash />
                  Delete
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
