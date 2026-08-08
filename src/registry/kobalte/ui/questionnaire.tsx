import { Check } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  on,
  onCleanup,
  onMount,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";
import { type ButtonProps, buttonVariants } from "@/registry/kobalte/ui/button";

type QuestionnaireItemStatus = "unanswered" | "answered" | "skipped";
type QuestionnaireShortcutMode = "letters" | "numbers";

type QuestionnaireChoiceDefinition = {
  disabled?: boolean;
  value: string;
};

type QuestionnaireItemDefinition = {
  choices?: readonly QuestionnaireChoiceDefinition[];
  disabled?: boolean;
  name: string;
  required?: boolean;
};

type QuestionnaireRootState = {
  current: number;
  first: boolean;
  last: boolean;
  total: number;
};

type QuestionnaireInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

type AnswerControlRegistration = {
  readonly disabled: boolean;
  element: HTMLInputElement;
  id: string;
} & (
  | {
      readonly ownDisabled: boolean;
      type: "choice";
      readonly value: string;
    }
  | {
      type: "input";
    }
);

type ChoiceRegistration = {
  disabled: boolean;
  value: string;
};

type ItemRegistration = {
  readonly choices: readonly ChoiceRegistration[];
  readonly disabled: boolean;
  element: HTMLFieldSetElement;
  focus: () => void;
  focusInvalid: () => void;
  getAnswerByElement: (element: Element) => AnswerControlRegistration | null;
  getAnswerByShortcut: (shortcut: string) => AnswerControlRegistration | null;
  moveAnswerFocus: (element: Element, direction: "next" | "previous") => boolean;
  readonly name: string;
  readonly required: boolean;
  reset: () => void;
  skip: () => void;
  readonly status: QuestionnaireItemStatus;
  validate: () => boolean;
};

type PendingFocus = {
  name: string;
  target: "invalid" | "item";
};

type QuestionnaireContextValue = QuestionnaireRootState & {
  readonly activeItem: ItemRegistration | null;
  readonly activeItemName: string | null;
  readonly activeItemRequired: boolean | null;
  readonly activeItemStatus: QuestionnaireItemStatus | null;
  readonly domVersion: number;
  goNext: () => void;
  goPrevious: () => void;
  readonly itemDefinitionByName: ReadonlyMap<string, QuestionnaireItemDefinition> | null;
  readonly nativeValidation: boolean;
  registerItem: (registration: ItemRegistration) => () => void;
  readonly shortcuts: QuestionnaireShortcutMode | null;
  skipCurrent: () => void;
};

type QuestionnaireItemContextValue = {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly hasInputAnswer: boolean;
  readonly invalid: boolean;
  readonly multiple: boolean;
  readonly name: string;
  registerAnswerControl: (registration: AnswerControlRegistration) => () => void;
  registerAnswerSelection: (answerId: string, defaultSelected: boolean) => () => void;
  registerDescription: (descriptionId: string) => () => void;
  registerError: (errorId: string) => () => void;
  readonly required: boolean;
  readonly resetVersion: number;
  readonly selectedAnswerIds: string[];
  setAnswerDefault: (answerId: string, defaultSelected: boolean) => void;
  setAnswerSelectionFromInteraction: (answerId: string, selected: boolean) => void;
  readonly shortcutByAnswerId: ReadonlyMap<string, string>;
  readonly shortcutByChoiceValue: ReadonlyMap<string, string> | null;
  readonly shortcuts: QuestionnaireShortcutMode | null;
  readonly status: QuestionnaireItemStatus;
  syncControlledAnswerSelection: (answerId: string, selected: boolean) => void;
};

const QuestionnaireContext = createContext<QuestionnaireContextValue | null>(null);
const QuestionnaireItemContext = createContext<QuestionnaireItemContextValue | null>(null);

function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);

  if (!context) {
    throw new Error("useQuestionnaire must be used within a <Questionnaire /> component.");
  }

  return context;
}

function useQuestionnaireItemContext(component: string) {
  const context = useContext(QuestionnaireItemContext);

  if (!context) {
    throw new Error(`${component} must be used within a <QuestionnaireItem /> component.`);
  }

  return context;
}

function hasInputValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => String(item).trim().length > 0);
  }

  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function getShortcutKeys(shortcuts: QuestionnaireShortcutMode | null) {
  if (shortcuts === "letters") {
    return Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
  }

  if (shortcuts === "numbers") {
    return Array.from({ length: 9 }, (_, index) => String(index + 1));
  }

  return [];
}

function getShortcutFromKey(key: string, shortcuts: QuestionnaireShortcutMode) {
  const normalizedKey = shortcuts === "letters" ? key.toUpperCase() : key;

  return getShortcutKeys(shortcuts).includes(normalizedKey) ? normalizedKey : null;
}

function getAnswerKeyShortcuts(shortcut: string | null, filled: boolean) {
  return [shortcut, filled ? "Enter" : null].filter(Boolean).join(" ") || undefined;
}

function isAnswerFilled(answer: AnswerControlRegistration) {
  if (answer.type === "choice") {
    return answer.element.checked;
  }

  return answer.element.hasAttribute("name") && hasInputValue(answer.element.value);
}

function isEmptyNavigableInput(answer: AnswerControlRegistration | null) {
  return (
    answer?.type === "input" &&
    ["email", "password", "search", "tel", "text", "url"].includes(answer.element.type) &&
    !hasInputValue(answer.element.value)
  );
}

function isTextEntryTarget(element: Element) {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "reset", "submit"].includes(element.type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

function isRadioTarget(element: Element) {
  return element instanceof HTMLInputElement && element.type === "radio";
}

function compareElementOrder(firstElement: Element, secondElement: Element) {
  if (firstElement === secondElement) {
    return 0;
  }

  const position = firstElement.compareDocumentPosition(secondElement);

  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }

  return 0;
}

type QuestionnaireCollection = {
  enabledItems: readonly QuestionnaireItemDefinition[];
  itemByName: ReadonlyMap<string, QuestionnaireItemDefinition>;
  items: readonly QuestionnaireItemDefinition[];
};

function createQuestionnaireCollection(
  items: readonly QuestionnaireItemDefinition[] | undefined,
): QuestionnaireCollection | null {
  if (items === undefined) {
    return null;
  }

  return {
    enabledItems: items.filter((item) => !item.disabled),
    itemByName: new Map(items.map((item) => [item.name, item])),
    items,
  };
}

