"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagicLink, setLoadingMagicLink] = useState(false);
  const [sent, setSent] = useState(false);

  const [pwEmail, setPwEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingSignUp, setLoadingSignUp] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL;

  async function signInWithGoogle() {
    setLoadingGoogle(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      toast.error(
        error.message.includes("provider is not enabled")
          ? "Google sign-in isn't configured on this project yet — use email below instead."
          : error.message
      );
      setLoadingGoogle(false);
    }
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingMagicLink(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setLoadingMagicLink(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwEmail.trim() || !password) return;
    setLoadingSignIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: pwEmail,
      password,
    });
    setLoadingSignIn(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signUpWithPassword() {
    if (!pwEmail.trim() || !password) {
      toast.error("Enter an email and password first");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoadingSignUp(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: pwEmail,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setLoadingSignUp(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setAwaitingConfirmation(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Sign in to LockIn</CardTitle>
          <CardDescription>
            Start a timer, tag what you&apos;re doing, watch the evidence pile up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
            disabled={loadingGoogle}
          >
            {loadingGoogle && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Tabs defaultValue="password">
            <TabsList className="w-full">
              <TabsTrigger value="password" className="flex-1">
                Password
              </TabsTrigger>
              <TabsTrigger value="magic-link" className="flex-1">
                Magic link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="pt-3">
              {awaitingConfirmation ? (
                <p className="text-center text-sm text-muted-foreground">
                  Check <span className="text-foreground">{pwEmail}</span> for a
                  confirmation link, then come back and sign in.
                </p>
              ) : (
                <form onSubmit={signInWithPassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-email">Email</Label>
                    <Input
                      id="pw-email"
                      type="email"
                      placeholder="you@example.com"
                      value={pwEmail}
                      onChange={(e) => setPwEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={loadingSignIn || loadingSignUp}
                    >
                      {loadingSignIn && <Loader2 className="h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={loadingSignIn || loadingSignUp}
                      onClick={signUpWithPassword}
                    >
                      {loadingSignUp && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="magic-link" className="pt-3">
              {sent ? (
                <p className="text-center text-sm text-muted-foreground">
                  Check <span className="text-foreground">{email}</span> for a sign-in
                  link.
                </p>
              ) : (
                <form onSubmit={signInWithMagicLink} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingMagicLink}>
                    {loadingMagicLink && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send magic link
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
