"use client";

import type { ReactNode } from "react";
import { LoadingBlock } from "@/components/ui/Status";
import type { Stage } from "@/domain/types";
import { useJourney, useStageGuard, type JourneyState } from "./JourneyProvider";

/** Renders a stage's screen once the journey is loaded and at that stage; otherwise a calm loading state. */
export function StageScreen({ stages, children }: { stages: Stage[]; children: (state: JourneyState) => ReactNode }) {
  const status = useStageGuard(stages);
  const { state } = useJourney();
  if (status !== "ok" || !state) {
    return (
      <main id="main" className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-xl">
          <LoadingBlock />
        </div>
      </main>
    );
  }
  return <>{children(state)}</>;
}
