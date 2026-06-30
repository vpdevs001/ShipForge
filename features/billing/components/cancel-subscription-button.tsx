"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { statusButtonClass } from "@/features/dashboard/lib/status-style";

type CancelSubscriptionButtonProps = {
  disabled?: boolean;
};

export function CancelSubscriptionButton({
  disabled = false,
}: CancelSubscriptionButtonProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [loading, setLoading] = useState(false);
  const cancelSub = useMutation(trpc.billing.cancelSubscription.mutationOptions());

  async function handleCancel() {
    setLoading(true);

    try {
      await cancelSub.mutateAsync();
      toast.success(
        "Subscription canceled. Pro access continues until renewal date."
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not cancel subscription.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleCancel}
      disabled={disabled || loading}
      className={statusButtonClass.danger}
    >
      {loading ? "Canceling…" : "Cancel subscription"}
    </Button>
  );
}