function getInitialItemName(
  collection: QuestionnaireCollection | null,
  defaultItem: string | undefined,
) {
  if (!collection) {
    return defaultItem ?? null;
  }

  const defaultDefinition = defaultItem ? collection.itemByName.get(defaultItem) : undefined;

  if (defaultDefinition && !defaultDefinition.disabled) {
    return defaultDefinition.name;
  }

  return collection.enabledItems[0]?.name ?? null;
}

function getShortcutByChoiceValue(
  item: QuestionnaireItemDefinition | undefined,
  shortcuts: QuestionnaireShortcutMode | null,
) {
  const shortcutByChoiceValue = new Map<string, string>();

  if (!item || !shortcuts) {
    return shortcutByChoiceValue;
  }

  const keys = getShortcutKeys(shortcuts);
  let shortcutIndex = 0;

  for (const choice of item.choices ?? []) {
    if (choice.disabled) {
      continue;
    }

    const shortcut = keys[shortcutIndex];

    if (!shortcut) {
      break;
    }

    shortcutByChoiceValue.set(choice.value, shortcut);
    shortcutIndex += 1;
  }

  return shortcutByChoiceValue;
}

type QuestionnaireProps = Omit<
  ComponentProps<"form">,
  "onKeyDown" | "onReset" | "onSubmit" | "ref"
> & {
  defaultItem?: string;
  item?: string;
  items?: readonly QuestionnaireItemDefinition[];
  onItemChange?: (item: string) => void;
  onKeyDown?: JSX.EventHandler<HTMLFormElement, KeyboardEvent>;
  onReset?: JSX.EventHandler<HTMLFormElement, Event>;
  onSubmit?: JSX.EventHandler<HTMLFormElement, SubmitEvent>;
  ref?: (element: HTMLFormElement) => void;
  shortcuts?: QuestionnaireShortcutMode;
};

