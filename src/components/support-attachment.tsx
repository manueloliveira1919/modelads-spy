import { useQuery } from "@tanstack/react-query";
import { signedUrl } from "@/lib/support";

export function SupportAttachment({ path }: { path: string | null }) {
  const { data } = useQuery({
    queryKey: ["support", "attachment", path],
    queryFn: () => signedUrl(path),
    enabled: !!path,
    staleTime: 1000 * 60 * 20,
  });

  if (!path) return null;
  if (!data) {
    return (
      <div className="mt-2 h-32 w-48 animate-pulse rounded-lg border border-border bg-muted/40" />
    );
  }

  return (
    <a href={data} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
      <img
        src={data}
        alt="Imagem anexada ao chamado"
        loading="lazy"
        className="max-h-48 rounded-lg border border-border object-cover"
      />
    </a>
  );
}
