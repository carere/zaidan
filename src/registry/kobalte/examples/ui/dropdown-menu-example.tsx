import {
  Activity,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bell,
  Building2,
  ChevronsUpDown,
  ClipboardPaste,
  Copy,
  CreditCard,
  HelpCircle,
  Layout,
  LogOut,
  Mail,
  MessageSquare,
  PanelLeft,
  Pencil,
  PlusCircle,
  Scissors,
  Settings,
  Share,
  Trash,
  User,
  Users,
  Wallet,
} from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function DropdownMenuExample() {
  return (
    <ExampleWrapper>
      <DropdownMenuBasic />
      <DropdownMenuComplex />
      <DropdownMenuSides />
      <DropdownMenuWithIcons />
      <DropdownMenuWithShortcuts />
      <DropdownMenuWithSubmenu />
      <DropdownMenuWithCheckboxes />
      <DropdownMenuWithCheckboxesIcons />
      <DropdownMenuWithRadio />
      <DropdownMenuWithRadioIcons />
      <DropdownMenuWithDestructive />
      <DropdownMenuWithAvatar />
      <DropdownMenuInDialog />
      <DropdownMenuWithInset />
    </ExampleWrapper>
  );
}

function DropdownMenuBasic() {
  return (
    <Example title="Basic">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>GitHub</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem disabled>API</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuSides() {
  const placements = ["top", "right", "bottom", "left"] as const;

  return (
    <Example title="Sides" containerClass="col-span-2">
      <div class="flex flex-wrap justify-center gap-2">
        <For each={placements}>
          {(placement) => (
            <DropdownMenu placement={placement}>
              <DropdownMenuTrigger as={Button} variant="outline" class="w-fit capitalize">
                {placement}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </For>
      </div>
    </Example>
  );
}

function DropdownMenuWithIcons() {
  return (
    <Example title="With Icons">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <User />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithShortcuts() {
  return (
    <Example title="With Shortcuts">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Keyboard shortcuts
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithSubmenu() {
  return (
    <Example title="With Submenu">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                  <DropdownMenuItem>Message</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>More...</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              New Team
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithCheckboxes() {
  const [showStatusBar, setShowStatusBar] = createSignal(true);
  const [showActivityBar, setShowActivityBar] = createSignal(false);
  const [showPanel, setShowPanel] = createSignal(false);

  return (
    <Example title="With Checkboxes">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Checkboxes
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={showStatusBar()} onChange={setShowStatusBar}>
              <Layout />
              Status Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showActivityBar()}
              onChange={setShowActivityBar}
              disabled
            >
              <Activity />
              Activity Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showPanel()} onChange={setShowPanel}>
              <PanelLeft />
              Panel
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithRadio() {
  const [position, setPosition] = createSignal("bottom");

  return (
    <Example title="With Radio Group">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Radio Group
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={position()} onChange={setPosition}>
              <DropdownMenuRadioItem value="top">
                <ArrowUp />
                Top
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                <ArrowDown />
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right" disabled>
                <ArrowRight />
                Right
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithCheckboxesIcons() {
  const [notifications, setNotifications] = createSignal({
    email: true,
    sms: false,
    push: true,
  });

  return (
    <Example title="Checkboxes with Icons">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Notifications
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Notification Preferences</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={notifications().email}
              onChange={(checked) =>
                setNotifications({ ...notifications(), email: checked === true })
              }
            >
              <Mail />
              Email notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={notifications().sms}
              onChange={(checked) =>
                setNotifications({ ...notifications(), sms: checked === true })
              }
            >
              <MessageSquare />
              SMS notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={notifications().push}
              onChange={(checked) =>
                setNotifications({ ...notifications(), push: checked === true })
              }
            >
              <Bell />
              Push notifications
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithRadioIcons() {
  const [paymentMethod, setPaymentMethod] = createSignal("card");

  return (
    <Example title="Radio with Icons">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Payment Method
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Select Payment Method</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={paymentMethod()} onChange={setPaymentMethod}>
              <DropdownMenuRadioItem value="card">
                <CreditCard />
                Credit Card
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="paypal">
                <Wallet />
                PayPal
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bank">
                <Building2 />
                Bank Transfer
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithDestructive() {
  return (
    <Example title="With Destructive Items">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Archive />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuWithAvatar() {
  return (
    <Example title="With Avatar">
      <div class="flex items-center justify-between gap-4">
        <DropdownMenu placement="top-end">
          <DropdownMenuTrigger
            as={Button}
            variant="outline"
            class="h-12 justify-start px-2 md:max-w-[200px] style-sera:font-normal style-sera:tracking-normal style-sera:normal-case"
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="Shadcn" />
              <AvatarFallback class="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">shadcn</span>
              <span class="truncate text-muted-foreground text-xs">shadcn@example.com</span>
            </div>
            <ChevronsUpDown class="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-(--anchor-width) min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger as={Button} variant="ghost" size="icon" class="rounded-full">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Example>
  );
}

function DropdownMenuInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dropdown Menu Example</DialogTitle>
            <DialogDescription>Click the button below to see the dropdown menu.</DialogDescription>
          </DialogHeader>
          <DropdownMenu>
            <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
              Open Menu
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Copy />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Scissors />
                Cut
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ClipboardPaste />
                Paste
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Save Page...</DropdownMenuItem>
                    <DropdownMenuItem>Create Shortcut...</DropdownMenuItem>
                    <DropdownMenuItem>Name Window...</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Developer Tools</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function DropdownMenuWithInset() {
  const [showBookmarks, setShowBookmarks] = createSignal(true);
  const [showUrls, setShowUrls] = createSignal(false);
  const [theme, setTheme] = createSignal("system");

  return (
    <Example title="With Inset">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Copy />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Scissors />
              Cut
            </DropdownMenuItem>
            <DropdownMenuItem inset>Paste</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={showBookmarks()} onChange={setShowBookmarks}>
              Bookmarks
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showUrls()} onChange={setShowUrls}>
              Full URLs
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme()} onChange={setTheme}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>More Options</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>Save Page...</DropdownMenuItem>
                  <DropdownMenuItem>Create Shortcut...</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}

function DropdownMenuComplex() {
  const [showSidebar, setShowSidebar] = createSignal(true);
  const [showStatusBar, setShowStatusBar] = createSignal(false);

  return (
    <Example title="Complex">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
          Complex Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>
              <User />
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard />
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={showSidebar()} onChange={setShowSidebar}>
              <PanelLeft />
              Sidebar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showStatusBar()} onChange={setShowStatusBar}>
              <Layout />
              Status Bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users />
                Invite Users
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Mail />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare />
                      Message
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <PlusCircle />
                      More...
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <HelpCircle />
              Support
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <LogOut />
              Sign Out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  );
}
