/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */

import { RefreshCcw } from "lucide-solid";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/registry/ui/field";
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
      <Field>
        <FieldLabel for="simple">Simple</FieldLabel>
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
      </Field>
    </Example>
  );
}

function InputOTPPattern() {
  return (
    <Example title="Digits Only">
      <Field>
        <FieldLabel for="digits-only">Digits Only</FieldLabel>
        <InputOTP id="digits-only" maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </Field>
    </Example>
  );
}

function InputOTPWithSeparator() {
  const [value, setValue] = createSignal("123456");

  return (
    <Example title="With Separator">
      <Field>
        <FieldLabel for="with-separator">With Separator</FieldLabel>
        <InputOTP id="with-separator" maxLength={6} value={value()} onChange={setValue}>
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
      </Field>
    </Example>
  );
}

function InputOTPAlphanumeric() {
  return (
    <Example title="Alphanumeric">
      <Field>
        <FieldLabel for="alphanumeric">Alphanumeric</FieldLabel>
        <FieldDescription>Accepts both letters and numbers.</FieldDescription>
        <InputOTP id="alphanumeric" maxLength={6}>
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
      </Field>
    </Example>
  );
}

function InputOTPDisabled() {
  return (
    <Example title="Disabled">
      <Field>
        <FieldLabel for="disabled">Disabled</FieldLabel>
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
      </Field>
    </Example>
  );
}

function InputOTPFourDigits() {
  return (
    <Example title="4 Digits">
      <Field>
        <FieldLabel for="four-digits">4 Digits</FieldLabel>
        <FieldDescription>Common pattern for PIN codes.</FieldDescription>
        <InputOTP id="four-digits" maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </Field>
    </Example>
  );
}

function InputOTPInvalid() {
  const [value, setValue] = createSignal("000000");

  return (
    <Example title="Invalid State">
      <Field>
        <FieldLabel for="invalid">Invalid State</FieldLabel>
        <FieldDescription>Example showing the invalid error state.</FieldDescription>
        <InputOTP id="invalid" maxLength={6} value={value()} onChange={setValue}>
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
        <FieldError errors={[{ message: "Invalid code. Please try again." }]} />
      </Field>
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
            <Field>
              <div class="flex items-center justify-between">
                <FieldLabel for="otp-verification">Verification code</FieldLabel>
                <Button variant="outline" size="xs">
                  <RefreshCcw />
                  Resend Code
                </Button>
              </div>
              <InputOTP maxLength={6} id="otp-verification" required>
                <InputOTPGroup class="style-lyra:*:data-[slot=input-otp-slot]:h-12 style-maia:*:data-[slot=input-otp-slot]:h-16 style-mira:*:data-[slot=input-otp-slot]:h-12 style-nova:*:data-[slot=input-otp-slot]:h-12 style-vega:*:data-[slot=input-otp-slot]:h-16 style-lyra:*:data-[slot=input-otp-slot]:w-11 style-maia:*:data-[slot=input-otp-slot]:w-12 style-mira:*:data-[slot=input-otp-slot]:w-11 style-nova:*:data-[slot=input-otp-slot]:w-11 style-vega:*:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup class="style-lyra:*:data-[slot=input-otp-slot]:h-12 style-maia:*:data-[slot=input-otp-slot]:h-16 style-mira:*:data-[slot=input-otp-slot]:h-12 style-nova:*:data-[slot=input-otp-slot]:h-12 style-vega:*:data-[slot=input-otp-slot]:h-16 style-lyra:*:data-[slot=input-otp-slot]:w-11 style-maia:*:data-[slot=input-otp-slot]:w-12 style-mira:*:data-[slot=input-otp-slot]:w-11 style-nova:*:data-[slot=input-otp-slot]:w-11 style-vega:*:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription>
                <a href="#">I no longer have access to this email address.</a>
              </FieldDescription>
            </Field>
          </form>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <Button type="submit" class="w-full">
            Verify
          </Button>
          <div class="text-muted-foreground text-sm">
            Having trouble signing in?{" "}
            <a href="#" class="underline underline-offset-4 transition-colors hover:text-primary">
              Contact support
            </a>
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}
