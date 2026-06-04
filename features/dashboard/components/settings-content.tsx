"use client";

import type { UserMenuUser } from "@/components/user/user-menu";
import { statusBadge, statusButtonClass } from "@/features/dashboard/lib/status-styles";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MOCK_USER: UserMenuUser = {
  name: "Alex Chen",
  email: "alex@acme.dev",
  image: null,
};

export function SettingsContent() {
  const user = MOCK_USER;
  const displayName = user.name ?? "User";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-1 flex-col p-6">
      <Tabs defaultValue="profile" className="w-full max-w-2xl">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Basic account information from your sign-in provider.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" defaultValue={user.name ?? ""} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email ?? ""}
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled className={statusButtonClass.success}>
                Save changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6 space-y-6">
          <Card className="border-green-500/25">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your plan and billing for AI code reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-none border border-green-500/30 bg-green-500/5 p-4">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    Pro plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status:{" "}
                    <span className="text-green-700 dark:text-green-400">
                      active
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Renews July 4, 2026
                  </p>
                </div>
                <span className={statusBadge("success")}>Pro</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>Unlimited AI reviews on connected repos</li>
                <li>Public and private repository support</li>
                <li>Priority support on Pro and Team plans</li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className={cn(statusButtonClass.success, "border-green-500/50")}
              >
                Manage billing
              </Button>
              <Button variant="ghost">Change plan</Button>
              <Button
                variant="outline"
                className={statusButtonClass.danger}
              >
                Cancel subscription
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
