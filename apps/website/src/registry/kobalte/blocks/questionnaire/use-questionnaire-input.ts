import type { JSX } from "solid-js";
import { createEffect, createSignal, createUniqueId, onCleanup, onMount, untrack } from "solid-js";
import { useQuestionnaireItemContext } from "./context";
import type {
  AnswerControlRegistration,
  QuestionnaireInputProps,
  QuestionnaireInputState,
} from "./types";
import { getAnswerKeyShortcuts, hasInputValue } from "./utils";

type CreateQuestionnaireInputParameters = Pick<
  QuestionnaireInputProps,
  "defaultValue" | "disabled" | "onInput" | "ref" | "type" | "value"
>;

function createQuestionnaireInput(props: CreateQuestionnaireInputParameters) {
  const itemContext = useQuestionnaireItemContext("Questionnaire.Input");
  const answerId = createUniqueId();
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | null>(null);
  const initialDefaultFilled = untrack(() => hasInputValue(props.defaultValue));
  const controlled = () => props.value !== undefined;
  const defaultFilled = () => hasInputValue(props.defaultValue);
  const controlledFilled = () => hasInputValue(props.value);
  const [uncontrolledFilled, setUncontrolledFilled] = createSignal(initialDefaultFilled);
  const disabled = () => itemContext.disabled || (props.disabled ?? false);
  const filled = () => (controlled() ? controlledFilled() : uncontrolledFilled());
  const selected = () => itemContext.selectedAnswerIds.includes(answerId);

  onMount(() => {
    onCleanup(itemContext.registerAnswerSelection(answerId, initialDefaultFilled));
  });

  createEffect(() => {
    itemContext.setAnswerDefault(answerId, defaultFilled());
  });

  onMount(() => {
    const element = untrack(inputElement);

    // Solid divergence: apply the uncontrolled default value imperatively so
    // the native input keeps owning its text between renders.
    if (element && !untrack(controlled) && props.defaultValue !== undefined) {
      element.value = String(props.defaultValue);
    }
  });

  createEffect(() => {
    const element = inputElement();

    if (!element) {
      return;
    }

    const registration: AnswerControlRegistration = {
      get disabled() {
        return disabled();
      },
      element,
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
    const element = inputElement();

    if (!element) {
      return;
    }

    // Keep the native reset target aligned with the value Questionnaire owns.
    element.defaultValue = controlled()
      ? String(props.value)
      : props.defaultValue !== undefined
        ? String(props.defaultValue)
        : "";
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    props.onInput?.(event);

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

  const setInputRef = (element: HTMLInputElement) => {
    setInputElement(element);
    props.ref?.(element);
  };

  const state: QuestionnaireInputState = {
    get disabled() {
      return disabled();
    },
    get filled() {
      return filled();
    },
    get invalid() {
      return itemContext.invalid;
    },
  };

  return {
    inputProps: {
      get "aria-invalid"() {
        return itemContext.invalid || undefined;
      },
      get "aria-keyshortcuts"() {
        return getAnswerKeyShortcuts(null, !disabled() && filled() && selected());
      },
      get disabled() {
        return disabled();
      },
      // Detach the input from the form while it is not the selected answer so
      // it never submits stale values.
      get form() {
        return selected() ? undefined : "";
      },
      id: answerId,
      get name() {
        return selected() ? itemContext.name : undefined;
      },
      onInput: handleInput,
      ref: setInputRef,
      get type() {
        return props.type ?? "text";
      },
      get value() {
        return controlled() ? String(props.value) : undefined;
      },
    },
    state,
  };
}

export { type CreateQuestionnaireInputParameters, createQuestionnaireInput };
