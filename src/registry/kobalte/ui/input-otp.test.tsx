import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(" "),
}));

import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";

describe("Input OTP server rendering", () => {
  it("uses the pinned light and dark no-script fallback", () => {
    const html = renderToString(() => (
      <InputOTP maxLength={1}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    ));

    expect(html).toContain("[data-corvu-otp-field-input]");
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("--nojs-bg: black !important");
  });
});