const Questionnaire = (props: QuestionnaireProps) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "defaultItem",
    "item",
    "items",
    "noValidate",
    "onItemChange",
    "onKeyDown",
    "onReset",
    "onSubmit",
    "ref",
    "shortcuts",
  ]);

  let rootElement: HTMLFormElement | undefined;
  let pendingFocus: PendingFocus | null = null;

  const [registrations, setRegistrations] = createSignal<ItemRegistration[]>([]);
  const [domVersion, setDomVersion] = createSignal(0);
  const collection = createMemo(() => createQuestionnaireCollection(local.items));
  const [uncontrolledItem, setUncontrolledItem] = createSignal<string | null>(
    untrack(() => getInitialItemName(collection(), local.defaultItem)),
  );
  const controlled = () => local.item !== undefined;
  const activeItemName = () => (controlled() ? (local.item ?? null) : uncontrolledItem());
  let previousActiveItemName = untrack(activeItemName);
  const nativeValidation = () => local.noValidate === false;
  const shortcuts = () => local.shortcuts ?? null;

  onMount(() => {
    if (!rootElement || typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      setDomVersion((version) => version + 1);
    });

    observer.observe(rootElement, { childList: true, subtree: true });

    onCleanup(() => observer.disconnect());
  });

  const runtimeItems = createMemo(() => {
    domVersion();

    return [...registrations()]
      .filter((registration) => !registration.disabled)
      .sort((firstItem, secondItem) => compareElementOrder(firstItem.element, secondItem.element));
  });
  const runtimeItemByName = createMemo(
    () => new Map(runtimeItems().map((runtimeItem) => [runtimeItem.name, runtimeItem])),
  );
  const logicalItems = createMemo<readonly (QuestionnaireItemDefinition | ItemRegistration)[]>(
    () => collection()?.enabledItems ?? runtimeItems(),
  );
  const currentIndex = createMemo(() =>
    logicalItems().findIndex((logicalItem) => logicalItem.name === activeItemName()),
  );
  const activeItem = createMemo(() => {
    const name = activeItemName();

    return currentIndex() < 0 || !name ? null : (runtimeItemByName().get(name) ?? null);
  });
  const activeDefinition = () => {
    const name = activeItemName();

    return name ? collection()?.itemByName.get(name) : undefined;
  };
  const activeItemRequired = createMemo(() => {
    if (currentIndex() < 0) {
      return null;
    }

    const definition = activeDefinition();

    return definition ? Boolean(definition.required) : (activeItem()?.required ?? false);
  });
  const activeItemStatus = createMemo<QuestionnaireItemStatus | null>(() =>
    currentIndex() < 0 ? null : (activeItem()?.status ?? (activeItemName() ? "unanswered" : null)),
  );
  const orderedRegistrations = createMemo(() => {
    const currentCollection = collection();

    if (!currentCollection) {
      return runtimeItems();
    }

    return currentCollection.enabledItems.flatMap((definition) => {
      const registration = runtimeItemByName().get(definition.name);

      return registration ? [registration] : [];
    });
  });
  const total = () => logicalItems().length;
  const current = () => (currentIndex() < 0 ? 0 : currentIndex() + 1);
  const first = () => total() > 0 && currentIndex() === 0;
  const last = () => total() > 0 && currentIndex() === total() - 1;

  const setItem = (nextItem: string, focusTarget: PendingFocus["target"] = "item") => {
    if (nextItem === untrack(activeItemName)) {
      return;
    }

    pendingFocus = { name: nextItem, target: focusTarget };

    if (!untrack(controlled)) {
      setUncontrolledItem(nextItem);
    }

    local.onItemChange?.(nextItem);
  };

  createEffect(() => {
    if (total() === 0) {
      return;
    }

    if (currentIndex() < 0) {
      if (!controlled() && activeItemName() === null) {
        setUncontrolledItem(logicalItems()[0].name);
        return;
      }

      setItem(logicalItems()[0].name);
      return;
    }

    const currentPendingFocus = pendingFocus;
    const activeItemChanged = previousActiveItemName !== activeItemName();

    previousActiveItemName = activeItemName();

    if (!currentPendingFocus || currentPendingFocus.name !== activeItemName()) {
      if (controlled() && activeItemChanged) {
        pendingFocus = null;
        activeItem()?.focus();
      }

      return;
    }

    if (currentPendingFocus.target === "invalid") {
      activeItem()?.focusInvalid();
    } else {
      activeItem()?.focus();
    }

    pendingFocus = null;
  });

  const registerItem = (registration: ItemRegistration) => {
    setRegistrations((currentRegistrations) => [
      ...currentRegistrations.filter(
        (currentRegistration) =>
          currentRegistration.element !== registration.element &&
          currentRegistration.name !== registration.name,
      ),
      registration,
    ]);

    return () => {
      setRegistrations((currentRegistrations) =>
        currentRegistrations.filter((currentRegistration) => currentRegistration !== registration),
      );
    };
  };

  const goPrevious = () => {
    if (untrack(currentIndex) <= 0) {
      return;
    }

    setItem(untrack(logicalItems)[untrack(currentIndex) - 1].name);
  };

  const goNext = () => {
    const item = untrack(activeItem);

    if (!item || untrack(currentIndex) >= untrack(total) - 1) {
      return;
    }

    if (!item.validate()) {
      item.focusInvalid();
      return;
    }

    setItem(untrack(logicalItems)[untrack(currentIndex) + 1].name);
  };

  const confirmCurrent = () => {
    const item = untrack(activeItem);

    if (!item) {
      return;
    }

    if (!item.validate()) {
      item.focusInvalid();
      return;
    }

    if (untrack(last)) {
      rootElement?.requestSubmit();
      return;
    }

    setItem(untrack(logicalItems)[untrack(currentIndex) + 1].name);
  };

  const skipCurrent = () => {
    const item = untrack(activeItem);

    if (!item || item.required) {
      return;
    }

    item.skip();

    if (!untrack(last)) {
      setItem(untrack(logicalItems)[untrack(currentIndex) + 1].name);
      return;
    }

    queueMicrotask(() => {
      rootElement?.requestSubmit();
    });
  };

  const handleReset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    local.onReset?.(event);

    if (event.defaultPrevented) {
      return;
    }

    for (const registration of untrack(registrations)) {
      registration.reset();
    }

    const currentCollection = untrack(collection);
    const resetItemName = currentCollection
      ? getInitialItemName(currentCollection, local.defaultItem)
      : (untrack(runtimeItems).find((registration) => registration.name === local.defaultItem)
          ?.name ?? untrack(runtimeItems)[0]?.name);

    if (resetItemName) {
      setItem(resetItemName);
    }
  };

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    const firstInvalidItem = untrack(orderedRegistrations).find(
      (registration) => !registration.validate(),
    );

    if (firstInvalidItem) {
      event.preventDefault();
      setItem(firstInvalidItem.name, "invalid");

      if (firstInvalidItem.name === untrack(activeItemName)) {
        firstInvalidItem.focusInvalid();
        pendingFocus = null;
      }

      return;
    }

    local.onSubmit?.(event);
  };

  const handleKeyDown: JSX.EventHandler<HTMLFormElement, KeyboardEvent> = (event) => {
    local.onKeyDown?.(event);

    const item = untrack(activeItem);

    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      !item ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!event.repeat) {
        confirmCurrent();
      }

      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const moved = item.moveAnswerFocus(
        event.target,
        event.key === "ArrowDown" ? "next" : "previous",
      );

      if (moved) {
        event.preventDefault();
        return;
      }
    }

    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      !isTextEntryTarget(event.target) &&
      !isRadioTarget(event.target)
    ) {
      event.preventDefault();

      if (event.repeat) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      } else if (item.status !== "unanswered") {
        goNext();
      }

      return;
    }

    if (event.key === "Enter") {
      const answer = item.getAnswerByElement(event.target);

      if (!answer) {
        return;
      }

      event.preventDefault();

      if (!event.repeat && isAnswerFilled(answer)) {
        confirmCurrent();
      }

      return;
    }

    const shortcutMode = untrack(shortcuts);

    if (!shortcutMode || isTextEntryTarget(event.target)) {
      return;
    }

    const shortcut = getShortcutFromKey(event.key, shortcutMode);
    const answer = shortcut ? item.getAnswerByShortcut(shortcut) : null;

    if (!answer) {
      return;
    }

    event.preventDefault();

    if (event.repeat) {
      return;
    }

    answer.element.focus();

    if (answer.type === "choice") {
      answer.element.click();
    }
  };

  const context: QuestionnaireContextValue = {
    get current() {
      return current();
    },
    get first() {
      return first();
    },
    get last() {
      return last();
    },
    get total() {
      return total();
    },
    get activeItem() {
      return activeItem();
    },
    get activeItemName() {
      return activeItemName();
    },
    get activeItemRequired() {
      return activeItemRequired();
    },
    get activeItemStatus() {
      return activeItemStatus();
    },
    get domVersion() {
      return domVersion();
    },
    goNext,
    goPrevious,
    get itemDefinitionByName() {
      return collection()?.itemByName ?? null;
    },
    get nativeValidation() {
      return nativeValidation();
    },
    registerItem,
    get shortcuts() {
      return shortcuts();
    },
    skipCurrent,
  };

  return (
    <QuestionnaireContext.Provider value={context}>
      <form
        data-slot="questionnaire"
        data-current={current()}
        data-first={first() ? "" : undefined}
        data-last={last() ? "" : undefined}
        data-shortcuts={local.shortcuts}
        data-total={total()}
        class={cn("z-questionnaire flex w-full min-w-0 flex-col", local.class)}
        noValidate={local.noValidate ?? true}
        onKeyDown={handleKeyDown}
        onReset={handleReset}
        onSubmit={handleSubmit}
        ref={(element) => {
          rootElement = element;
          local.ref?.(element);
        }}
        {...others}
      >
        {local.children}
      </form>
    </QuestionnaireContext.Provider>
  );
};

type QuestionnaireProgressProps = Omit<ComponentProps<"div">, "children"> & {
  children?: JSX.Element | ((state: QuestionnaireRootState) => JSX.Element);
};

