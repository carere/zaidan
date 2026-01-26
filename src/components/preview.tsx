import { PreviewBadgeNav } from "@/components/preview-badge-nav";

export function Preview({ slug }: { slug: string }) {
  let iframeRef: HTMLIFrameElement | undefined;

  return (
    <div class="relative -mx-1 flex flex-1 flex-col justify-center sm:mx-0">
      <div class="relative z-0 mx-auto flex 3xl:max-h-[1200px] w-full 3xl:max-w-[1800px] flex-1 flex-col overflow-hidden rounded-2xl ring-1 ring-foreground/15">
        <iframe
          ref={iframeRef}
          src={`/preview/kobalte/${slug}`}
          class="z-10 size-full rounded-lg"
          title="Preview"
        />
        <PreviewBadgeNav slug={slug} class="absolute right-2 bottom-2" />
      </div>
    </div>
  );
}
