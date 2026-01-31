import { HydrateClient } from "@/trpc/server";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrateClient>
      <div className="h-dvh overflow-hidden p-12">{children}</div>
    </HydrateClient>
  );
}
