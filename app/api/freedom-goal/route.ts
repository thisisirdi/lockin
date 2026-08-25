import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: goal, error: goalError } = await supabase
    .from("freedom_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goalError) return NextResponse.json({ error: goalError.message }, { status: 500 });
  if (!goal) return NextResponse.json({ goal: null, project: null, categories: [] });

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("freedom_goal_id", goal.id)
    .limit(1)
    .maybeSingle();

  let categories: string[] = [];
  if (project) {
    const { data: links } = await supabase
      .from("project_categories")
      .select("category_id")
      .eq("project_id", project.id);
    categories = (links ?? []).map((l) => l.category_id);
  }

  return NextResponse.json({ goal, project, categories });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { monthlyRevenueGoal, currency, projectName, projectUrl, categoryIds } =
    await request.json();

  if (!monthlyRevenueGoal || !projectName) {
    return NextResponse.json(
      { error: "monthlyRevenueGoal and projectName are required" },
      { status: 400 }
    );
  }

  const { data: goal, error: goalError } = await supabase
    .from("freedom_goals")
    .insert({
      user_id: user.id,
      monthly_revenue_goal: monthlyRevenueGoal,
      currency: currency ?? "USD",
    })
    .select()
    .single();

  if (goalError) return NextResponse.json({ error: goalError.message }, { status: 500 });

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: projectName,
      url: projectUrl ?? null,
      freedom_goal_id: goal.id,
    })
    .select()
    .single();

  if (projectError)
    return NextResponse.json({ error: projectError.message }, { status: 500 });

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    await supabase.from("project_categories").insert(
      categoryIds.map((categoryId: string) => ({
        project_id: project.id,
        category_id: categoryId,
      }))
    );
  }

  return NextResponse.json({ goal, project }, { status: 201 });
}
