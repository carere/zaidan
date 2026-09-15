import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Input } from "@/registry/kobalte/ui/input";
import { Label } from "@/registry/kobalte/ui/label";

export default function CardDemo() {
  return (
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
        <CardAction>
          <Button variant="link">Sign Up</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form>
          <div class="flex flex-col gap-6">
            <div class="grid gap-2">
              <Label for="card-demo-email">Email</Label>
              <Input id="card-demo-email" type="email" placeholder="m@example.com" required />
            </div>
            <div class="grid gap-2">
              <div class="flex items-center">
                <Label for="card-demo-password">Password</Label>
                <a
                  href="/docs"
                  class="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="card-demo-password" type="password" required />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter class="flex-col gap-2">
        <Button type="submit" class="w-full">
          Login
        </Button>
        <Button variant="outline" class="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
