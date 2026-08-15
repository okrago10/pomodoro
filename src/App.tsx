import { Button } from "@heroui/react";

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-4 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <h1 className="text-xl font-semibold">pomodoro</h1>
      <p className="text-center text-sm">
        Vite + HeroUI React v3 の初期画面です。タイマーはこのあと実装します。
      </p>
      <Button variant="tertiary">HeroUI Button</Button>
    </main>
  );
}
