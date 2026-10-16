"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TestTakingUI } from "@/components/test/test-taking-ui";

export default function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950">
      <TestTakingUI
        testId={id}
        onExit={() => {
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
