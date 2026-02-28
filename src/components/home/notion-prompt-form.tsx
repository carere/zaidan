import {
  ArrowUpIcon,
  AtSignIcon,
  BookIcon,
  CirclePlusIcon,
  GlobeIcon,
  LayoutGridIcon,
  PaperclipIcon,
  PlusIcon,
  XIcon,
} from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/kobalte/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/registry/kobalte/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { Switch } from "@/registry/kobalte/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

const SAMPLE_DATA = {
  mentionable: [
    {
      type: "page",
      title: "Meeting Notes",
      image: "\u{1F4DD}",
    },
    {
      type: "page",
      title: "Project Dashboard",
      image: "\u{1F4CA}",
    },
    {
      type: "page",
      title: "Ideas & Brainstorming",
      image: "\u{1F4A1}",
    },
    {
      type: "page",
      title: "Calendar & Events",
      image: "\u{1F4C5}",
    },
    {
      type: "page",
      title: "Documentation",
      image: "\u{1F4DA}",
    },
    {
      type: "page",
      title: "Goals & Objectives",
      image: "\u{1F3AF}",
    },
    {
      type: "page",
      title: "Budget Planning",
      image: "\u{1F4B0}",
    },
    {
      type: "page",
      title: "Team Directory",
      image: "\u{1F465}",
    },
    {
      type: "page",
      title: "Technical Specs",
      image: "\u{1F527}",
    },
    {
      type: "page",
      title: "Analytics Report",
      image: "\u{1F4C8}",
    },
    {
      type: "user",
      title: "shadcn",
      image: "https://github.com/shadcn.png",
      workspace: "Workspace",
    },
    {
      type: "user",
      title: "maxleiter",
      image: "https://github.com/maxleiter.png",
      workspace: "Workspace",
    },
    {
      type: "user",
      title: "evilrabbit",
      image: "https://github.com/evilrabbit.png",
      workspace: "Workspace",
    },
  ],
  models: [
    {
      name: "Auto",
    },
    {
      name: "Agent Mode",
      badge: "Beta",
    },
    {
      name: "Plan Mode",
    },
  ],
} as const;

type MentionableItem = (typeof SAMPLE_DATA.mentionable)[number];

function MentionableIcon(props: { item: MentionableItem }) {
  return (
    <Show
      when={props.item.type === "page"}
      fallback={
        <Avatar class="size-4">
          <AvatarImage src={props.item.image} />
          <AvatarFallback>{props.item.title[0]}</AvatarFallback>
        </Avatar>
      }
    >
      <span class="flex size-4 items-center justify-center">{props.item.image}</span>
    </Show>
  );
}

