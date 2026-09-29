"use client";

import "./hero-31.css";
import { SectionHero } from "@/components/originkit/ui/hero-31/section-hero";
import type { HeroStudy } from "@/components/originkit/ui/hero-31/process-canvas";

const Hero31 = ({ study }: { study: HeroStudy | null }) => <SectionHero study={study} />;

export default Hero31;
