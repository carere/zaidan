import type { DialogRootProps } from "@kobalte/core/dialog";
import { Search } from "lucide-solid";
import type { Accessor, ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createMemo,
  createSignal,
  mergeProps,
  Show,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/ui/input-group";

// ============================================================================
// Command Context
// ============================================================================

type CommandContextValue = {
  search: Accessor<string>;
  setSearch: (value: string) => void;
};

const CommandContext = createContext<CommandContextValue>();

const useCommand = () => {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("useCommand must be used within a Command component");
  }
  return context;
};

// ============================================================================
// Command Root
// ============================================================================

type CommandProps = ComponentProps<"div">;

const Command = (props: CommandProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  const [search, setSearch] = createSignal("");

  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div
        data-slot="command"
        class={cn("cn-command flex size-full flex-col overflow-hidden", local.class)}
        {...others}
      >
        {local.children}
      </div>
    </CommandContext.Provider>
  );
};

// ============================================================================
// Command Dialog
// ============================================================================

type CommandDialogProps = Omit<DialogRootProps, "children"> & {
  title?: string;
  description?: string;
  class?: string;
  showCloseButton?: boolean;
  children: JSX.Element;
};

const CommandDialog = (rawProps: CommandDialogProps) => {
  const props = mergeProps(
    {
      title: "Command Palette",
      description: "Search for a command to run...",
      showCloseButton: false,
    } as CommandDialogProps,
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "title",
    "description",
    "class",
    "showCloseButton",
    "children",
  ]);

  return (
    <Dialog {...others}>
      <DialogHeader class="sr-only">
        <DialogTitle>{local.title}</DialogTitle>
        <DialogDescription>{local.description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        class={cn("cn-command-dialog overflow-hidden p-0", local.class)}
        showCloseButton={local.showCloseButton}
      >
        {local.children}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Command Input
// ============================================================================

type CommandInputProps = Omit<ComponentProps<"input">, "type">;

const CommandInput = (props: CommandInputProps) => {
  const [local, others] = splitProps(props, ["class"]);
  const context = useCommand();

  return (
    <div data-slot="command-input-wrapper" class="cn-command-input-wrapper">
      <InputGroup class="cn-command-input-group">
        <InputGroupInput
          type="text"
          data-slot="command-input"
          class={cn(
            "cn-command-input outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            local.class,
          )}
          value={context.search()}
          onInput={(e) => context.setSearch(e.currentTarget.value)}
          {...others}
        />
        <InputGroupAddon>
          <Search class="cn-command-input-icon" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};

// ============================================================================
// Command List
// ============================================================================

type CommandListProps = ComponentProps<"div">;

const CommandList = (props: CommandListProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="command-list"
      role="listbox"
      class={cn("cn-command-list overflow-y-auto overflow-x-hidden", local.class)}
      {...others}
    />
  );
};

// ============================================================================
// Command Empty
// ============================================================================

type CommandEmptyProps = ComponentProps<"div">;

const CommandEmpty = (props: CommandEmptyProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return <div data-slot="command-empty" class={cn("cn-command-empty", local.class)} {...others} />;
};

// ============================================================================
// Command Group
// ============================================================================

type CommandGroupProps = ComponentProps<"div"> & {
  heading?: string;
};

const CommandGroup = (props: CommandGroupProps) => {
  const [local, others] = splitProps(props, ["class", "heading", "children"]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: <command group needs group role>
    <div
      data-slot="command-group"
      role="group"
      class={cn("cn-command-group", local.class)}
      {...others}
    >
      <Show when={local.heading}>
        <div data-slot="command-group-heading" class="cn-command-group-heading" aria-hidden="true">
          {local.heading}
        </div>
      </Show>
      {local.children}
    </div>
  );
};

// ============================================================================
// Command Separator
// ============================================================================

type CommandSeparatorProps = ComponentProps<"hr">;

const CommandSeparator = (props: CommandSeparatorProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <hr data-slot="command-separator" class={cn("cn-command-separator", local.class)} {...others} />
  );
};

// ============================================================================
// Command Item
// ============================================================================

type CommandItemProps = ComponentProps<"div"> & {
  value?: string;
  disabled?: boolean;
  onSelect?: () => void;
  keywords?: string[];
};

const CommandItem = (props: CommandItemProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "value",
    "disabled",
    "onSelect",
    "keywords",
  ]);
  const context = useCommand();

  // Compute visibility based on search value
  const isVisible = createMemo(() => {
    const search = context.search().toLowerCase().trim();
    if (search === "") return true;

    const itemValue = (local.value || "").toLowerCase();
    const keywordsMatch = local.keywords?.some((k) => k.toLowerCase().includes(search)) ?? false;

    return itemValue.includes(search) || keywordsMatch;
  });

  const handleClick = () => {
    if (!local.disabled && local.onSelect) {
      local.onSelect();
    }
  };

  const handleKeyDown: JSX.EventHandlerUnion<HTMLDivElement, KeyboardEvent> = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !local.disabled && local.onSelect) {
      e.preventDefault();
      local.onSelect();
    }
  };

  return (
    <Show when={isVisible()}>
      <div
        data-slot="command-item"
        role="option"
        tabIndex={local.disabled ? -1 : 0}
        data-disabled={local.disabled || undefined}
        class={cn(
          "cn-command-item group/command-item data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          local.class,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...others}
      >
        {local.children}
      </div>
    </Show>
  );
};

// ============================================================================
// Command Shortcut
// ============================================================================

type CommandShortcutProps = ComponentProps<"span">;

const CommandShortcut = (props: CommandShortcutProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <span data-slot="command-shortcut" class={cn("cn-command-shortcut", local.class)} {...others} />
  );
};

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