const QuestionnaireProgress = (props: QuestionnaireProgressProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, ["children", "class"]);
  const label = () =>
    context.total ? `Question ${context.current} of ${context.total}` : undefined;
  const content = () => {
    const children = local.children;

    if (typeof children === "function") {
      return children({
        current: context.current,
        first: context.first,
        last: context.last,
        total: context.total,
      });
    }

    return children ?? label();
  };

  return (
    <div
      data-slot="questionnaire-progress"
      role="progressbar"
      aria-label="Questionnaire progress"
      aria-live="polite"
      aria-valuemax={context.total || undefined}
      aria-valuemin={context.total ? 1 : undefined}
      aria-valuenow={context.total ? context.current : undefined}
      aria-valuetext={label()}
      data-current={context.current}
      data-first={context.first ? "" : undefined}
      data-last={context.last ? "" : undefined}
      data-total={context.total}
      class={cn(
        "z-questionnaire-progress min-h-[1lh] w-fit min-w-[14ch] font-medium text-muted-foreground tabular-nums",
        local.class,
      )}
      {...others}
    >
      {content()}
    </div>
  );
};

type QuestionnaireItemProps = Omit<ComponentProps<"fieldset">, "name" | "ref"> & {
  invalid?: boolean;
  multiple?: boolean;
  name: string;
  onStatusChange?: (status: QuestionnaireItemStatus) => void;
  ref?: (element: HTMLFieldSetElement) => void;
  required?: boolean;
};