export default function NotionPromptForm() {
  const [mentions, setMentions] = createSignal<string[]>([]);
  const [mentionPopoverOpen, setMentionPopoverOpen] = createSignal(false);
  const [modelPopoverOpen, setModelPopoverOpen] = createSignal(false);
  const [selectedModel, setSelectedModel] = createSignal<(typeof SAMPLE_DATA.models)[number]>(
    SAMPLE_DATA.models[0],
  );
  const [scopeMenuOpen, setScopeMenuOpen] = createSignal(false);

  const grouped = createMemo(() => {
    return SAMPLE_DATA.mentionable.reduce(
      (acc, item) => {
        const isAvailable = !mentions().includes(item.title);

        if (isAvailable) {
          if (!acc[item.type]) {
            acc[item.type] = [];
          }
          acc[item.type].push(item);
        }
        return acc;
      },
      {} as Record<string, MentionableItem[]>,
    );
  });

  const hasMentions = () => mentions().length > 0;

  return (
    <form>
      <Field>
        <FieldLabel for="notion-prompt" class="sr-only">
          Prompt
        </FieldLabel>
        <InputGroup class="rounded-xl">
          <InputGroupTextarea id="notion-prompt" placeholder="Ask, search, or make anything..." />
          <InputGroupAddon align="block-start" class="pt-3">
            <Popover
              open={mentionPopoverOpen()}
              onOpenChange={setMentionPopoverOpen}
              placement="bottom-start"
            >
              <Tooltip>
                <TooltipTrigger
                  as={PopoverTrigger}
                  onFocusIn={(e: FocusEvent) => e.stopPropagation()}
                >
                  <InputGroupButton
                    variant="outline"
                    size={!hasMentions() ? "sm" : "icon-sm"}
                    class="transition-transform"
                  >
                    <AtSignIcon /> <Show when={!hasMentions()}>Add context</Show>
                  </InputGroupButton>
                </TooltipTrigger>
                <TooltipContent>Mention a person, page, or date</TooltipContent>
              </Tooltip>
              <PopoverContent class="p-0">
                <Command>
                  <CommandInput placeholder="Search pages..." />
                  <CommandList>
                    <CommandEmpty>No pages found</CommandEmpty>
                    <For each={Object.entries(grouped())}>
                      {([type, items]) => (
                        <CommandGroup heading={type === "page" ? "Pages" : "Users"}>
                          <For each={items}>
                            {(item) => (
                              <CommandItem
                                value={item.title}
                                onSelect={(currentValue: string) => {
                                  setMentions((prev) => [...prev, currentValue]);
                                  setMentionPopoverOpen(false);
                                }}
                                class="rounded-lg"
                              >
                                <MentionableIcon item={item} />
                                {item.title}
                              </CommandItem>
                            )}
                          </For>
                        </CommandGroup>
                      )}
                    </For>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div class="no-scrollbar -m-1.5 flex gap-1 overflow-y-auto p-1.5">
              <For each={mentions()}>
                {(mention) => {
                  const item = SAMPLE_DATA.mentionable.find((i) => i.title === mention);

                  if (!item) {
                    return null;
                  }

                  return (
                    <InputGroupButton
                      size="sm"
                      variant="secondary"
                      class="rounded-full pl-2!"
                      onClick={() => {
                        setMentions((prev) => prev.filter((m) => m !== mention));
                      }}
                    >
                      <MentionableIcon item={item} />
                      {item.title}
                      <XIcon />
                    </InputGroupButton>
                  );
                }}
              </For>
            </div>
          </InputGroupAddon>
          <InputGroupAddon align="block-end" class="gap-1">
            <Tooltip>
              <TooltipTrigger
                as={InputGroupButton}
                size="icon-sm"
                class="rounded-full"
                aria-label="Attach file"
              >
                <PaperclipIcon />
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
            <DropdownMenu open={modelPopoverOpen()} onOpenChange={setModelPopoverOpen}>
              <Tooltip>
                <TooltipTrigger as={DropdownMenuTrigger}>
                  <InputGroupButton size="sm" class="rounded-full">
                    {selectedModel().name}
                  </InputGroupButton>
                </TooltipTrigger>
                <TooltipContent>Select AI model</TooltipContent>
              </Tooltip>
              <DropdownMenuContent class="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel class="text-muted-foreground text-xs">
                    Select Agent Mode
                  </DropdownMenuLabel>
                  <For each={[...SAMPLE_DATA.models]}>
                    {(model) => (
                      <DropdownMenuCheckboxItem
                        checked={model.name === selectedModel().name}
                        onChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedModel(model);
                          }
                        }}
                        class="pl-2 *:[span:first-child]:right-2 *:[span:first-child]:left-auto"
                      >
                        {model.name}
                        <Show when={"badge" in model && model.badge}>
                          {(badge) => (
                            <Badge
                              variant="secondary"
                              class="h-5 rounded-sm bg-blue-100 px-1 text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-100"
                            >
                              {badge()}
                            </Badge>
                          )}
                        </Show>
                      </DropdownMenuCheckboxItem>
                    )}
                  </For>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={scopeMenuOpen()} onOpenChange={setScopeMenuOpen}>
              <DropdownMenuTrigger as={InputGroupButton} size="sm" class="rounded-full">
                <GlobeIcon /> All Sources
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuItem as="label" for="web-search" onSelect={() => {}}>
                    <GlobeIcon /> Web Search{" "}
                    <Switch id="web-search" class="ml-auto" defaultChecked />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem as="label" for="apps" onSelect={() => {}}>
                    <LayoutGridIcon /> Apps and Integrations
                    <Switch id="apps" class="ml-auto" defaultChecked />
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CirclePlusIcon /> All Sources I can access
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Avatar class="size-4">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      shadcn
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="w-72 p-0 [--radius:1rem]">
                      <Command>
                        <CommandInput placeholder="Find or use knowledge in..." autofocus />
                        <CommandList>
                          <CommandEmpty>No knowledge found</CommandEmpty>
                          <CommandGroup>
                            <For
                              each={SAMPLE_DATA.mentionable.filter((item) => item.type === "user")}
                            >
                              {(user) => (
                                <CommandItem
                                  value={user.title}
                                  onSelect={() => {
                                    console.log("Selected user:", user.title);
                                  }}
                                >
                                  <Avatar class="size-4">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback>{user.title[0]}</AvatarFallback>
                                  </Avatar>
                                  {user.title}{" "}
                                  <span class="text-muted-foreground">
                                    - {"workspace" in user ? user.workspace : ""}
                                  </span>
                                </CommandItem>
                              )}
                            </For>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <BookIcon /> Help Center
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <PlusIcon /> Connect Apps
                  </DropdownMenuItem>
                  <DropdownMenuLabel class="text-muted-foreground text-xs">
                    We'll only search in the sources selected here.
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupButton
              aria-label="Send"
              class="ml-auto rounded-full"
              variant="default"
              size="icon-sm"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  );
}
