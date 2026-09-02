"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Award,
  Headphones,
  MapPin,
  Mail,
  Phone,
  Clock,
  Palette,
  Ruler,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  CheckCircle2,
  Package,
  Scissors,
  HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EXPLORE_COLLECTIONS_HREF } from "@/lib/navigation/explore-collections";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: "easeOut" as const }
};

const WHY_CHOOSE = [
  { icon: Award, title: "Premium Quality", text: "Fine fabrics and meticulous finishing in every blouse." },
  { icon: Shirt, title: "Ready to Wear", text: "Beautifully tailored pieces — no waiting, no tailoring hassle." },
  { icon: Ruler, title: "AI Size Guidance", text: "Smart fit tools help you choose with confidence." },
  { icon: ShieldCheck, title: "Secure Payments", text: "Safe checkout with trusted payment partners." },
  { icon: Truck, title: "Fast Shipping", text: "Carefully packed orders delivered across India." },
  { icon: Headphones, title: "Trusted Customer Support", text: "Friendly assistance before and after your purchase." }
] as const;

const VALUES = [
  { icon: Award, title: "Quality", text: "We never compromise on fabric, fit, or finish." },
  { icon: ShieldCheck, title: "Trust", text: "Transparent policies and honest communication always." },
  { icon: Scissors, title: "Craftsmanship", text: "Thoughtful design rooted in Indian blouse artistry." },
  { icon: HeartHandshake, title: "Customer Satisfaction", text: "Your confidence and comfort come first." }
] as const;

const STATS = [
  { value: 5000, suffix: "+", label: "Happy Customers" },
  { value: 1000, suffix: "+", label: "Designs" },
  { value: 4.8, suffix: "★", label: "Average Rating", decimals: 1 },
  { value: 100, suffix: "%", label: "Secure Payments" }
] as const;

const TIMELINE = [
  { title: "Choose Design", text: "Browse curated collections and find your perfect blouse." },
  { title: "Place Order", text: "Select your size with AI guidance and checkout securely." },
  { title: "Quality Check", text: "Every piece is inspected before it leaves our studio." },
  { title: "Packed Carefully", text: "Premium packaging protects your order in transit." },
  { title: "Delivered to Your Door", text: "Receive your blouse ready to wear and shine." }
] as const;

const PROMISES = [
  { icon: Palette, title: "Premium Fabric", text: "Soft, durable materials chosen for all-day comfort." },
  { icon: CheckCircle2, title: "Perfect Finish", text: "Clean seams, refined details, and polished presentation." },
  { icon: Package, title: "Carefully Packed", text: "Protected packaging so your blouse arrives pristine." },
  { icon: Headphones, title: "Support After Purchase", text: "We're here if you need help with sizing or orders." }
] as const;

const AI_FEATURES = [
  { icon: Ruler, title: "AI Size Finder", text: "Get personalised size recommendations in seconds." },
  { icon: Sparkles, title: "Smart Recommendations", text: "Discover styles that match your taste and occasion." },
  { icon: Palette, title: "Personalized Shopping", text: "A smoother journey tailored to how you shop." },
  { icon: Star, title: "Confidence in Fit", text: "Shop ready-made blouses with less guesswork." }
] as const;