const QuestionnaireItem = (props: QuestionnaireItemProps) => {
  const rootContext = useQuestionnaire();
  const [local, others] = splitProps(props, [
    "aria-describedby",
    "aria-keyshortcuts",
    "children",
    "class",
    "disabled",
    "invalid",
    "multiple",
    "name",
    "onStatusChange",
    "ref",
    "required",
  ]);

  let element: HTMLFieldSetElement | undefined;
  let defaultSelectedAnswerIds: string[] = [];

  const [answerControlRegistrations, setAnswerControlRegistrations] = createSignal<
    AnswerControlRegistration[]
  >([]);
  const [validationAttempted, setValidationAttempted] = createSignal(false);
  const [selectedAnswerIds, setSelectedAnswerIds] = createSignal<string[]>([]);
  const [skipped, setSkipped] = createSignal(false);
  const [resetVersion, setResetVersion] = createSignal(0);
  const [descriptionIds, setDescriptionIds] = createSignal<string[]>([]);
  const [errorIds, setErrorIds] = createSignal<string[]>([]);

  const disabled = () => local.disabled ?? false;
  const multiple = () => local.multiple ?? false;
  const required = () => local.required ?? false;
  const externallyInvalid = () => local.invalid ?? false;
  const active = createMemo(() => !disabled() && rootContext.activeItemName === local.name);
  const answerControls = createMemo(() => {
    rootContext.domVersion;

    return [...answerControlRegistrations()].sort((firstAnswer, secondAnswer) =>
      compareElementOrder(firstAnswer.element, secondAnswer.element),
    );
  });
  const answers = createMemo(() =>
    answerControls().filter((registration) => !registration.disabled),
  );
  const answered = createMemo(() =>
    answers().some((answer) => selectedAnswerIds().includes(answer.id)),
  );
  const status = createMemo<QuestionnaireItemStatus>(() =>
    skipped() ? "skipped" : answered() ? "answered" : "unanswered",
  );
  const intentionallySkipped = () => status() === "skipped" && !required();
  const valid = createMemo(
    () => disabled() || intentionallySkipped() || (!externallyInvalid() && status() === "answered"),
  );
  const invalid = createMemo(
    () =>
      !disabled() &&
      !intentionallySkipped() &&
      (externallyInvalid() || (validationAttempted() && !valid())),
  );
  const hasInputAnswer = createMemo(() => answers().some((answer) => answer.type === "input"));
  const itemDefinition = () => rootContext.itemDefinitionByName?.get(local.name);
  const shortcutByChoiceValue = createMemo(() =>
    rootContext.itemDefinitionByName
      ? getShortcutByChoiceValue(itemDefinition(), rootContext.shortcuts)
      : null,
  );
  const shortcutByAnswerId = createMemo(() => {
    if (shortcutByChoiceValue()) {
      return new Map<string, string>();
    }

    const keys = getShortcutKeys(rootContext.shortcuts);
    const shortcutAnswers = answers().filter((answer) => answer.type === "choice");

    return new Map(
      shortcutAnswers.slice(0, keys.length).map((answer, index) => [answer.id, keys[index]]),
    );
  });

  let previousStatus = untrack(status);

  createEffect(() => {
    const currentStatus = status();

    if (previousStatus === currentStatus) {
      return;
    }

    previousStatus = currentStatus;
    local.onStatusChange?.(currentStatus);
  });

  const registerAnswerControl = (registration: AnswerControlRegistration) => {
    setAnswerControlRegistrations((currentRegistrations) => [
      ...currentRegistrations.filter(
        (currentRegistration) =>
          currentRegistration.element !== registration.element &&
          currentRegistration.id !== registration.id,
      ),
      registration,
    ]);

    return () => {
      setAnswerControlRegistrations((currentRegistrations) =>
        currentRegistrations.filter((currentRegistration) => currentRegistration !== registration),
      );
    };
  };

  const updateAnswerSelected = (answerId: string, selected: boolean) => {
    setSelectedAnswerIds((currentAnswerIds) => {
      if (!selected) {
        return currentAnswerIds.filter((currentAnswerId) => currentAnswerId !== answerId);
      }

      if (!untrack(multiple)) {
        return [answerId];
      }

      return currentAnswerIds.includes(answerId)
        ? currentAnswerIds
        : [...currentAnswerIds, answerId];
    });
  };

  const setAnswerSelectionFromInteraction = (answerId: string, selected: boolean) => {
    setSkipped(false);
    updateAnswerSelected(answerId, selected);
  };

  const syncControlledAnswerSelection = (answerId: string, selected: boolean) => {
    if (selected) {
      setSkipped(false);
    }

    updateAnswerSelected(answerId, selected);
  };

  const registerAnswerSelection = (answerId: string, defaultSelected: boolean) => {
    if (defaultSelected) {
      defaultSelectedAnswerIds = [
        ...defaultSelectedAnswerIds.filter((currentAnswerId) => currentAnswerId !== answerId),
        answerId,
      ];
      setSelectedAnswerIds((currentAnswerIds) => {
        if (!untrack(multiple)) {
          return currentAnswerIds.length ? currentAnswerIds : [answerId];
        }

        return currentAnswerIds.includes(answerId)
          ? currentAnswerIds
          : [...currentAnswerIds, answerId];
      });
    }

    return () => {
      defaultSelectedAnswerIds = defaultSelectedAnswerIds.filter(
        (currentAnswerId) => currentAnswerId !== answerId,
      );
      setSelectedAnswerIds((currentAnswerIds) =>
        currentAnswerIds.filter((currentAnswerId) => currentAnswerId !== answerId),
      );
    };
  };

  const setAnswerDefault = (answerId: string, defaultSelected: boolean) => {
    if (defaultSelected) {
      defaultSelectedAnswerIds = defaultSelectedAnswerIds.includes(answerId)
        ? defaultSelectedAnswerIds
        : [...defaultSelectedAnswerIds, answerId];
      return;
    }

    defaultSelectedAnswerIds = defaultSelectedAnswerIds.filter(
      (currentAnswerId) => currentAnswerId !== answerId,
    );
  };

  const registerDescription = (registeredDescriptionId: string) => {
    setDescriptionIds((currentDescriptionIds) =>
      currentDescriptionIds.includes(registeredDescriptionId)
        ? currentDescriptionIds
        : [...currentDescriptionIds, registeredDescriptionId],
    );

    return () => {
      setDescriptionIds((currentDescriptionIds) =>
        currentDescriptionIds.filter(
          (currentDescriptionId) => currentDescriptionId !== registeredDescriptionId,
        ),
      );
    };
  };

  const registerError = (registeredErrorId: string) => {
    setErrorIds((currentErrorIds) =>
      currentErrorIds.includes(registeredErrorId)
        ? currentErrorIds
        : [...currentErrorIds, registeredErrorId],
    );

    return () => {
      setErrorIds((currentErrorIds) =>
        currentErrorIds.filter((currentErrorId) => currentErrorId !== registeredErrorId),
      );
    };
  };

  const validate = () => {
    setValidationAttempted(true);

    if (!untrack(valid)) {
      return false;
    }

    if (!rootContext.nativeValidation) {
      return true;
    }

    const invalidAnswer = untrack(answers).find(
      (answer) =>
        isAnswerFilled(answer) && answer.element.willValidate && !answer.element.validity.valid,
    );

    if (!invalidAnswer) {
      return true;
    }

    invalidAnswer.element.focus();
    invalidAnswer.element.reportValidity();

    return false;
  };

  const focus = () => {
    element?.focus();
  };

  const focusInvalid = () => {
    const selectedInput = element?.querySelector<HTMLInputElement>(
      "input[data-filled][name]:not(:disabled)",
    );
    const firstControl = element?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not(:disabled), textarea:not(:disabled)",
    );

    (selectedInput ?? firstControl ?? element)?.focus();
  };

  const reset = () => {
    setValidationAttempted(false);
    setSkipped(false);
    setSelectedAnswerIds(
      untrack(multiple) ? [...defaultSelectedAnswerIds] : defaultSelectedAnswerIds.slice(0, 1),
    );
    setResetVersion((version) => version + 1);
  };

  const skip = () => {
    if (untrack(required)) {
      return;
    }

    setSelectedAnswerIds([]);
    setSkipped(true);
  };

  createEffect(
    on(
      multiple,
      (isMultiple, wasMultiple) => {
        if (!wasMultiple || isMultiple) {
          return;
        }

        setSelectedAnswerIds((currentAnswerIds) => {
          const selectedAnswer = untrack(answers).find((answer) =>
            currentAnswerIds.includes(answer.id),
          );

          return selectedAnswer ? [selectedAnswer.id] : [];
        });
      },
      { defer: true },
    ),
  );

  const getAnswerByElement = (answerElement: Element) =>
    untrack(answers).find((answer) => answer.element === answerElement) ?? null;

  const getAnswerByShortcut = (shortcut: string) => {
    const byChoiceValue = untrack(shortcutByChoiceValue);
    const currentAnswers = untrack(answers);

    if (byChoiceValue) {
      const choiceValue = Array.from(byChoiceValue.entries()).find(
        ([, choiceShortcut]) => choiceShortcut === shortcut,
      )?.[0];

      return (
        currentAnswers.find((answer) => answer.type === "choice" && answer.value === choiceValue) ??
        null
      );
    }

    const answerId = Array.from(untrack(shortcutByAnswerId).entries()).find(
      ([, answerShortcut]) => answerShortcut === shortcut,
    )?.[0];

    return currentAnswers.find((answer) => answer.id === answerId) ?? null;
  };

  const moveAnswerFocus = (currentElement: Element, direction: "next" | "previous") => {
    const currentAnswers = untrack(answers);
    const answerIndex = currentAnswers.findIndex((answer) => answer.element === currentElement);
    const currentAnswer = answerIndex < 0 ? null : (currentAnswers[answerIndex] ?? null);

    if (
      !currentAnswers.length ||
      (isTextEntryTarget(currentElement) && !isEmptyNavigableInput(currentAnswer)) ||
      (answerIndex < 0 && currentElement !== element)
    ) {
      return false;
    }

    const nextAnswer =
      answerIndex < 0
        ? (currentAnswers.find(isAnswerFilled) ??
          (direction === "next" ? currentAnswers[0] : currentAnswers[currentAnswers.length - 1]))
        : currentAnswers[
            (answerIndex + (direction === "next" ? 1 : -1) + currentAnswers.length) %
              currentAnswers.length
          ];

    if (!nextAnswer || nextAnswer.element === currentElement) {
      return false;
    }

    if (answerIndex >= 0 && isRadioTarget(currentElement) && isRadioTarget(nextAnswer.element)) {
      return false;
    }

    nextAnswer.element.focus();

    if (nextAnswer.type === "choice" && isRadioTarget(nextAnswer.element)) {
      nextAnswer.element.click();
    }

    return true;
  };

  onMount(() => {
    if (!element) {
      return;
    }

    const registration: ItemRegistration = {
      get choices() {
        return answerControls().flatMap((answer) =>
          answer.type === "choice" ? [{ disabled: answer.ownDisabled, value: answer.value }] : [],
        );
      },
      get disabled() {
        return disabled();
      },
      element,
      focus,
      focusInvalid,
      getAnswerByElement,
      getAnswerByShortcut,
      moveAnswerFocus,
      get name() {
        return local.name;
      },
      get required() {
        return required();
      },
      reset,
      skip,
      get status() {
        return status();
      },
      validate,
    };

    onCleanup(rootContext.registerItem(registration));
  });

  const context: QuestionnaireItemContextValue = {
    get active() {
      return active();
    },
    get disabled() {
      return disabled();
    },
    get hasInputAnswer() {
      return hasInputAnswer();
    },
    get invalid() {
      return invalid();
    },
    get multiple() {
      return multiple();
    },
    get name() {
      return local.name;
    },
    registerAnswerControl,
    registerAnswerSelection,
    registerDescription,
    registerError,
    get required() {
      return required();
    },
    get resetVersion() {
      return resetVersion();
    },
    get selectedAnswerIds() {
      return selectedAnswerIds();
    },
    setAnswerDefault,
    setAnswerSelectionFromInteraction,
    get shortcutByAnswerId() {
      return shortcutByAnswerId();
    },
    get shortcutByChoiceValue() {
      return shortcutByChoiceValue();
    },
    get shortcuts() {
      return rootContext.shortcuts;
    },
    get status() {
      return status();
    },
    syncControlledAnswerSelection,
  };

  const describedBy = () =>
    [...descriptionIds(), ...(invalid() ? errorIds() : []), local["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;
  const keyShortcuts = () =>
    [
      local["aria-keyshortcuts"],
      active() ? "Meta+Enter Control+Enter" : undefined,
      active() && answers().length ? "ArrowUp ArrowDown" : undefined,
      active() && !rootContext.first ? "ArrowLeft" : undefined,
      active() && !rootContext.last && status() !== "unanswered" ? "ArrowRight" : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <QuestionnaireItemContext.Provider value={context}>
      <fieldset
        data-slot="questionnaire-item"
        aria-describedby={describedBy()}
        aria-invalid={invalid() || undefined}
        aria-keyshortcuts={keyShortcuts()}
        data-active={active() ? "" : undefined}
        data-disabled={disabled() ? "" : undefined}
        data-invalid={invalid() ? "" : undefined}
        data-multiple={multiple() ? "" : undefined}
        data-required={required() ? "" : undefined}
        data-status={status()}
        disabled={disabled()}
        hidden={!active()}
        inert={!active()}
        tabIndex={-1}
        class={cn("z-questionnaire-item min-w-0 border-0 p-0 outline-none", local.class)}
        ref={(currentElement) => {
          element = currentElement;
          local.ref?.(currentElement);
        }}
        {...others}
      >
        {local.children}
      </fieldset>
    </QuestionnaireItemContext.Provider>
  );
};

const QuestionnaireTitle = (props: ComponentProps<"legend">) => {
  useQuestionnaireItemContext("QuestionnaireTitle");
  const [local, others] = splitProps(props, ["class"]);

  return (
    <legend
      data-slot="questionnaire-title"
      class={cn("z-font-heading z-questionnaire-title text-pretty", local.class)}
      {...others}
    />
  );
};

const QuestionnaireDescription = (props: ComponentProps<"p">) => {
  const itemContext = useQuestionnaireItemContext("QuestionnaireDescription");
  const [local, others] = splitProps(props, ["class", "id"]);
  const generatedId = createUniqueId();
  const descriptionId = () => local.id ?? generatedId;

  createEffect(() => {
    onCleanup(itemContext.registerDescription(descriptionId()));
  });

  return (
    <p
      data-slot="questionnaire-description"
      id={descriptionId()}
      class={cn("z-questionnaire-description text-pretty text-muted-foreground", local.class)}
      {...others}
    />
  );
};

const QuestionnaireChoices = (props: ComponentProps<"div">) => {
  const itemContext = useQuestionnaireItemContext("QuestionnaireChoices");
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="questionnaire-choices"
      data-shortcuts={itemContext.shortcuts ?? undefined}
      class={cn("group/questionnaire-choices z-questionnaire-choices grid min-w-0", local.class)}
      {...others}
    />
  );
};

