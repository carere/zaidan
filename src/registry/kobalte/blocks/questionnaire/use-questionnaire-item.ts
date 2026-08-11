import { createEffect, createMemo, createSignal, on, onCleanup, onMount, untrack } from "solid-js";
import { getShortcutByChoiceValue } from "./collection";
import { useQuestionnaireContext } from "./context";
import type {
  AnswerControlRegistration,
  ItemRegistration,
  QuestionnaireItemContextValue,
  QuestionnaireItemProps,
  QuestionnaireItemState,
  QuestionnaireItemStatus,
} from "./types";
import {
  compareAnswerOrder,
  getShortcutKeys,
  isAnswerFilled,
  isEmptyNavigableInput,
  isRadioTarget,
  isTextEntryTarget,
} from "./utils";

type CreateQuestionnaireItemParameters = Pick<
  QuestionnaireItemProps,
  | "aria-describedby"
  | "aria-keyshortcuts"
  | "disabled"
  | "invalid"
  | "multiple"
  | "name"
  | "onStatusChange"
  | "ref"
  | "required"
>;

function createQuestionnaireItem(props: CreateQuestionnaireItemParameters) {
  const rootContext = useQuestionnaireContext("Questionnaire.Item");

  const [element, setElement] = createSignal<HTMLFieldSetElement | null>(null);
  const [answerControlRegistrations, setAnswerControlRegistrations] = createSignal<
    AnswerControlRegistration[]
  >([]);
  const [validationAttempted, setValidationAttempted] = createSignal(false);
  const [selectedAnswerIds, setSelectedAnswerIds] = createSignal<string[]>([]);
  const [skipped, setSkipped] = createSignal(false);
  const [resetVersion, setResetVersion] = createSignal(0);
  const [descriptionIds, setDescriptionIds] = createSignal<string[]>([]);
  const [errorIds, setErrorIds] = createSignal<string[]>([]);

  let defaultSelectedAnswerIds: string[] = [];

  const disabled = () => props.disabled ?? false;
  const multiple = () => props.multiple ?? false;
  const required = () => props.required ?? false;
  const externallyInvalid = () => props.invalid ?? false;
  const active = createMemo(() => !disabled() && rootContext.activeItemName === props.name);
  const answerControls = createMemo(() => {
    rootContext.domVersion;

    return [...answerControlRegistrations()].sort(compareAnswerOrder);
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
  const itemDefinition = () => rootContext.itemDefinitionByName?.get(props.name);
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
    props.onStatusChange?.(currentStatus);
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
    untrack(element)?.focus();
  };

  const focusInvalid = () => {
    const currentElement = untrack(element);
    const selectedInput = currentElement?.querySelector<HTMLInputElement>(
      "input[data-filled][name]:not(:disabled)",
    );
    const firstControl = currentElement?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not(:disabled), textarea:not(:disabled)",
    );

    (selectedInput ?? firstControl ?? currentElement)?.focus();
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

  // Collapse a multi-selection down to a single answer when the item leaves
  // multiple mode.
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
      (answerIndex < 0 && currentElement !== untrack(element))
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
    const currentElement = untrack(element);

    if (!currentElement) {
      return;
    }

    // The registration is a live object: getters keep the root reading fresh
    // values without re-registering on every change.
    const registration: ItemRegistration = {
      get choices() {
        return answerControls().flatMap((answer) =>
          answer.type === "choice" ? [{ disabled: answer.ownDisabled, value: answer.value }] : [],
        );
      },
      get disabled() {
        return disabled();
      },
      element: currentElement,
      focus,
      focusInvalid,
      getAnswerByElement,
      getAnswerByShortcut,
      moveAnswerFocus,
      get name() {
        return props.name;
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
      return props.name;
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
    [...descriptionIds(), ...(invalid() ? errorIds() : []), props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;
  const keyShortcuts = () =>
    [
      props["aria-keyshortcuts"],
      active() ? "Meta+Enter Control+Enter" : undefined,
      active() && answers().length ? "ArrowUp ArrowDown" : undefined,
      active() && !rootContext.first ? "ArrowLeft" : undefined,
      active() && !rootContext.last && status() !== "unanswered" ? "ArrowRight" : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const setItemRef = (nextElement: HTMLFieldSetElement) => {
    setElement(nextElement);
    props.ref?.(nextElement);
  };

  const state: QuestionnaireItemState = {
    get active() {
      return active();
    },
    get disabled() {
      return disabled();
    },
    get invalid() {
      return invalid();
    },
    get multiple() {
      return multiple();
    },
    get required() {
      return required();
    },
    get status() {
      return status();
    },
  };

  return {
    context,
    itemProps: {
      get "aria-describedby"() {
        return describedBy();
      },
      get "aria-invalid"() {
        return invalid() || undefined;
      },
      get "aria-keyshortcuts"() {
        return keyShortcuts();
      },
      get disabled() {
        return disabled();
      },
      get hidden() {
        return !active();
      },
      get inert() {
        return !active();
      },
      ref: setItemRef,
      tabIndex: -1,
    },
    state,
  };
}

export { type CreateQuestionnaireItemParameters, createQuestionnaireItem };
