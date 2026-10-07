import { BottomTabBar } from "@/components/mobile/bottom-tab-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 pb-16 lg:max-w-3xl lg:pb-0">
        {children}
      </main>
      {/* 桌面端侧边栏占位（后续补充） */}
      <BottomTabBar />
    </>
  );
}