type QuestionnaireChoiceProps = Omit<ComponentProps<"label">, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: JSX.EventHandler<HTMLInputElement, Event>;
  value: string;
};

const QuestionnaireChoice = (props: QuestionnaireChoiceProps) => {
  const itemContext = useQuestionnaireItemContext("QuestionnaireChoice");
  const [local, others] = splitProps(props, [
    "checked",
    "children",
    "class",
    "defaultChecked",
    "disabled",
    "onChange",
    "value",
  ]);

  const answerId = createUniqueId();
  let inputElement: HTMLInputElement | undefined;
  const initialDefaultChecked = untrack(() => local.defaultChecked ?? false);
  const controlled = () => local.checked !== undefined;
  const choiceDisabled = () => local.disabled ?? false;
  const disabled = () => itemContext.disabled || choiceDisabled();
  const selected = () => itemContext.selectedAnswerIds.includes(answerId);
  const checked = createMemo(() =>
    controlled() ? (itemContext.status === "skipped" ? false : Boolean(local.checked)) : selected(),
  );
  const type = () => (itemContext.multiple ? "checkbox" : "radio");
  const shortcut = createMemo(
    () =>
      itemContext.shortcutByChoiceValue?.get(local.value) ??
      itemContext.shortcutByAnswerId.get(answerId) ??
      null,
  );

  onMount(() => {
    onCleanup(itemContext.registerAnswerSelection(answerId, initialDefaultChecked));
  });

  createEffect(() => {
    itemContext.setAnswerDefault(answerId, local.defaultChecked ?? false);
  });

  onMount(() => {
    if (!inputElement) {
      return;
    }

    const registration: AnswerControlRegistration = {
      get disabled() {
        return disabled();
      },
      element: inputElement,
      id: answerId,
      get ownDisabled() {
        return choiceDisabled();
      },
      type: "choice",
      get value() {
        return local.value;
      },
    };

    onCleanup(itemContext.registerAnswerControl(registration));
  });

  createEffect(() => {
    if (controlled()) {
      itemContext.resetVersion;
      itemContext.syncControlledAnswerSelection(answerId, Boolean(local.checked));
    }
  });

  createEffect(() => {
    if (!inputElement) {
      return;
    }

    // Keep the native reset target aligned with Questionnaire's owned default,
    // including controlled choices whose checked prop remains authoritative.
    inputElement.defaultChecked = controlled()
      ? Boolean(local.checked)
      : (local.defaultChecked ?? false);

    if (itemContext.resetVersion > 0) {
      inputElement.checked = checked();
    }
  });

  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    local.onChange?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!controlled()) {
      itemContext.setAnswerSelectionFromInteraction(answerId, event.currentTarget.checked);
      return;
    }

    if (itemContext.status === "skipped" && local.checked === event.currentTarget.checked) {
      itemContext.setAnswerSelectionFromInteraction(answerId, Boolean(local.checked));
    }
  };

  return (
    <label
      data-slot="questionnaire-choice"
      data-checked={checked() ? "" : undefined}
      data-unchecked={checked() ? undefined : ""}
      data-disabled={disabled() ? "" : undefined}
      data-invalid={itemContext.invalid ? "" : undefined}
      data-shortcut={shortcut() ?? undefined}
      data-type={type()}
      class={cn(
        "group/questionnaire-choice relative z-questionnaire-choice flex min-h-11 cursor-pointer select-none items-start text-start outline-none transition-colors",
        "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        local.class,
      )}
      {...others}
    >
      <input
        data-slot="questionnaire-choice-input"
        data-checked={checked() ? "" : undefined}
        data-unchecked={checked() ? undefined : ""}
        data-disabled={disabled() ? "" : undefined}
        data-invalid={itemContext.invalid ? "" : undefined}
        data-shortcut={shortcut() ?? undefined}
        data-type={type()}
        aria-invalid={itemContext.invalid || undefined}
        aria-keyshortcuts={getAnswerKeyShortcuts(shortcut(), !disabled() && checked())}
        checked={checked()}
        disabled={disabled()}
        id={answerId}
        name={itemContext.status === "skipped" ? undefined : itemContext.name}
        onChange={handleChange}
        required={itemContext.required && !itemContext.multiple && !itemContext.hasInputAnswer}
        type={type()}
        value={local.value}
        class="absolute inset-0 z-10 z-questionnaire-choice-input size-full cursor-pointer opacity-0"
        ref={inputElement}
      />
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        class="pointer-events-none relative z-questionnaire-choice-indicator flex shrink-0 items-center justify-center border group-data-[type=radio]/questionnaire-choice:rounded-full"
      >
        <span
          data-slot="questionnaire-choice-indicator-dot"
          class="z-questionnaire-choice-indicator-dot hidden rounded-full group-data-checked/questionnaire-choice:block group-data-[type=checkbox]/questionnaire-choice:hidden"
        />
        <Check
          data-slot="questionnaire-choice-indicator-check"
          class="z-questionnaire-choice-indicator-check hidden group-data-checked/questionnaire-choice:block group-data-[type=radio]/questionnaire-choice:hidden"
        />
      </span>
      <span
        data-slot="questionnaire-choice-label"
        class="z-questionnaire-choice-content z-questionnaire-choice-label flex min-w-0 flex-1 flex-col leading-snug"
      >
        {local.children}
      </span>
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-shortcut"
        data-shortcut={shortcut() ?? undefined}
        hidden={shortcut() === null}
        class="pointer-events-none z-questionnaire-choice-shortcut z-questionnaire-shortcut ms-auto hidden shrink-0 group-data-[shortcut]/questionnaire-choice:inline-flex"
      >
        {shortcut()}
      </span>
    </label>
  );
};

