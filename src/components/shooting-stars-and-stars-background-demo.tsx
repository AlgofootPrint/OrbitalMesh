"use client";
import React from "react";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
export default function ShootingStarsAndStarsBackgroundDemo() {
  return (
    <div className="relative flex h-[40rem] w-full items-center justify-center overflow-hidden border border-border bg-background">
      <h2 className="relative z-10 text-center text-2xl font-medium text-foreground md:text-4xl">
        Shooting stars background
      </h2>
      <ShootingStars minDelay={9000} maxDelay={18000} starColor="#D7A13B" trailColor="#A0A0AB" />
      <StarsBackground starDensity={0.00008} allStarsTwinkle={false} />
    </div>
  );
}
