import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { useQuestionnaireItemContext } from "./context";
import type {
  AnswerControlRegistration,
  QuestionnaireChoiceContextValue,
  QuestionnaireChoiceProps,
  QuestionnaireChoiceState,
} from "./types";
import { getAnswerKeyShortcuts } from "./utils";

type CreateQuestionnaireChoiceParameters = Pick<
  QuestionnaireChoiceProps,
  "checked" | "defaultChecked" | "disabled" | "onChange" | "value"
>;

function createQuestionnaireChoice(
  props: CreateQuestionnaireChoiceParameters,
): QuestionnaireChoiceContextValue {
  const itemContext = useQuestionnaireItemContext("Questionnaire.Choice");
  const answerId = createUniqueId();
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | null>(null);
  const initialDefaultChecked = untrack(() => props.defaultChecked ?? false);
  const controlled = () => props.checked !== undefined;
  const choiceDisabled = () => props.disabled ?? false;
  const disabled = () => itemContext.disabled || choiceDisabled();
  const selected = () => itemContext.selectedAnswerIds.includes(answerId);
  const checked = createMemo(() =>
    controlled() ? (itemContext.status === "skipped" ? false : Boolean(props.checked)) : selected(),
  );
  const type = () => (itemContext.multiple ? "checkbox" : "radio");
  const shortcut = createMemo(
    () =>
      itemContext.shortcutByChoiceValue?.get(props.value) ??
      itemContext.shortcutByAnswerId.get(answerId) ??
      null,
  );

  onMount(() => {
    onCleanup(itemContext.registerAnswerSelection(answerId, initialDefaultChecked));
  });

  createEffect(() => {
    itemContext.setAnswerDefault(answerId, props.defaultChecked ?? false);
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
      get ownDisabled() {
        return choiceDisabled();
      },
      type: "choice",
      get value() {
        return props.value;
      },
    };

    onCleanup(itemContext.registerAnswerControl(registration));
  });

  createEffect(() => {
    if (controlled()) {
      itemContext.resetVersion;
      itemContext.syncControlledAnswerSelection(answerId, Boolean(props.checked));
    }
  });

  createEffect(() => {
    const element = inputElement();

    if (!element) {
      return;
    }

    // Keep the native reset target aligned with Questionnaire's owned default,
    // including controlled choices whose checked prop remains authoritative.
    element.defaultChecked = controlled()
      ? Boolean(props.checked)
      : (props.defaultChecked ?? false);

    if (itemContext.resetVersion > 0) {
      element.checked = checked();
    }
  });

  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!controlled()) {
      itemContext.setAnswerSelectionFromInteraction(answerId, event.currentTarget.checked);
      return;
    }

    if (itemContext.status === "skipped" && props.checked === event.currentTarget.checked) {
      itemContext.setAnswerSelectionFromInteraction(answerId, Boolean(props.checked));
    }
  };

  const state: QuestionnaireChoiceState = {
    get checked() {
      return checked();
    },
    get disabled() {
      return disabled();
    },
    get invalid() {
      return itemContext.invalid;
    },
    get shortcut() {
      return shortcut();
    },
    get type() {
      return type();
    },
  };

  return {
    inputProps: {
      get "aria-invalid"() {
        return itemContext.invalid || undefined;
      },
      get "aria-keyshortcuts"() {
        return getAnswerKeyShortcuts(shortcut(), !disabled() && checked());
      },
      get checked() {
        return checked();
      },
      get disabled() {
        return disabled();
      },
      id: answerId,
      get name() {
        return itemContext.status === "skipped" ? undefined : itemContext.name;
      },
      onChange: handleChange,
      ref: setInputElement,
      get required() {
        return itemContext.required && !itemContext.multiple && !itemContext.hasInputAnswer;
      },
      get type() {
        return type();
      },
      get value() {
        return props.value;
      },
    },
    state,
  };
}

export { type CreateQuestionnaireChoiceParameters, createQuestionnaireChoice };
