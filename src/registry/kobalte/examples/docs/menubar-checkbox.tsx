import { createSignal } from "solid-js";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/registry/kobalte/ui/menubar";

export default function MenubarCheckbox() {
  const [showBookmarksBar, setShowBookmarksBar] = createSignal(false);
  const [showFullUrls, setShowFullUrls] = createSignal(true);
  const [strikethrough, setStrikethrough] = createSignal(true);
  const [code, setCode] = createSignal(false);
  const [superscript, setSuperscript] = createSignal(false);

  return (
    <Menubar class="w-72">
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent class="w-64">
          <MenubarCheckboxItem checked={showBookmarksBar()} onChange={setShowBookmarksBar}>
            Always Show Bookmarks Bar
          </MenubarCheckboxItem>
          <MenubarCheckboxItem checked={showFullUrls()} onChange={setShowFullUrls}>
            Always Show Full URLs
          </MenubarCheckboxItem>
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
          <MenubarCheckboxItem checked={strikethrough()} onChange={setStrikethrough}>
            Strikethrough
          </MenubarCheckboxItem>
          <MenubarCheckboxItem checked={code()} onChange={setCode}>
            Code
          </MenubarCheckboxItem>
          <MenubarCheckboxItem checked={superscript()} onChange={setSuperscript}>
            Superscript
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
