"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  MessageCircle,
  Package,
  Ruler,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Zap,
  Heart,
  ShieldCheck,
  Smile
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EXPLORE_COLLECTIONS_HREF } from "@/lib/navigation/explore-collections";
import {
  isValidEmail,
  isValidFullName,
  isValidIndianMobile
} from "@/lib/checkout/contact-validation";
import {
  STORE_ADDRESS,
  STORE_ADDRESS_SHORT,
  STORE_NAME,
  STORE_PHONE_PRIMARY_DISPLAY,
  STORE_TEL_PRIMARY,
  STORE_WHATSAPP_URL,
  SUPPORT_EMAIL
} from "@/lib/site-config";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: "easeOut" as const }
};

const CONTACT_CARDS = [
  {
    icon: MapPin,
    title: "Store Address",
    content: STORE_ADDRESS,
    href: "https://www.google.com/maps/search/?api=1&query=Fashion+Point+Vijayawada",
    linkLabel: "Get directions"
  },
  {
    icon: Phone,
    title: "Phone",
    content: STORE_PHONE_PRIMARY_DISPLAY,
    href: STORE_TEL_PRIMARY,
    linkLabel: "Call now"
  },
  {
    icon: Mail,
    title: "Email",
    content: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    linkLabel: "Send email"
  },
  {
    icon: Clock,
    title: "Business Hours",
    content: "Mon – Sat: 10:00 AM – 8:00 PM\nSunday: Closed",
    href: undefined,
    linkLabel: undefined
  }
] as const;

const WHY_CONTACT = [
  {
    icon: Package,
    title: "Order Support",
    text: "Track orders, delivery updates, and order-related questions."
  },
  {
    icon: Ruler,
    title: "Size Guidance",
    text: "Help choosing the right fit with our AI Size Finder and expert tips."
  },
  {
    icon: HelpCircle,
    title: "Product Enquiries",
    text: "Fabric details, colours, availability, and collection recommendations."
  },
  {
    icon: RefreshCw,
    title: "Returns & Exchanges",
    text: "Guidance on our policies and assistance with your purchase."
  }
] as const;

const SUPPORT_PROMISES = [
  { icon: Zap, text: "Fast Response" },
  { icon: Smile, text: "Friendly Support" },
  { icon: ShieldCheck, text: "Secure Assistance" },
  { icon: Heart, text: "Customer Satisfaction" }
] as const;

const FAQ_ITEMS = [
  {
    question: "How quickly do you respond?",
    answer:
      "We aim to reply to emails and WhatsApp messages within a few hours during business hours (Mon–Sat, 10 AM – 8 PM)."
  },
  {
    question: "Can I contact you on WhatsApp?",
    answer:
      "Yes. WhatsApp is the fastest way to reach us for sizing help, product questions, and order support."
  },
  {
    question: "Do you help with blouse sizing?",
    answer:
      "Absolutely. Use our AI Size Finder online or message us with your measurements — we're happy to guide you."
  },
  {
    question: "Where is your store located?",
    answer: `Our store is in ${STORE_ADDRESS_SHORT}. Visit us opposite Lion School on Brahmin Street, Mallikarjunapeta.`
  }
] as const;

type FormState = "idle" | "loading" | "success" | "error";

type FormFields = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const INITIAL_FORM: FormFields = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: ""
};

