import { createContext, useContext } from "solid-js";
import type {
  QuestionnaireChoiceContextValue,
  QuestionnaireContextValue,
  QuestionnaireItemContextValue,
} from "./types";

const QuestionnaireChoiceContext = createContext<QuestionnaireChoiceContextValue | null>(null);
const QuestionnaireContext = createContext<QuestionnaireContextValue | null>(null);
const QuestionnaireItemContext = createContext<QuestionnaireItemContextValue | null>(null);

function useQuestionnaireContext(component: string) {
  const context = useContext(QuestionnaireContext);

  if (!context) {
    throw new Error(`${component} must be used within a Questionnaire.Root component.`);
  }

  return context;
}

function useQuestionnaireChoiceContext(component: string) {
  const context = useContext(QuestionnaireChoiceContext);

  if (!context) {
    throw new Error(`${component} must be used within a Questionnaire.Choice component.`);
  }

  return context;
}

function useQuestionnaireItemContext(component: string) {
  const context = useContext(QuestionnaireItemContext);

  if (!context) {
    throw new Error(`${component} must be used within a Questionnaire.Item component.`);
  }

  return context;
}

/**
 * Public accessor for the questionnaire root state (`current`, `total`,
 * `first`, `last`, `activeItemStatus`, ...) for custom composition.
 * Zaidan addition over the upstream API.
 */
function useQuestionnaire() {
  return useQuestionnaireContext("useQuestionnaire");
}

export {
  QuestionnaireChoiceContext,
  QuestionnaireContext,
  QuestionnaireItemContext,
  useQuestionnaire,
  useQuestionnaireChoiceContext,
  useQuestionnaireContext,
  useQuestionnaireItemContext,
};
