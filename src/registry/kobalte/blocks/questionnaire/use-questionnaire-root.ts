import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import {
  createQuestionnaireCollection,
  getCollectionDefinitionWarnings,
  getCollectionRegistrationWarnings,
  getInitialItemName,
} from "./collection";
import type {
  ItemRegistration,
  PendingFocus,
  QuestionnaireContextValue,
  QuestionnaireRootProps,
} from "./types";
import {
  compareItemOrder,
  getShortcutFromKey,
  isAnswerFilled,
  isRadioTarget,
  isTextEntryTarget,
} from "./utils";

type CreateQuestionnaireRootParameters = Pick<
  QuestionnaireRootProps,
  | "defaultItem"
  | "item"
  | "items"
  | "noValidate"
  | "onItemChange"
  | "onKeyDown"
  | "onReset"
  | "onSubmit"
  | "ref"
  | "shortcuts"
>;

function createQuestionnaireRoot(props: CreateQuestionnaireRootParameters) {
  let rootElement: HTMLFormElement | undefined;
  // Deliberately non-reactive: pending focus is consumed by the effect below
  // without re-triggering it.
  let pendingFocus: PendingFocus | null = null;

  const [registrations, setRegistrations] = createSignal<ItemRegistration[]>([]);
  const [domVersion, setDomVersion] = createSignal(0);
  const collection = createMemo(() => createQuestionnaireCollection(props.items));
  const [uncontrolledItem, setUncontrolledItem] = createSignal<string | null>(
    untrack(() => getInitialItemName(collection(), props.defaultItem)),
  );
  const controlled = () => props.item !== undefined;
  const activeItemName = () => (controlled() ? (props.item ?? null) : uncontrolledItem());
  let previousActiveItemName = untrack(activeItemName);
  const nativeValidation = () => props.noValidate === false;
  const shortcuts = () => props.shortcuts ?? null;

  if (import.meta.env.DEV) {
    let activeWarnings = new Set<string>();

    createEffect(() => {
      const currentCollection = collection();
      const currentDefaultItem = props.defaultItem;
      const currentRegistrations = registrations();
      const currentShortcuts = shortcuts();

      if (!currentCollection) {
        activeWarnings.clear();
        return;
      }

      let cancelled = false;

      onCleanup(() => {
        cancelled = true;
      });

      queueMicrotask(() => {
        if (cancelled || !rootElement) {
          return;
        }

        // Registrations expose live getters; read them untracked so the
        // microtask never subscribes this effect to registration state.
        const warnings = untrack(() => [
          ...getCollectionDefinitionWarnings(currentCollection, currentDefaultItem),
          ...getCollectionRegistrationWarnings(
            currentCollection,
            currentRegistrations,
            currentShortcuts,
          ),
        ]);
        const nextActiveWarnings = new Set(warnings);

        nextActiveWarnings.forEach((warning) => {
          if (!activeWarnings.has(warning)) {
            console.warn(`[Questionnaire] ${warning}`);
          }
        });

        activeWarnings = nextActiveWarnings;
      });
    });
  }

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
      .sort(compareItemOrder);
  });
  const runtimeItemByName = createMemo(
    () => new Map(runtimeItems().map((runtimeItem) => [runtimeItem.name, runtimeItem])),
  );
  const logicalItems = createMemo<readonly { name: string }[]>(
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
  const activeItemStatus = createMemo(() =>
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

    props.onItemChange?.(nextItem);
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
    props.onReset?.(event);

    if (event.defaultPrevented) {
      return;
    }

    for (const registration of untrack(registrations)) {
      registration.reset();
    }

    const currentCollection = untrack(collection);
    const resetItemName = currentCollection
      ? getInitialItemName(currentCollection, props.defaultItem)
      : (untrack(runtimeItems).find((registration) => registration.name === props.defaultItem)
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

    props.onSubmit?.(event);
  };

  const handleKeyDown: JSX.EventHandler<HTMLFormElement, KeyboardEvent> = (event) => {
    props.onKeyDown?.(event);

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

  const setRootRef = (element: HTMLFormElement) => {
    rootElement = element;
    props.ref?.(element);
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

  return {
    context,
    rootProps: {
      onKeyDown: handleKeyDown,
      onReset: handleReset,
      onSubmit: handleSubmit,
      ref: setRootRef,
    },
  };
}

export { type CreateQuestionnaireRootParameters, createQuestionnaireRoot };