function ContactForm() {
  const [form, setForm] = useState<FormFields>(INITIAL_FORM);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function validate(): string | null {
    if (!isValidFullName(form.name)) {
      return "Please enter your full name (first and last name).";
    }
    if (!isValidEmail(form.email)) {
      return "Please enter a valid email address.";
    }
    if (!isValidIndianMobile(form.phone)) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }
    if (!form.subject.trim()) {
      return "Please enter a subject.";
    }
    if (form.message.trim().length < 10) {
      return "Please enter a message of at least 10 characters.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const validationError = validate();
    if (validationError) {
      setState("error");
      setErrorMessage(validationError);
      return;
    }

    setState("loading");

    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Phone: ${form.phone.trim()}`,
      "",
      form.message.trim()
    ].join("\n");

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(form.subject.trim())}&body=${encodeURIComponent(body)}`;

    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      window.location.href = mailto;
      setState("success");
      setForm(INITIAL_FORM);
    } catch {
      setState("error");
      setErrorMessage("Unable to open your email app. Please email us directly at " + SUPPORT_EMAIL);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-accent/20 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Contact form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-foreground/80">
            Full Name <span className="text-primary">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={fieldClass}
            placeholder="Your full name"
            disabled={state === "loading"}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-foreground/80">
            Email <span className="text-primary">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={fieldClass}
            placeholder="you@example.com"
            disabled={state === "loading"}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-phone" className="text-sm font-medium text-foreground/80">
            Phone Number <span className="text-primary">*</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={fieldClass}
            placeholder="10-digit mobile number"
            disabled={state === "loading"}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="text-sm font-medium text-foreground/80">
            Subject <span className="text-primary">*</span>
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className={fieldClass}
            placeholder="How can we help?"
            disabled={state === "loading"}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="text-sm font-medium text-foreground/80">
          Message <span className="text-primary">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className={`${fieldClass} resize-y min-h-[120px]`}
          placeholder="Tell us about your enquiry..."
          disabled={state === "loading"}
        />
      </div>

      {state === "error" && errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {state === "success" ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Thank you! Your email app should open with your message ready to send. If it didn&apos;t open,
          please email us at {SUPPORT_EMAIL}.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "loading"}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto disabled:opacity-60"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [expandAll, setExpandAll] = useState(false);

  return (
    <div id="faq-section">
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = expandAll || openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-button-${index}`;

          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-2xl border border-accent/15 bg-white shadow-card"
            >
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  setExpandAll(false);
                  setOpenIndex(isOpen && openIndex === index ? null : index);
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-blush/30"
              >
                <span className="font-medium text-primary">{item.question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-foreground/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <div id={panelId} role="region" aria-labelledby={buttonId} className="px-5 pb-4">
                  <p className="text-sm leading-relaxed text-foreground/70">{item.answer}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          setExpandAll(true);
          setOpenIndex(null);
        }}
        className="btn-outline mt-6 inline-flex text-sm"
      >
        View All FAQs
      </button>
    </div>
  );
}

export function ContactPageContent() {
  return (
    <div className="bg-background">
      {/* 1. Hero */}
      <section
        className="relative overflow-hidden border-b border-accent/15"
        aria-labelledby="contact-hero-heading"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-blush via-white to-brand-cream/80" />
          <Image
            src="/assets/hero/floral-left.png"
            alt=""
            width={240}
            height={240}
            className="absolute -left-8 top-6 w-40 opacity-35 sm:w-52"
          />
          <Image
            src="/assets/hero/floral-right.png"
            alt=""
            width={280}
            height={280}
            className="absolute -right-10 bottom-0 w-48 opacity-30 sm:w-64"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16 lg:py-20">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-1 text-[12px] text-foreground/55 sm:text-[13px]"
          >
            <Link href="/" className="transition hover:text-primary">
              Home
            </Link>
            <span className="text-foreground/40" aria-hidden="true">
              /
            </span>
            <span className="font-medium text-foreground/65">Contact Us</span>
          </nav>

          <motion.div {...fadeUp} className="max-w-2xl">
            <h1
              id="contact-hero-heading"
              className="font-display text-4xl font-bold leading-tight text-primary sm:text-5xl"
            >
              Contact {STORE_NAME}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-foreground/75 sm:text-lg">
              We&apos;re here to help you choose the perfect ready-made blouse.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. Contact cards */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16" aria-labelledby="contact-cards-heading">
        <h2 id="contact-cards-heading" className="sr-only">
          Contact information
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACT_CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className="group rounded-2xl border border-accent/15 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_12px_36px_rgba(123,13,43,0.1)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-primary">{card.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/70">
                  {card.content}
                </p>
                {card.href && card.linkLabel ? (
                  <a
                    href={card.href}
                    className="mt-4 inline-block text-sm font-semibold text-secondary transition hover:text-primary"
                    {...(card.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {card.linkLabel} →
                  </a>
                ) : null}
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 3. Contact form + 4. WhatsApp */}
      <section
        className="border-y border-accent/10 bg-white py-14 sm:py-16"
        aria-labelledby="contact-form-heading"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-5 lg:gap-12">
          <motion.div {...fadeUp} className="lg:col-span-3">
            <h2 id="contact-form-heading" className="font-display text-2xl font-bold text-primary sm:text-3xl">
              Send Us a Message
            </h2>
            <p className="mt-2 text-sm text-foreground/65">
              Fill in the form below and we&apos;ll get back to you as soon as possible.
            </p>
            <div className="mt-8 rounded-3xl border border-accent/15 bg-gradient-to-br from-white to-blush/30 p-6 shadow-card sm:p-8">
              <ContactForm />
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-3xl border border-[#25D366]/25 bg-gradient-to-br from-[#25D366]/10 via-white to-blush/40 p-6 shadow-card sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-primary">Need instant assistance?</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                Chat with us on WhatsApp for quick answers on sizing, products, and orders — usually within
                minutes during business hours.
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Mon – Sat · 10:00 AM – 8:00 PM
              </p>
              <a
                href={STORE_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#20bd5a] sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Store location */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16" aria-labelledby="location-heading">
        <motion.h2
          {...fadeUp}
          id="location-heading"
          className="font-display text-3xl font-bold text-primary sm:text-4xl"
        >
          Store Location
        </motion.h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-3xl border border-accent/15 bg-blush/30 shadow-card"
          >
            <div className="flex min-h-[300px] flex-col items-center justify-center bg-gradient-to-br from-blush via-white to-brand-cream/50 p-8 text-center">
              <MapPin className="h-12 w-12 text-primary/50" aria-hidden="true" />
              <p className="mt-4 font-display text-lg font-semibold text-primary">Google Maps</p>
              <p className="mt-2 text-sm text-foreground/60">Interactive map — coming soon</p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Fashion+Point+Vijayawada"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-6 inline-flex text-sm"
              >
                Get Directions
              </a>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="rounded-3xl border border-accent/15 bg-white p-6 shadow-card sm:p-8"
          >
            <h3 className="font-display text-xl font-semibold text-primary">Visit Our Store</h3>
            <p className="mt-4 text-sm leading-relaxed text-foreground/75">{STORE_ADDRESS}</p>
            <ul className="mt-6 space-y-4 text-sm text-foreground/70">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                <span>
                  <strong className="text-foreground/85">Nearby landmark:</strong> Opposite Lion School,
                  Brahmin Street, Mallikarjunapeta
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-secondary" aria-hidden="true">
                  🅿️
                </span>
                <span>
                  <strong className="text-foreground/85">Parking:</strong> Street parking available
                  nearby; we recommend visiting during non-peak hours for easier access.
                </span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* 6. Why contact us */}
      <section
        className="border-t border-accent/10 bg-blush/25 py-14 sm:py-16"
        aria-labelledby="why-contact-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <motion.h2
            {...fadeUp}
            id="why-contact-heading"
            className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
          >
            Why Contact Us
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CONTACT.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                  className="group rounded-2xl border border-white/80 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(123,13,43,0.1)]"
                >
                  <Icon
                    className="h-6 w-6 text-secondary transition group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-lg font-semibold text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Support promise */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16" aria-labelledby="promise-heading">
        <motion.div
          {...fadeUp}
          className="rounded-3xl border border-accent/15 bg-gradient-to-br from-primary/[0.05] via-white to-secondary/10 px-6 py-10 text-center shadow-card sm:px-12"
        >
          <h2 id="promise-heading" className="font-display text-2xl font-bold text-primary sm:text-3xl">
            Our Customer Support Promise
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUPPORT_PROMISES.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.text}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm font-semibold text-primary shadow-sm"
                >
                  <Icon className="h-4 w-4 text-secondary" aria-hidden="true" />
                  {item.text}
                </li>
              );
            })}
          </ul>
        </motion.div>
      </section>

      {/* 8. FAQ */}
      <section
        className="border-t border-accent/10 bg-white py-14 sm:py-16"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <motion.h2
            {...fadeUp}
            id="faq-heading"
            className="text-center font-display text-3xl font-bold text-primary sm:text-4xl"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="mt-10">
            <FaqAccordion />
          </motion.div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section
        className="border-t border-accent/15 bg-gradient-to-br from-primary via-[#8f1230] to-primary px-5 py-16 sm:px-6 sm:py-20"
        aria-labelledby="final-cta-heading"
      >
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <h2 id="final-cta-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            Need Help Choosing Your Perfect Blouse?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
            Browse our collections or message us on WhatsApp — we&apos;re ready to help.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href={EXPLORE_COLLECTIONS_HREF} size="lg" className="!bg-white !text-primary hover:!bg-white/95">
              Browse Collection
            </Button>
            <a
              href={STORE_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/50 bg-transparent px-7 text-base font-medium text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              WhatsApp Us
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