function AnimatedStat({
  value,
  suffix,
  label,
  decimals = 0
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-3xl font-bold text-primary sm:text-4xl">
        {formatted}
        {suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground/65">{label}</p>
    </div>
  );
}

type AboutPageContentProps = {
  storeName: string;
  tagline: string;
  address: string;
  phoneDisplay: string;
  telUrl: string;
  supportEmail: string;
};

export function AboutPageContent({
  storeName,
  tagline,
  address,
  phoneDisplay,
  telUrl,
  supportEmail
}: AboutPageContentProps) {
  return (
    <div className="bg-background">
      {/* 1. Hero */}
      <section
        className="relative overflow-hidden border-b border-accent/15"
        aria-labelledby="about-hero-heading"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-blush via-white to-brand-cream/80" />
          <Image
            src="/assets/hero/floral-right.png"
            alt=""
            width={280}
            height={280}
            className="absolute -right-8 bottom-0 w-48 opacity-40 sm:w-64 md:w-72"
          />
          <Image
            src="/assets/hero/floral-left.png"
            alt=""
            width={240}
            height={240}
            className="absolute -left-10 top-8 w-40 opacity-30 sm:w-52"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:py-24">
          <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              {tagline}
            </p>
            <h1
              id="about-hero-heading"
              className="mt-4 font-display text-4xl font-bold leading-tight text-primary sm:text-5xl lg:text-[3.25rem]"
            >
              About {storeName}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
              Premium ready-made Indian blouses crafted for the modern woman — where elegance meets
              everyday comfort, and affordable luxury feels effortlessly within reach.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href={EXPLORE_COLLECTIONS_HREF} size="lg">
                Shop Collection
              </Button>
              <Button href="/contact" variant="outline" size="lg">
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Our Story */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20" aria-labelledby="our-story-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div {...fadeUp}>
            <h2 id="our-story-heading" className="font-display text-3xl font-bold text-primary sm:text-4xl">
              Our Story
            </h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-secondary/80" aria-hidden="true" />
            <p className="mt-6 text-base leading-relaxed text-foreground/75">
              {storeName} began with a simple belief: every woman deserves access to beautifully
              finished, ready-made blouses without compromising on quality or comfort.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground/75">
              From festive embroideries to everyday elegance, we curate designs for the modern Indian
              woman who values premium craftsmanship, a perfect fit, and fashion that moves with her
              lifestyle — all at thoughtfully accessible prices.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground/75">
              Today, we combine traditional blouse artistry with smart shopping tools so you can
              discover, choose, and wear with confidence.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <MediaPlaceholder
              variant="hero"
              label={`${storeName} Boutique`}
              hint="Premium ready-made blouses"
              className="shadow-card"
            />
          </motion.div>
        </div>
      </section>

      {/* 3. Why Choose */}
      <section
        className="border-y border-accent/10 bg-white py-16 sm:py-20"
        aria-labelledby="why-choose-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 id="why-choose-heading" className="font-display text-3xl font-bold text-primary sm:text-4xl">
              Why Choose {storeName}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
              A premium shopping experience built around quality, trust, and thoughtful design.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                  className="group rounded-2xl border border-accent/15 bg-gradient-to-br from-white to-blush/40 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_12px_36px_rgba(123,13,43,0.12)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Mission */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20" aria-labelledby="mission-heading">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/10 px-6 py-12 text-center shadow-card sm:px-12 sm:py-14"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/15 blur-3xl"
            aria-hidden="true"
          />
          <h2 id="mission-heading" className="font-display text-2xl font-bold text-primary sm:text-3xl">
            Our Mission
          </h2>
          <blockquote className="mx-auto mt-6 max-w-3xl font-display text-xl font-medium leading-relaxed text-primary/90 sm:text-2xl">
            &ldquo;To make premium ready-made blouses accessible to every woman with confidence,
            comfort and elegance.&rdquo;
          </blockquote>
        </motion.div>
      </section>

      {/* 5. Values */}
      <section
        className="border-t border-accent/10 bg-blush/30 py-16 sm:py-20"
        aria-labelledby="values-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <motion.h2
            {...fadeUp}
            id="values-heading"
            className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
          >
            Our Values
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                  className="rounded-2xl border border-white/80 bg-white p-6 text-center shadow-card"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Statistics */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20" aria-labelledby="stats-heading">
        <motion.h2 {...fadeUp} id="stats-heading" className="sr-only">
          Our achievements
        </motion.h2>
        <div className="grid grid-cols-2 gap-8 rounded-3xl border border-accent/15 bg-white px-6 py-10 shadow-card lg:grid-cols-4">
          {STATS.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              decimals={"decimals" in stat ? stat.decimals : 0}
            />
          ))}
        </div>
      </section>

      {/* 7. How We Work */}
      <section
        className="border-y border-accent/10 bg-white py-16 sm:py-20"
        aria-labelledby="how-we-work-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <motion.h2
            {...fadeUp}
            id="how-we-work-heading"
            className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
          >
            How We Work
          </motion.h2>
          <ol className="relative mx-auto mt-12 max-w-2xl space-y-0">
            {TIMELINE.map((step, index) => (
              <motion.li
                key={step.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.08 }}
                className="relative flex gap-5 pb-10 last:pb-0"
              >
                {index < TIMELINE.length - 1 ? (
                  <span
                    className="absolute left-[1.125rem] top-10 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-primary/30 to-secondary/20"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md">
                  {index + 1}
                </div>
                <div className="pt-0.5">
                  <h3 className="font-display text-lg font-semibold text-primary">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/70">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* 8. Customer Promise */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20" aria-labelledby="promise-heading">
        <motion.h2
          {...fadeUp}
          id="promise-heading"
          className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
        >
          Our Customer Promise
        </motion.h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className="rounded-2xl border border-accent/15 bg-gradient-to-b from-white to-blush/30 p-6 shadow-card"
              >
                <Icon className="h-6 w-6 text-secondary" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold text-primary">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 9. AI Powered Shopping */}
      <section
        className="border-t border-accent/10 bg-gradient-to-br from-blush/50 via-white to-brand-cream/40 py-16 sm:py-20"
        aria-labelledby="ai-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Smart Shopping
            </p>
            <h2 id="ai-heading" className="mt-4 font-display text-3xl font-bold text-primary sm:text-4xl">
              AI-Powered Shopping
            </h2>
            <p className="mt-4 text-foreground/70">
              Intelligent tools already built into {storeName} to help you shop with clarity and
              confidence.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AI_FEATURES.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                  className="rounded-2xl border border-white bg-white/90 p-6 shadow-card backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
          <motion.div {...fadeUp} className="mt-10 text-center">
            <Button href="/ai-features" variant="outline">
              Explore AI Features
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 10. Contact */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20" aria-labelledby="contact-heading">
        <motion.h2
          {...fadeUp}
          id="contact-heading"
          className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
        >
          Visit &amp; Contact Us
        </motion.h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <motion.div
            {...fadeUp}
            className="rounded-3xl border border-accent/15 bg-white p-6 shadow-card sm:p-8"
          >
            <ul className="space-y-5 text-sm sm:text-base">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-primary">Address</p>
                  <p className="mt-1 leading-relaxed text-foreground/75">{address}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-primary">Phone</p>
                  <a href={telUrl} className="mt-1 text-foreground/75 hover:text-primary">
                    {phoneDisplay}
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-primary">Email</p>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-1 text-foreground/75 hover:text-primary"
                  >
                    {supportEmail}
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-primary">Working Hours</p>
                  <p className="mt-1 text-foreground/75">Mon – Sat: 10:00 AM – 8:00 PM</p>
                  <p className="text-foreground/60">Sunday: Closed</p>
                </div>
              </li>
            </ul>
            <Link href="/contact" className="btn-outline mt-8 inline-flex text-sm">
              Full Contact Page
            </Link>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="overflow-hidden rounded-3xl border border-accent/15 bg-blush/40 shadow-card"
          >
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center bg-gradient-to-br from-blush via-white to-brand-cream/60 p-8 text-center">
              <MapPin className="h-10 w-10 text-primary/60" aria-hidden="true" />
              <p className="mt-4 font-display text-lg font-semibold text-primary">Google Maps</p>
              <p className="mt-2 max-w-xs text-sm text-foreground/65">
                Find us at our store.
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${storeName} ${address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-6 inline-flex text-sm"
              >
                Open in Google Maps
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 11. Final CTA */}
      <section
        className="border-t border-accent/15 bg-gradient-to-br from-primary via-[#8f1230] to-primary px-5 py-16 sm:px-6 sm:py-20"
        aria-labelledby="final-cta-heading"
      >
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <h2 id="final-cta-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to Find Your Perfect Blouse?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
            Explore our collections or reach out — we&apos;d love to help you discover something
            beautiful.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              href={EXPLORE_COLLECTIONS_HREF}
              size="lg"
              className="!bg-white !text-primary hover:!bg-white/95"
            >
              Explore Collection
            </Button>
            <Button
              href="/contact"
              variant="outline"
              size="lg"
              className="!border-white/50 !text-white hover:!bg-white/10"
            >
              Contact Us
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
