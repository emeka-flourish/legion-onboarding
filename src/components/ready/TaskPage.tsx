"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { StepLayout } from "@/components/layout/StepLayout";
import { HelpBar } from "@/components/safety/SafetyPanel";

/** A visit-prep step: back to home, and the 988 line kept in view on clinical screens. */
export function TaskPage({
  title,
  subtitle,
  aside,
  help,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  help?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <StepLayout title={title} subtitle={subtitle} onBack={() => router.push("/home")} backLabel="Home" aside={aside}>
      {children}
      {help && <HelpBar />}
    </StepLayout>
  );
}
