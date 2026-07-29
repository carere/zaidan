import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/lib/config";
import {
  CREATE_PREVIEW_CHANNEL,
  CREATE_PREVIEW_PROTOCOL_VERSION,
  createPresetSyncMessage,
  isCurrentPresetAcknowledgement,
  parsePreviewMessage,
} from "@/lib/preset-protocol";
import { encodePresetToken } from "@/lib/preset-token";

describe("Create Preview message protocol", () => {
  const token = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });

  it("validates ready, sync, and applied messages including revisions and payload", () => {
    expect(
      parsePreviewMessage({
        channel: CREATE_PREVIEW_CHANNEL,
        protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
        type: "preview-ready",
      }),
    ).toMatchObject({ type: "preview-ready" });
    expect(parsePreviewMessage(createPresetSyncMessage(3, token, "dark"))).toMatchObject({
      type: "preset-sync",
      revision: 3,
      token,
      colorMode: "dark",
    });
    expect(
      parsePreviewMessage({
        channel: CREATE_PREVIEW_CHANNEL,
        protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
        type: "preset-applied",
        revision: 3,
        token,
      }),
    ).toMatchObject({ type: "preset-applied", revision: 3 });
  });

  it.each([
    null,
    {},
    { channel: "wrong", protocolVersion: 1, type: "preview-ready" },
    { channel: CREATE_PREVIEW_CHANNEL, protocolVersion: 2, type: "preview-ready" },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: -1,
      token: null,
      colorMode: "light",
    },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: 1,
      token: "v2-0",
      colorMode: "light",
    },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: 1,
      token: null,
      colorMode: "system",
    },
  ])("rejects malformed message payloads %#", (message) => {
    expect(parsePreviewMessage(message)).toBeNull();
  });

  it("re-sends the latest snapshot after readiness and ignores stale acknowledgements", () => {
    const latest = createPresetSyncMessage(4, token, "dark");
    expect(
      isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied", revision: 3 }, latest),
    ).toBe(false);
    expect(
      isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied", token: null }, latest),
    ).toBe(false);
    expect(isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied" }, latest)).toBe(
      true,
    );
  });
});
