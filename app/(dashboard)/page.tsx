import { createClient } from "@/lib/supabase/server";
import { Desktop } from "@/components/os/Desktop";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = user
    ? await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
    : { count: 0 };

  return (
    <Desktop
      email={user?.email ?? null}
      avatarUrl={(user?.user_metadata?.avatar_url as string | undefined) ?? null}
      isNewAccount={!count}
    />
  );
}