const QuestionnaireChoiceDescription = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <span
      data-slot="questionnaire-choice-description"
      class={cn("z-questionnaire-choice-description", local.class)}
      {...others}
    />
  );
};

type QuestionnaireInputProps = Omit<
  ComponentProps<"input">,
  "form" | "name" | "onChange" | "onInput" | "ref" | "type"
> & {
  defaultValue?: string | number;
  onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
  ref?: (element: HTMLInputElement) => void;
  type?: QuestionnaireInputType;
};

const QuestionnaireInput = (props: QuestionnaireInputProps) => {
  const itemContext = useQuestionnaireItemContext("QuestionnaireInput");
  const [local, others] = splitProps(props, [
    "class",
    "defaultValue",
    "disabled",
    "onInput",
    "ref",
    "type",
    "value",
  ]);

  const answerId = createUniqueId();
  let inputElement: HTMLInputElement | undefined;
  const initialDefaultFilled = untrack(() => hasInputValue(local.defaultValue));
  const controlled = () => local.value !== undefined;
  const defaultFilled = () => hasInputValue(local.defaultValue);
  const controlledFilled = () => hasInputValue(local.value);
  const [uncontrolledFilled, setUncontrolledFilled] = createSignal(initialDefaultFilled);
  const disabled = () => itemContext.disabled || (local.disabled ?? false);
  const filled = () => (controlled() ? controlledFilled() : uncontrolledFilled());
  const selected = () => itemContext.selectedAnswerIds.includes(answerId);

  onMount(() => {
    onCleanup(itemContext.registerAnswerSelection(answerId, initialDefaultFilled));
  });

  createEffect(() => {
    itemContext.setAnswerDefault(answerId, defaultFilled());
  });

  onMount(() => {
    if (!inputElement) {
      return;
    }

    if (!untrack(controlled) && local.defaultValue !== undefined) {
      inputElement.value = String(local.defaultValue);
    }

    const registration: AnswerControlRegistration = {
      get disabled() {
        return disabled();
      },
      element: inputElement,
      id: answerId,
      type: "input",
    };

    onCleanup(itemContext.registerAnswerControl(registration));
  });

  createEffect(() => {
    if (controlled()) {
      itemContext.resetVersion;
      itemContext.syncControlledAnswerSelection(answerId, controlledFilled());
      return;
    }

    if (itemContext.resetVersion > 0) {
      setUncontrolledFilled(defaultFilled());
    }
  });

  createEffect(() => {
    if (!inputElement) {
      return;
    }

    inputElement.defaultValue = controlled()
      ? String(local.value)
      : local.defaultValue !== undefined
        ? String(local.defaultValue)
        : "";
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    local.onInput?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const nextFilled = event.currentTarget.value.trim().length > 0;

    if (controlled()) {
      return;
    }

    setUncontrolledFilled(nextFilled);
    itemContext.setAnswerSelectionFromInteraction(answerId, nextFilled);
  };

  return (
    <div
      data-slot="questionnaire-input-wrapper"
      class="group/questionnaire-input relative z-questionnaire-input-wrapper min-w-0"
    >
      <input
        data-slot="questionnaire-input"
        data-disabled={disabled() ? "" : undefined}
        data-empty={filled() ? undefined : ""}
        data-filled={filled() ? "" : undefined}
        data-invalid={itemContext.invalid ? "" : undefined}
        aria-invalid={itemContext.invalid || undefined}
        aria-keyshortcuts={getAnswerKeyShortcuts(null, !disabled() && filled() && selected())}
        disabled={disabled()}
        form={selected() ? undefined : ""}
        id={answerId}
        name={selected() ? itemContext.name : undefined}
        onInput={handleInput}
        type={local.type ?? "text"}
        value={controlled() ? String(local.value) : undefined}
        class={cn(
          "z-questionnaire-input min-h-11 w-full min-w-0 outline-none transition-[color,box-shadow,background-color] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0",
          "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          local.class,
        )}
        ref={(element) => {
          inputElement = element;
          local.ref?.(element);
        }}
        {...others}
      />
    </div>
  );
};

const QuestionnaireError = (props: ComponentProps<"p">) => {
  const itemContext = useQuestionnaireItemContext("QuestionnaireError");
  const [local, others] = splitProps(props, ["children", "class", "id"]);
  const generatedId = createUniqueId();
  const errorId = () => local.id ?? generatedId;

  createEffect(() => {
    onCleanup(itemContext.registerError(errorId()));
  });

  return (
    <p
      data-slot="questionnaire-error"
      data-invalid={itemContext.invalid ? "" : undefined}
      hidden={!itemContext.invalid}
      id={errorId()}
      role={itemContext.invalid ? "alert" : undefined}
      class={cn("z-questionnaire-error text-destructive", local.class)}
      {...others}
    >
      {local.children ??
        (itemContext.required
          ? "Choose an answer to continue."
          : "Choose an answer or skip this question.")}
    </p>
  );
};

const QuestionnaireActions = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="questionnaire-actions"
      class={cn(
        "z-questionnaire-actions grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center",
        local.class,
      )}
      {...others}
    />
  );
};

