"use client";

import { UserMenu, type UserMenuUser } from "@/components/user/user-menu";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

type SidebarUserButtonProps = {
  user: UserMenuUser;
  plan?: string;
};

export function SidebarUserButton({ user, plan }: SidebarUserButtonProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserMenu
          user={user}
          plan={plan}
          variant="profile"
          className="w-full [&_button]:h-12 [&_button]:w-full [&_button]:justify-start [&_button]:gap-2 [&_button]:px-2"
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
