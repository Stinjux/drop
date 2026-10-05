"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// Fonctionnalités d'animation chargées après le rendu initial (JavaScript initial plus léger).
const loadFeatures = () => import("framer-motion").then((mod) => mod.domAnimation);

/** Framer Motion en version allégée ; respecte « réduire les animations » du système. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
