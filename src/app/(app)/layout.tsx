import { AppNav } from "@/components/AppNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <AppNav />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-10 md:pt-10 md:pb-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
