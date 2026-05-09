import { notFound, redirect } from "next/navigation";

export const revalidate = 0;
export const metadata = {
  title: "Hoja de Entrega",
};

export default async function HojaEntregaPage({
  params,
}: {
  params: Promise<{ ci: string }>;
}) {
  const { ci } = await params;
  const ciValue = decodeURIComponent(ci).trim();

  if (!ciValue) {
    notFound();
  }

  redirect(`/api/hoja-de-entrega/${encodeURIComponent(ciValue)}/pdf?inline=1`);
}
