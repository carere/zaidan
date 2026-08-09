import type { ComponentProps, JSX } from "solid-js";
import type { ButtonProps } from "@/registry/kobalte/ui/button";

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

type QuestionnaireRootProps = Omit<
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

type QuestionnaireProgressState = QuestionnaireRootState;

type QuestionnaireProgressProps = Omit<ComponentProps<"div">, "children"> & {
  children?: JSX.Element | ((state: QuestionnaireProgressState) => JSX.Element);
};

type QuestionnaireItemState = {
  active: boolean;
  disabled: boolean;
  invalid: boolean;
  multiple: boolean;
  required: boolean;
  status: QuestionnaireItemStatus;
};

type QuestionnaireItemProps = Omit<ComponentProps<"fieldset">, "name" | "ref"> & {
  invalid?: boolean;
  multiple?: boolean;
  name: string;
  onStatusChange?: (status: QuestionnaireItemStatus) => void;
  ref?: (element: HTMLFieldSetElement) => void;
  required?: boolean;
};

type QuestionnaireTitleProps = ComponentProps<"legend">;
type QuestionnaireDescriptionProps = ComponentProps<"p">;

type QuestionnaireChoicesState = {
  shortcuts: QuestionnaireShortcutMode | null;
};

type QuestionnaireChoicesProps = ComponentProps<"div">;
type QuestionnaireErrorProps = ComponentProps<"p">;

type QuestionnaireChoiceState = {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly shortcut: string | null;
  readonly type: "checkbox" | "radio";
};

type QuestionnaireChoiceContextValue = {
  inputProps: Omit<ComponentProps<"input">, "ref"> & {
    ref: (element: HTMLInputElement) => void;
  };
  state: QuestionnaireChoiceState;
};

type QuestionnaireChoiceProps = Omit<ComponentProps<"label">, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: JSX.EventHandler<HTMLInputElement, Event>;
  value: string;
};

type QuestionnaireChoiceInputProps = Omit<
  ComponentProps<"input">,
  | "checked"
  | "defaultChecked"
  | "disabled"
  | "name"
  | "onChange"
  | "ref"
  | "required"
  | "type"
  | "value"
> & {
  ref?: (element: HTMLInputElement) => void;
};

type QuestionnaireChoiceLabelProps = ComponentProps<"span">;

type QuestionnaireChoiceShortcutState = Pick<QuestionnaireChoiceState, "shortcut">;

type QuestionnaireChoiceShortcutProps = ComponentProps<"span">;

type QuestionnaireInputState = {
  disabled: boolean;
  filled: boolean;
  invalid: boolean;
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

type QuestionnaireInputProps = Omit<
  ComponentProps<"input">,
  "form" | "name" | "onChange" | "onInput" | "ref" | "type"
> & {
  defaultValue?: string | number;
  onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
  ref?: (element: HTMLInputElement) => void;
  type?: QuestionnaireInputType;
};

type QuestionnaireNavigationState = {
  disabled: boolean;
  shortcut: "Enter" | null;
  status: QuestionnaireItemStatus | null;
  visible: boolean;
};

type QuestionnaireNavigationProps = ComponentProps<"button"> &
  Pick<ButtonProps, "size" | "variant">;

type QuestionnairePreviousProps = QuestionnaireNavigationProps;
type QuestionnaireSkipProps = QuestionnaireNavigationProps;
type QuestionnaireNextProps = QuestionnaireNavigationProps;
type QuestionnaireSubmitProps = QuestionnaireNavigationProps;

type QuestionnaireActionsProps = ComponentProps<"div">;
type QuestionnaireChoiceDescriptionProps = ComponentProps<"span">;

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

export type {
  AnswerControlRegistration,
  ChoiceRegistration,
  ItemRegistration,
  PendingFocus,
  QuestionnaireActionsProps,
  QuestionnaireChoiceContextValue,
  QuestionnaireChoiceDefinition,
  QuestionnaireChoiceDescriptionProps,
  QuestionnaireChoiceInputProps,
  QuestionnaireChoiceLabelProps,
  QuestionnaireChoiceProps,
  QuestionnaireChoiceShortcutProps,
  QuestionnaireChoiceShortcutState,
  QuestionnaireChoiceState,
  QuestionnaireChoicesProps,
  QuestionnaireChoicesState,
  QuestionnaireContextValue,
  QuestionnaireDescriptionProps,
  QuestionnaireErrorProps,
  QuestionnaireInputProps,
  QuestionnaireInputState,
  QuestionnaireInputType,
  QuestionnaireItemContextValue,
  QuestionnaireItemDefinition,
  QuestionnaireItemProps,
  QuestionnaireItemState,
  QuestionnaireItemStatus,
  QuestionnaireNavigationProps,
  QuestionnaireNavigationState,
  QuestionnaireNextProps,
  QuestionnairePreviousProps,
  QuestionnaireProgressProps,
  QuestionnaireProgressState,
  QuestionnaireRootProps,
  QuestionnaireRootState,
  QuestionnaireShortcutMode,
  QuestionnaireSkipProps,
  QuestionnaireSubmitProps,
  QuestionnaireTitleProps,
};
