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
  ChoiceInput: QuestionnaireChoiceInput,
  ChoiceLabel: QuestionnaireChoiceLabel,
  ChoiceShortcut: QuestionnaireChoiceShortcut,
  Input: QuestionnaireInput,
  Error: QuestionnaireError,
  Previous: QuestionnairePrevious,
  Skip: QuestionnaireSkip,
  Next: QuestionnaireNext,
  Submit: QuestionnaireSubmit,
  // Zaidan additions over the upstream API.
  Actions: QuestionnaireActions,
  ChoiceDescription: QuestionnaireChoiceDescription,
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
