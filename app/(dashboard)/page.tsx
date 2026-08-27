import { createClient } from "@/lib/supabase/server";
import { Desktop } from "@/components/os/Desktop";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Desktop
      email={user?.email ?? null}
      avatarUrl={(user?.user_metadata?.avatar_url as string | undefined) ?? null}
    />
  );
}
