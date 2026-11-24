import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { ownProject } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import ProjectView from "@/components/ProjectView";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const project = await ownProject(id, user.id);
  if (!project) notFound();
  const { t } = await getDict();
  return <ProjectView id={id} title={project.title} t={t} />;
}
