import { redirect } from "next/navigation";

export default async function HojaEntregaAliasPage({
  params,
}: {
  params: Promise<{ ci: string }>;
}) {
  const { ci } = await params;
  redirect(`/ficha/${encodeURIComponent(ci)}`);
}
