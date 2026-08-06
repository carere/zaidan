import * as MenubarPrimitive from "@kobalte/core/menubar";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";
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
  type DropdownMenuRadioItemProps,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

type MenubarContextValue = {
  disabled: () => boolean;
  modal: () => boolean;
  orientation: () => "horizontal" | "vertical";
  setMenuOpen: (id: string, open: boolean) => void;
};

const MenubarContext = createContext<MenubarContextValue>();

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

type MenubarProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, MenubarPrimitive.MenubarRootProps<T>>,
  | "autoFocusMenu"
  | "defaultValue"
  | "focusOnAlt"
  | "loop"
  | "onAutoFocusMenuChange"
  | "onValueChange"
  | "value"
> &
  Partial<Pick<ComponentProps<T>, "class" | "children">> & {
    disabled?: boolean;
    loopFocus?: boolean;
    modal?: boolean;
  };

const Menubar = <T extends ValidComponent = "div">(props: MenubarProps<T>) => {
  const mergedProps = mergeProps(
    {
      disabled: false,
      loopFocus: true,
      modal: true,
      orientation: "horizontal",
    } as MenubarProps<T>,
    props,
  );
  const [local, others] = splitProps(mergedProps as MenubarProps, [
    "children",
    "class",
    "disabled",
    "loopFocus",
    "modal",
    "onKeyDown",
    "orientation",
  ]);
  const [openMenus, setOpenMenus] = createSignal<Set<string>>(new Set());
  const context: MenubarContextValue = {
    disabled: () => local.disabled ?? false,
    modal: () => local.modal ?? true,
    orientation: () => local.orientation ?? "horizontal",
    setMenuOpen: (id, open) => {
      setOpenMenus((current) => {
        const next = new Set(current);
        if (open) next.add(id);
        else next.delete(id);
        return next;
      });
    },
  };

  return (
    <MenubarContext.Provider value={context}>
      <MenubarPrimitive.Root
        data-has-submenu-open={openMenus().size > 0 ? "" : undefined}
        data-modal={local.modal ? "" : undefined}
        data-slot="menubar"
        loop={local.loopFocus}
        orientation={local.orientation}
        class={cn("z-menubar flex items-center", local.class)}
        onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLElement; target: Element }) => {
          callEventHandler(
            local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
            event,
          );
          if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End")) return;

          const triggers = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"][aria-haspopup]'),
          ).filter(
            (trigger) =>
              !trigger.hasAttribute("disabled") &&
              trigger.getAttribute("aria-disabled") !== "true" &&
              trigger.closest('[role="menubar"]') === event.currentTarget,
          );
          const target = event.key === "Home" ? triggers[0] : triggers.at(-1);
          if (!target) return;

          event.preventDefault();
          target.focus();
        }}
        {...others}
      >
        {local.children}
      </MenubarPrimitive.Root>
    </MenubarContext.Provider>
  );
};

type MenubarMenuProps = ComponentProps<typeof DropdownMenu>;

const MenubarMenu = (props: MenubarMenuProps) => {
  const id = createUniqueId();
  const rootContext = useContext(MenubarContext);
  const [local, others] = splitProps(props, [
    "children",
    "defaultOpen",
    "disabled",
    "modal",
    "onOpenChange",
    "open",
    "orientation",
    "value",
  ]);

  createEffect(() => {
    rootContext?.setMenuOpen(id, local.open ?? local.defaultOpen ?? false);
  });
  onCleanup(() => rootContext?.setMenuOpen(id, false));

  return (
    <DropdownMenu
      data-slot="menubar-menu"
      defaultOpen={local.defaultOpen}
      disabled={(rootContext?.disabled() ?? false) || (local.disabled ?? false)}
      modal={rootContext?.modal() ?? local.modal}
      open={local.open}
      orientation={
        local.orientation ?? (rootContext?.orientation() === "vertical" ? "horizontal" : "vertical")
      }
      value={local.value ?? id}
      onOpenChange={(open, details) => {
        local.onOpenChange?.(open, details);
        if (!details.isCanceled && local.open === undefined) rootContext?.setMenuOpen(id, open);
      }}
      {...others}
    >
      {local.children}
    </DropdownMenu>
  );
};

type MenubarGroupProps = ComponentProps<typeof DropdownMenuGroup>;

const MenubarGroup = (props: MenubarGroupProps) => {
  return <DropdownMenuGroup data-slot="menubar-group" {...props} />;
};

