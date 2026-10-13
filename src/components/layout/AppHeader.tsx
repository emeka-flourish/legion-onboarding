"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useJourney } from "@/components/journey/JourneyProvider";

/** Legion's header: a text wordmark (not Legion's logo file) and the patient's initial once known. */
export function AppHeader() {
  const { state } = useJourney();
  const name = state?.journey.person?.firstName ?? state?.journey.pendingPerson?.firstName;
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="Legion Health, home">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-[#3F71FA] to-[#70D8FA]">
            <Heart className="size-4 fill-white text-white" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-[#313F4D]">Legion Health</span>
        </Link>
        <span
          aria-label={name ? `Signed in as ${name}` : "Not signed in"}
          className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700"
        >
          {name ? name[0].toUpperCase() : "A"}
        </span>
      </div>
    </header>
  );
}
