"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="secondary" onClick={handleSignOut} loading={loading}>
      Sign out
    </Button>
  );
}