type QuestionnaireNavigationProps = ComponentProps<"button"> &
  Pick<ButtonProps, "size" | "variant">;

type QuestionnaireNavigationButtonProps = QuestionnaireNavigationProps & {
  defaultChildren: string;
  navigationClass: string;
  shortcut?: "Enter";
  slotName: string;
  visible: boolean;
};

const QuestionnaireNavigationButton = (props: QuestionnaireNavigationButtonProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "defaultChildren",
    "disabled",
    "navigationClass",
    "shortcut",
    "size",
    "slotName",
    "tabIndex",
    "type",
    "variant",
    "visible",
  ]);

  const disabled = () => local.disabled ?? false;
  const activeShortcut = () => (local.visible && !disabled() ? (local.shortcut ?? null) : null);

  return (
    <button
      data-slot={local.slotName}
      data-size={local.size ?? "default"}
      data-variant={local.variant ?? "default"}
      aria-hidden={!local.visible || undefined}
      aria-keyshortcuts={activeShortcut() ?? undefined}
      data-disabled={disabled() ? "" : undefined}
      data-shortcut={activeShortcut() ?? undefined}
      data-status={context.activeItemStatus ?? undefined}
      data-visible={local.visible ? "" : undefined}
      data-hidden={local.visible ? undefined : ""}
      disabled={disabled()}
      hidden={!local.visible}
      inert={!local.visible}
      tabIndex={local.visible ? local.tabIndex : -1}
      type={local.type ?? "button"}
      class={cn(
        buttonVariants({
          size: local.size ?? "default",
          variant: local.variant ?? "default",
        }),
        local.navigationClass,
        local.class,
      )}
      {...others}
    >
      {local.children ?? local.defaultChildren}
    </button>
  );
};

const QuestionnairePrevious = (props: QuestionnaireNavigationProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, ["onClick", "variant"]);

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (typeof local.onClick === "function") {
      local.onClick(event);
    }

    if (!event.defaultPrevented) {
      context.goPrevious();
    }
  };

  return (
    <QuestionnaireNavigationButton
      defaultChildren="Previous"
      navigationClass="z-questionnaire-previous col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0"
      onClick={handleClick}
      slotName="questionnaire-previous"
      variant={local.variant ?? "outline"}
      visible={context.total > 1 && !context.first}
      {...others}
    />
  );
};

const QuestionnaireSkip = (props: QuestionnaireNavigationProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, ["onClick", "variant"]);

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (typeof local.onClick === "function") {
      local.onClick(event);
    }

    if (!event.defaultPrevented) {
      context.skipCurrent();
    }
  };

  return (
    <QuestionnaireNavigationButton
      defaultChildren="Skip"
      navigationClass="z-questionnaire-skip col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0"
      onClick={handleClick}
      slotName="questionnaire-skip"
      variant={local.variant ?? "outline"}
      visible={context.activeItemRequired === false}
      {...others}
    />
  );
};

const QuestionnaireNext = (props: QuestionnaireNavigationProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, ["onClick"]);

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (typeof local.onClick === "function") {
      local.onClick(event);
    }

    if (!event.defaultPrevented) {
      context.goNext();
    }
  };

  return (
    <QuestionnaireNavigationButton
      defaultChildren="Next"
      navigationClass="z-questionnaire-next col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0"
      onClick={handleClick}
      shortcut="Enter"
      slotName="questionnaire-next"
      visible={context.total > 1 && !context.last}
      {...others}
    />
  );
};

const QuestionnaireSubmit = (props: QuestionnaireNavigationProps) => {
  const context = useQuestionnaire();
  const [local, others] = splitProps(props, ["type"]);

  return (
    <QuestionnaireNavigationButton
      defaultChildren="Submit"
      navigationClass="z-questionnaire-submit col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0"
      shortcut="Enter"
      slotName="questionnaire-submit"
      type={local.type ?? "submit"}
      visible={context.total > 0 && context.last}
      {...others}
    />
  );
};

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  type QuestionnaireItemDefinition,
  type QuestionnaireItemStatus,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  type QuestionnaireRootState,
  type QuestionnaireShortcutMode,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  useQuestionnaire,
};
