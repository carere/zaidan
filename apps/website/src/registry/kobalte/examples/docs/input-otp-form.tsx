/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { RefreshCwIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/registry/kobalte/ui/input-otp";

export default function InputOTPForm() {
  return (
    <Card class="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Verify your login</CardTitle>
        <CardDescription>
          Enter the verification code we sent to your email address:{" "}
          <span class="font-medium">m@example.com</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <div class="flex items-center justify-between">
            <FieldLabel for="otp-verification">Verification code</FieldLabel>
            <Button variant="outline" size="xs">
              <RefreshCwIcon data-icon="inline-start" />
              Resend Code
            </Button>
          </div>
          <InputOTP maxLength={6} id="otp-verification" required>
            <InputOTPGroup class="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator class="mx-2" />
            <InputOTPGroup class="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription>
            <a href="#">I no longer have access to this email address.</a>
          </FieldDescription>
        </Field>
      </CardContent>
      <CardFooter>
        <Field>
          <Button type="submit" class="w-full">
            Verify
          </Button>
          <div class="text-muted-foreground text-sm">
            Having trouble signing in?{" "}
            <a href="#" class="underline underline-offset-4 transition-colors hover:text-primary">
              Contact support
            </a>
          </div>
        </Field>
      </CardFooter>
    </Card>
  );
}