type MenubarPortalProps = ComponentProps<typeof DropdownMenuPortal>;

const MenubarPortal = (props: MenubarPortalProps) => {
  const [local, others] = splitProps(props, ["ref"]);
  return (
    <DropdownMenuPortal
      ref={(element) => {
        element.dataset.slot = "menubar-portal";
        if (typeof local.ref === "function") local.ref(element);
      }}
      {...others}
    />
  );
};

type MenubarTriggerProps = ComponentProps<typeof DropdownMenuTrigger>;

const MenubarTrigger = (props: MenubarTriggerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuTrigger
      data-slot="menubar-trigger"
      class={cn("z-menubar-trigger flex items-center outline-hidden select-none", local.class)}
      {...others}
    />
  );
};

type MenubarContentProps = ComponentProps<typeof DropdownMenuContent>;

const MenubarContent = (props: MenubarContentProps) => {
  const mergedProps = mergeProps(
    { align: "start", alignOffset: -4, sideOffset: 8 } as const,
    props,
  );
  const [local, others] = splitProps(mergedProps, ["class"]);
  return (
    <DropdownMenuContent
      data-slot="menubar-content"
      class={cn(
        "z-menubar-content z-menubar-content-logical z-menu-target z-menu-translucent",
        local.class,
      )}
      {...others}
    />
  );
};

type MenubarItemProps = ComponentProps<typeof DropdownMenuItem>;

const MenubarItem = (props: MenubarItemProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuItem
      data-slot="menubar-item"
      class={cn("z-menubar-item group/menubar-item", local.class)}
      {...others}
    />
  );
};

type MenubarCheckboxItemProps = ComponentProps<typeof DropdownMenuCheckboxItem>;

const MenubarCheckboxItem = (props: MenubarCheckboxItemProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuCheckboxItem
      data-slot="menubar-checkbox-item"
      class={cn("z-menubar-checkbox-item", local.class)}
      {...others}
    />
  );
};

type MenubarRadioGroupProps = ComponentProps<typeof DropdownMenuRadioGroup>;

const MenubarRadioGroup = (props: MenubarRadioGroupProps) => {
  return <DropdownMenuRadioGroup data-slot="menubar-radio-group" {...props} />;
};

type MenubarRadioItemProps = DropdownMenuRadioItemProps;

const MenubarRadioItem = (props: MenubarRadioItemProps) => {
  const [local, others] = splitProps(props, ["class", "value"]);
  return (
    <DropdownMenuRadioItem
      data-slot="menubar-radio-item"
      class={cn("z-menubar-radio-item", local.class as string | undefined)}
      value={local.value}
      {...others}
    />
  );
};

type MenubarLabelProps = ComponentProps<typeof DropdownMenuLabel>;

const MenubarLabel = (props: MenubarLabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuLabel
      data-slot="menubar-label"
      class={cn("z-menubar-label", local.class)}
      {...others}
    />
  );
};

type MenubarSeparatorProps = ComponentProps<typeof DropdownMenuSeparator>;

const MenubarSeparator = (props: MenubarSeparatorProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuSeparator
      data-slot="menubar-separator"
      class={cn("z-menubar-separator -mx-1 my-1 h-px", local.class)}
      {...others}
    />
  );
};

type MenubarShortcutProps = ComponentProps<typeof DropdownMenuShortcut>;

const MenubarShortcut = (props: MenubarShortcutProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuShortcut
      data-slot="menubar-shortcut"
      class={cn("z-menubar-shortcut ml-auto", local.class)}
      {...others}
    />
  );
};

type MenubarSubProps = ComponentProps<typeof DropdownMenuSub>;

const MenubarSub = (props: MenubarSubProps) => {
  return <DropdownMenuSub data-slot="menubar-sub" {...props} />;
};

type MenubarSubTriggerProps = ComponentProps<typeof DropdownMenuSubTrigger>;

const MenubarSubTrigger = (props: MenubarSubTriggerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuSubTrigger
      data-slot="menubar-sub-trigger"
      class={cn("z-menubar-sub-trigger", local.class)}
      {...others}
    />
  );
};

type MenubarSubContentProps = ComponentProps<typeof DropdownMenuSubContent>;

const MenubarSubContent = (props: MenubarSubContentProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <DropdownMenuSubContent
      data-slot="menubar-sub-content"
      class={cn("z-menubar-sub-content z-menu-target z-menu-translucent", local.class)}
      {...others}
    />
  );
};

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
