import { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "@corvu/otp-field";
import { createSignal } from "solid-js";

import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/registry/ui/input-otp";

export default function InputOTPExample() {
  return (
    <ExampleWrapper>
      <InputOTPForm />
      <InputOTPSimple />
      <InputOTPPattern />
      <InputOTPWithSeparator />
      <InputOTPAlphanumeric />
      <InputOTPDisabled />
      <InputOTPFourDigits />
      <InputOTPInvalid />
    </ExampleWrapper>
  );
}

function InputOTPSimple() {
  return (
    <Example title="Simple">
      <div class="flex flex-col gap-2">
        <label for="simple" class="font-medium text-sm">
          Simple
        </label>
        <InputOTP id="simple" maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPPattern() {
  return (
    <Example title="Digits Only">
      <div class="flex flex-col gap-2">
        <label for="digits-only" class="font-medium text-sm">
          Digits Only
        </label>
        <InputOTP id="digits-only" maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPWithSeparator() {
  const [value, setValue] = createSignal("123456");

  return (
    <Example title="With Separator">
      <div class="flex flex-col gap-2">
        <label for="with-separator" class="font-medium text-sm">
          With Separator
        </label>
        <InputOTP id="with-separator" maxLength={6} value={value()} onValueChange={setValue}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPAlphanumeric() {
  return (
    <Example title="Alphanumeric">
      <div class="flex flex-col gap-2">
        <label for="alphanumeric" class="font-medium text-sm">
          Alphanumeric
        </label>
        <p class="text-muted-foreground text-sm">Accepts both letters and numbers.</p>
        <InputOTP id="alphanumeric" maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPDisabled() {
  return (
    <Example title="Disabled">
      <div class="flex flex-col gap-2">
        <label for="disabled" class="font-medium text-sm">
          Disabled
        </label>
        <InputOTP id="disabled" maxLength={6} disabled value="123456">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPFourDigits() {
  return (
    <Example title="4 Digits">
      <div class="flex flex-col gap-2">
        <label for="four-digits" class="font-medium text-sm">
          4 Digits
        </label>
        <p class="text-muted-foreground text-sm">Common pattern for PIN codes.</p>
        <InputOTP id="four-digits" maxLength={4} pattern={REGEXP_ONLY_DIGITS}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </Example>
  );
}

function InputOTPInvalid() {
  const [value, setValue] = createSignal("000000");

  return (
    <Example title="Invalid State">
      <div class="flex flex-col gap-2">
        <label for="invalid" class="font-medium text-sm">
          Invalid State
        </label>
        <p class="text-muted-foreground text-sm">Example showing the invalid error state.</p>
        <InputOTP id="invalid" maxLength={6} value={value()} onValueChange={setValue}>
          <InputOTPGroup>
            <InputOTPSlot index={0} aria-invalid />
            <InputOTPSlot index={1} aria-invalid />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={2} aria-invalid />
            <InputOTPSlot index={3} aria-invalid />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={4} aria-invalid />
            <InputOTPSlot index={5} aria-invalid />
          </InputOTPGroup>
        </InputOTP>
        <p class="text-destructive text-sm">Invalid code. Please try again.</p>
      </div>
    </Example>
  );
}

function InputOTPForm() {
  return (
    <Example title="Form">
      <Card class="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Verify your login</CardTitle>
          <CardDescription>
            Enter the verification code we sent to your email address:{" "}
            <span class="font-medium">m@example.com</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label for="otp-verification" class="font-medium text-sm">
                  Verification code
                </label>
                <Button variant="outline" size="xs">
                  Resend Code
                </Button>
              </div>
              <InputOTP maxLength={6} id="otp-verification">
                <InputOTPGroup class="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup class="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <p class="text-muted-foreground text-sm">
                <button
                  type="button"
                  class="underline underline-offset-4 transition-colors hover:text-primary"
                >
                  I no longer have access to this email address.
                </button>
              </p>
            </div>
          </form>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <Button type="submit" class="w-full">
            Verify
          </Button>
          <div class="text-muted-foreground text-sm">
            Having trouble signing in?{" "}
            <button
              type="button"
              class="underline underline-offset-4 transition-colors hover:text-primary"
            >
              Contact support
            </button>
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}
