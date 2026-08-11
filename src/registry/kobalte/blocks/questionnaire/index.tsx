import {
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoiceInput,
  QuestionnaireChoiceLabel,
  QuestionnaireChoiceShortcut,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireRoot,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "./components";
import { useQuestionnaire } from "./context";

const Questionnaire = {
  Root: QuestionnaireRoot,
  Progress: QuestionnaireProgress,
  Item: QuestionnaireItem,
  Title: QuestionnaireTitle,
  Description: QuestionnaireDescription,
  Choices: QuestionnaireChoices,
  Choice: QuestionnaireChoice,
  ChoiceDescription: QuestionnaireChoiceDescription,
  Input: QuestionnaireInput,
  Error: QuestionnaireError,
  Actions: QuestionnaireActions,
  Previous: QuestionnairePrevious,
  Skip: QuestionnaireSkip,
  Next: QuestionnaireNext,
  Submit: QuestionnaireSubmit,
  // Headless choice sub-parts for custom compositions.
  ChoiceInput: QuestionnaireChoiceInput,
  ChoiceLabel: QuestionnaireChoiceLabel,
  ChoiceShortcut: QuestionnaireChoiceShortcut,
};

export type {
  QuestionnaireChoiceDefinition,
  QuestionnaireInputType,
  QuestionnaireItemDefinition,
  QuestionnaireItemStatus,
  QuestionnaireRootState,
  QuestionnaireShortcutMode,
} from "./types";

export { Questionnaire, useQuestionnaire };
