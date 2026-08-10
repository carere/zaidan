import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  findTypesetFont,
  TYPESET_COMMAND_MESSAGE,
  TYPESET_DEFAULTS,
  TYPESET_MEASURES,
  TYPESET_PARAMS_MESSAGE,
  type TypesetItem,
  type TypesetParams,
  typesetPreviewVars,
  validateTypesetSearch,
} from "@/lib/typeset";
import { CHAT_QUESTION, TYPESET_FIXTURES } from "@/lib/typeset-fixtures";

const DEFAULT_FONT = findTypesetFont(TYPESET_DEFAULTS.body)?.value;
const DEFAULT_MONO = findTypesetFont(TYPESET_DEFAULTS.mono)?.value;
const DEFAULT_MEASURE = TYPESET_MEASURES.find(
  (option) => option.value === TYPESET_DEFAULTS.measure,
)?.width;

/**
 * Maps the `--preview-*` vars the host sets onto the real `--typeset-*` knobs.
 * Scoped to `.preview-params` so the fallbacks below apply before the first
 * postMessage lands.
 */
const PARAMS_STYLE = `.preview-params .typeset {
  --typeset-leading: var(--preview-leading, ${TYPESET_DEFAULTS.leading});
  --typeset-flow: var(--preview-flow, ${TYPESET_DEFAULTS.flow});
}`;

export const Route = createFileRoute("/preview/typeset/$item")({
  ssr: false,
  validateSearch: validateTypesetSearch,
  component: TypesetFixturePreview,
});

function TypesetFixturePreview() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const [override, setOverride] = createSignal<TypesetParams | null>(null);
  const [isReady, setIsReady] = createSignal(false);

  const item = () => {
    const name = params().item;
    return (name in TYPESET_FIXTURES ? name : "docs") as TypesetItem;
  };
  const current = (): TypesetParams => override() ?? search();

  onMount(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === TYPESET_PARAMS_MESSAGE && event.data.data) {
        setOverride(validateTypesetSearch(event.data.data));
      }
    };

    // The iframe owns focus, so its shortcuts have to be forwarded to the host
    // as typed commands. r shuffles, Shift+R resets, D toggles the theme,
    // Cmd/Ctrl+Z and Shift+Z (or Ctrl+Y) drive history.
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        (target instanceof HTMLElement && target.isContentEditable) ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      let command: string | null = null;

      if (event.metaKey || event.ctrlKey) {
        if ((key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey)) {
          command = "redo";
        } else if (key === "z") {
          command = "undo";
        }
      } else if (!event.altKey) {
        if (key === "r") {
          command = event.shiftKey ? "reset" : "shuffle";
        } else if (key === "d") {
          command = "toggle-theme";
        }
      }

      if (!command) return;
      event.preventDefault();
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: TYPESET_COMMAND_MESSAGE, command },
          window.location.origin,
        );
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  // Apply the vars before the gate below reveals content, so the preview never
  // flashes unstyled.
  createEffect(() => {
    const style = document.documentElement.style;
    for (const [name, value] of Object.entries(typesetPreviewVars(current()))) {
      if (value) {
        style.setProperty(name, value);
      } else {
        style.removeProperty(name);
      }
    }
    setIsReady(true);
  });

  return (
    <Show when={isReady()}>
      <style innerHTML={PARAMS_STYLE} />
      <div
        class="flex min-h-svh justify-center px-6 pt-8 pb-24 md:pt-24 md:pb-32"
        style={{
          "font-family": `var(--preview-font, ${DEFAULT_FONT})`,
          "--font-heading": `var(--preview-font-heading, ${DEFAULT_FONT})`,
          "--font-mono": `var(--preview-font-mono, ${DEFAULT_MONO})`,
        }}
      >
        <div
          class="preview-params w-full"
          style={{
            "font-size": `var(--preview-size, ${TYPESET_DEFAULTS.scale}px)`,
            "max-width": `var(--preview-measure, ${DEFAULT_MEASURE})`,
          }}
        >
          <Show
            when={item() === "chat"}
            fallback={<div class="typeset w-full" innerHTML={TYPESET_FIXTURES[item()]} />}
          >
            <div class="flex w-full flex-col gap-10">
              <div class="ml-auto w-fit max-w-[65%] rounded-3xl bg-muted px-4 py-2.5">
                {CHAT_QUESTION}
              </div>
              <div class="typeset w-full" innerHTML={TYPESET_FIXTURES.chat} />
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
