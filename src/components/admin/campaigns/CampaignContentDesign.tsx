"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  CAMPAIGN_ALIGNMENTS,
  CAMPAIGN_CUSTOM_OPTION,
  CAMPAIGN_FONT_FAMILIES,
  CAMPAIGN_FONT_LABELS,
  CAMPAIGN_FONT_STYLES,
  CAMPAIGN_FONT_WEIGHTS,
  CAMPAIGN_HEADING_SIZES,
  CAMPAIGN_SIZE_UNITS,
  CAMPAIGN_TEXT_SIZES,
  DEFAULT_CAMPAIGN_CONTENT_STYLE,
  DEFAULT_CUSTOM_FONT_WEIGHT,
  DEFAULT_CUSTOM_HEADING_SIZE,
  DEFAULT_CUSTOM_TEXT_SIZE,
  contentStyleFromPaletteTokens,
  parseSafeFontFamily,
  type CampaignContentAlign,
  type CampaignContentStyle,
  type CampaignCustomSize,
  type CampaignFontFamily,
  type CampaignFontFamilyChoice,
  type CampaignFontStyle,
  type CampaignFontWeight,
  type CampaignFontWeightChoice,
  type CampaignSizeUnit
} from "@/lib/campaigns/campaign-hero-content-style";
import { CampaignHeroContent } from "@/components/store/CampaignHeroContent";
import { sampleCampaignHeroImage } from "@/components/store/useCampaignHeroPalette";

export type CampaignStyleMode = "auto" | "custom";

type CampaignContentDesignProps = {
  visible: boolean;
  heroImageUrl: string;
  heading: string;
  subheading: string;
  offerText: string;
  ctaText: string;
  styleMode: CampaignStyleMode;
  draftStyle: CampaignContentStyle;
  onStyleModeChange: (mode: CampaignStyleMode) => void;
  onDraftStyleChange: (style: CampaignContentStyle) => void;
};

const customToggleClass =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-primary transition-all duration-150 hover:border-primary hover:bg-[#fff5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const usePresetClass =
  "text-[11px] font-medium text-foreground/55 transition-colors duration-150 hover:text-primary";

function CustomModeToggle({
  active,
  onEnable,
  onDisable
}: {
  active: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return active ? (
    <button type="button" className={usePresetClass} onClick={onDisable}>
      Use Preset
    </button>
  ) : (
    <button type="button" className={customToggleClass} onClick={onEnable}>
      <Plus className="h-3 w-3" />
      Custom
    </button>
  );
}

function FontFamilyField({
  value,
  customValue,
  fallbackPreset,
  onChange
}: {
  value: CampaignFontFamilyChoice;
  customValue?: string;
  fallbackPreset: CampaignFontFamily;
  onChange: (family: CampaignFontFamilyChoice, customFontFamily?: string) => void;
}) {
  const isCustom = value === CAMPAIGN_CUSTOM_OPTION;
  const custom = customValue ?? "";
  const [lastPreset, setLastPreset] = useState<CampaignFontFamily>(
    value !== CAMPAIGN_CUSTOM_OPTION ? value : fallbackPreset
  );

  useEffect(() => {
    if (value !== CAMPAIGN_CUSTOM_OPTION) setLastPreset(value);
  }, [value]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Font family</span>
        <CustomModeToggle
          active={isCustom}
          onEnable={() => onChange(CAMPAIGN_CUSTOM_OPTION, custom)}
          onDisable={() => onChange(lastPreset, custom)}
        />
      </div>
      {isCustom ? (
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-foreground/55">Custom font family</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Georgia, serif"
            value={custom}
            maxLength={80}
            onChange={(e) => onChange(CAMPAIGN_CUSTOM_OPTION, e.target.value)}
          />
          {custom.trim() && !parseSafeFontFamily(custom) ? (
            <span className="mt-1 block text-xs text-red-600">
              Use a font name or comma-separated stack, such as Georgia, serif.
            </span>
          ) : null}
        </label>
      ) : (
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => {
            const next = e.target.value as CampaignFontFamily;
            setLastPreset(next);
            onChange(next, custom);
          }}
        >
          {CAMPAIGN_FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {CAMPAIGN_FONT_LABELS[font]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function FontSizeField<TSize extends string>({
  value,
  customSize,
  options,
  defaultCustom,
  fallbackPreset,
  onChange
}: {
  value: TSize;
  customSize?: CampaignCustomSize;
  options: readonly string[];
  defaultCustom: CampaignCustomSize;
  fallbackPreset: TSize;
  onChange: (size: TSize, customFontSize?: CampaignCustomSize) => void;
}) {
  const isCustom = value === CAMPAIGN_CUSTOM_OPTION;
  const custom = customSize ?? defaultCustom;
  const [lastPreset, setLastPreset] = useState<TSize>(
    value !== CAMPAIGN_CUSTOM_OPTION ? value : fallbackPreset
  );

  useEffect(() => {
    if (value !== CAMPAIGN_CUSTOM_OPTION) setLastPreset(value);
  }, [value]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Font size</span>
        <CustomModeToggle
          active={isCustom}
          onEnable={() => onChange(CAMPAIGN_CUSTOM_OPTION as TSize, custom)}
          onDisable={() => onChange(lastPreset, customSize)}
        />
      </div>
      {isCustom ? (
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-foreground/55">Custom size</span>
          <span className="flex gap-2">
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              min={custom.unit === "px" ? 12 : 0.75}
              max={custom.unit === "px" ? 160 : 10}
              step={custom.unit === "px" ? 1 : 0.05}
              value={custom.value}
              onChange={(e) =>
                onChange(CAMPAIGN_CUSTOM_OPTION as TSize, {
                  value: Number(e.target.value),
                  unit: custom.unit
                })
              }
            />
            <select
              className="rounded-lg border px-3 py-2"
              value={custom.unit}
              onChange={(e) =>
                onChange(CAMPAIGN_CUSTOM_OPTION as TSize, {
                  value: custom.value,
                  unit: e.target.value as CampaignSizeUnit
                })
              }
            >
              {CAMPAIGN_SIZE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </span>
        </label>
      ) : (
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => {
            const next = e.target.value as TSize;
            setLastPreset(next);
            onChange(next, customSize);
          }}
        >
          {options.map((size) => (
            <option key={size} value={size}>
              {size.toUpperCase()}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function WeightField({
  value,
  customWeight,
  onChange
}: {
  value: CampaignFontWeightChoice;
  customWeight?: number;
  onChange: (weight: CampaignFontWeightChoice, customFontWeight?: number) => void;
}) {
  const isCustom = value === CAMPAIGN_CUSTOM_OPTION;
  const custom = customWeight ?? DEFAULT_CUSTOM_FONT_WEIGHT;
  const [lastPreset, setLastPreset] = useState<CampaignFontWeight>(
    value !== CAMPAIGN_CUSTOM_OPTION ? value : "semibold"
  );

  useEffect(() => {
    if (value !== CAMPAIGN_CUSTOM_OPTION) setLastPreset(value);
  }, [value]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Weight</span>
        <CustomModeToggle
          active={isCustom}
          onEnable={() => onChange(CAMPAIGN_CUSTOM_OPTION, custom)}
          onDisable={() => onChange(lastPreset, customWeight)}
        />
      </div>
      {isCustom ? (
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-foreground/55">Custom weight</span>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            min={100}
            max={900}
            step={100}
            value={custom}
            onChange={(e) => onChange(CAMPAIGN_CUSTOM_OPTION, Number(e.target.value))}
          />
        </label>
      ) : (
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => {
            const next = e.target.value as CampaignFontWeight;
            setLastPreset(next);
            onChange(next, customWeight);
          }}
        >
          {CAMPAIGN_FONT_WEIGHTS.map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border bg-white p-1"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <input
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs uppercase"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      </span>
    </label>
  );
}

export function CampaignContentDesign({
  visible,
  heroImageUrl,
  heading,
  subheading,
  offerText,
  ctaText,
  styleMode,
  draftStyle,
  onStyleModeChange,
  onDraftStyleChange
}: CampaignContentDesignProps) {
  const [generating, setGenerating] = useState(false);
  const previewStyle = styleMode === "custom" ? draftStyle : null;
  const canGenerate = Boolean(heroImageUrl.trim());

  const update = (next: CampaignContentStyle) => {
    onStyleModeChange("custom");
    onDraftStyleChange(next);
  };

  const generate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    try {
      const result = await sampleCampaignHeroImage(heroImageUrl.trim());
      if (!result.ok) {
        toast.error(
          result.reason === "cors"
            ? "Could not read colors from this image. You can still set styles manually."
            : "Could not load the campaign image for style generation."
        );
        return;
      }
      onDraftStyleChange(contentStyleFromPaletteTokens(result.tokens));
      onStyleModeChange("custom");
      toast.success("Style generated from the campaign image. You can edit any value.");
    } catch {
      toast.error("Could not generate style from this image. You can still set styles manually.");
    } finally {
      setGenerating(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="min-w-0 w-full rounded-xl border border-accent/30 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Content Design</h2>
          <p className="mt-1 text-sm text-foreground/65">
            {styleMode === "auto"
              ? "Storefront will auto-style from the image until you generate or save a design."
              : "These values save with the campaign and override automatic storefront styling."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate || generating}
            className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
          >
            {generating ? "Generating…" : "Auto Generate Style"}
          </button>
          {styleMode === "custom" ? (
            <button
              type="button"
              onClick={() => {
                onStyleModeChange("auto");
                onDraftStyleChange(DEFAULT_CAMPAIGN_CONTENT_STYLE);
              }}
              className="btn-outline px-4 py-2 text-xs"
            >
              Use automatic styling
            </button>
          ) : null}
        </div>
      </div>
      {!canGenerate ? (
        <p className="mt-3 text-xs text-foreground/50">Upload a desktop hero image to auto-generate colors.</p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border bg-[#1a1a1a]">
        <p className="border-b border-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-white/60">
          Live preview
        </p>
        <div className="campaign-hero relative min-h-[16rem] w-full sm:min-h-[20rem]">
          <div className="campaign-hero-media relative min-h-[16rem] w-full sm:min-h-[20rem]">
            {heroImageUrl.trim() ? (
              <img
                src={heroImageUrl}
                alt="Campaign content design preview"
                className="campaign-hero-image absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                Upload a desktop image to preview
              </div>
            )}
            <CampaignHeroContent
              compact
              ctaAsLink={false}
              campaign={{
                heroImageUrl: heroImageUrl.trim() || "https://example.invalid/preview",
                mobileImageUrl: null,
                heading: heading.trim() || "Campaign heading",
                subheading: subheading.trim() || "Subheading appears here",
                offerText: offerText.trim() || "Offer text",
                ctaText: ctaText.trim() || "Shop now",
                ctaUrl: "/products",
                contentStyle: previewStyle
              }}
            />
          </div>
        </div>
      </div>

      <div className={`mt-5 grid gap-5 ${styleMode === "auto" ? "opacity-70" : ""}`}>
        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Heading</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FontFamilyField
              value={draftStyle.heading.fontFamily}
              customValue={draftStyle.heading.customFontFamily}
              fallbackPreset="playfair"
              onChange={(fontFamily, customFontFamily) =>
                update({
                  ...draftStyle,
                  heading: { ...draftStyle.heading, fontFamily, customFontFamily }
                })
              }
            />
            <FontSizeField
              value={draftStyle.heading.fontSize}
              customSize={draftStyle.heading.customFontSize}
              options={CAMPAIGN_HEADING_SIZES}
              defaultCustom={DEFAULT_CUSTOM_HEADING_SIZE}
              fallbackPreset="lg"
              onChange={(fontSize, customFontSize) =>
                update({
                  ...draftStyle,
                  heading: { ...draftStyle.heading, fontSize, customFontSize }
                })
              }
            />
            <WeightField
              value={draftStyle.heading.fontWeight}
              customWeight={draftStyle.heading.customFontWeight}
              onChange={(fontWeight, customFontWeight) =>
                update({
                  ...draftStyle,
                  heading: { ...draftStyle.heading, fontWeight, customFontWeight }
                })
              }
            />
            <label className="block text-sm">
              Style
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={draftStyle.heading.fontStyle}
                onChange={(e) =>
                  update({
                    ...draftStyle,
                    heading: { ...draftStyle.heading, fontStyle: e.target.value as CampaignFontStyle }
                  })
                }
              >
                {CAMPAIGN_FONT_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ColorField
            label="Text color"
            value={draftStyle.heading.color}
            onChange={(color) => update({ ...draftStyle, heading: { ...draftStyle.heading, color } })}
          />
        </fieldset>

        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Subheading</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FontFamilyField
              value={draftStyle.subheading.fontFamily}
              customValue={draftStyle.subheading.customFontFamily}
              fallbackPreset="inter"
              onChange={(fontFamily, customFontFamily) =>
                update({
                  ...draftStyle,
                  subheading: { ...draftStyle.subheading, fontFamily, customFontFamily }
                })
              }
            />
            <FontSizeField
              value={draftStyle.subheading.fontSize}
              customSize={draftStyle.subheading.customFontSize}
              options={CAMPAIGN_TEXT_SIZES}
              defaultCustom={DEFAULT_CUSTOM_TEXT_SIZE}
              fallbackPreset="md"
              onChange={(fontSize, customFontSize) =>
                update({
                  ...draftStyle,
                  subheading: { ...draftStyle.subheading, fontSize, customFontSize }
                })
              }
            />
          </div>
          <ColorField
            label="Text color"
            value={draftStyle.subheading.color}
            onChange={(color) => update({ ...draftStyle, subheading: { ...draftStyle.subheading, color } })}
          />
        </fieldset>

        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Offer text</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FontFamilyField
              value={draftStyle.offer.fontFamily}
              customValue={draftStyle.offer.customFontFamily}
              fallbackPreset="inter"
              onChange={(fontFamily, customFontFamily) =>
                update({
                  ...draftStyle,
                  offer: { ...draftStyle.offer, fontFamily, customFontFamily }
                })
              }
            />
            <FontSizeField
              value={draftStyle.offer.fontSize}
              customSize={draftStyle.offer.customFontSize}
              options={CAMPAIGN_TEXT_SIZES}
              defaultCustom={DEFAULT_CUSTOM_TEXT_SIZE}
              fallbackPreset="sm"
              onChange={(fontSize, customFontSize) =>
                update({
                  ...draftStyle,
                  offer: { ...draftStyle.offer, fontSize, customFontSize }
                })
              }
            />
          </div>
          <ColorField
            label="Text color"
            value={draftStyle.offer.color}
            onChange={(color) => update({ ...draftStyle, offer: { ...draftStyle.offer, color } })}
          />
        </fieldset>

        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">CTA</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              label="Background color"
              value={draftStyle.cta.backgroundColor}
              onChange={(backgroundColor) => update({ ...draftStyle, cta: { ...draftStyle.cta, backgroundColor } })}
            />
            <ColorField
              label="Text color"
              value={draftStyle.cta.textColor}
              onChange={(textColor) => update({ ...draftStyle, cta: { ...draftStyle.cta, textColor } })}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Content position</legend>
          <div className="flex flex-wrap gap-3">
            {CAMPAIGN_ALIGNMENTS.map((align) => (
              <label key={align} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="contentAlign"
                  checked={draftStyle.layout.horizontalAlign === align}
                  onChange={() =>
                    update({
                      ...draftStyle,
                      layout: { horizontalAlign: align as CampaignContentAlign }
                    })
                  }
                />
                {align}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3 rounded-lg border border-accent/20 p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Overlay</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftStyle.overlay.enabled}
              onChange={(e) =>
                update({
                  ...draftStyle,
                  overlay: { ...draftStyle.overlay, enabled: e.target.checked }
                })
              }
            />
            Enable overlay
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              label="Overlay color"
              value={draftStyle.overlay.color}
              onChange={(color) => update({ ...draftStyle, overlay: { ...draftStyle.overlay, color } })}
            />
            <label className="block text-sm">
              Opacity
              <span className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  value={Math.round(draftStyle.overlay.opacity * 100)}
                  onChange={(e) =>
                    update({
                      ...draftStyle,
                      overlay: { ...draftStyle.overlay, opacity: Number(e.target.value) / 100 }
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-20 rounded-lg border px-2 py-2 text-sm"
                  value={Math.round(draftStyle.overlay.opacity * 100)}
                  onChange={(e) => {
                    const next = Math.min(100, Math.max(0, Number(e.target.value)));
                    update({
                      ...draftStyle,
                      overlay: { ...draftStyle.overlay, opacity: Number.isFinite(next) ? next / 100 : 0 }
                    });
                  }}
                />
                <span className="text-xs text-foreground/55">%</span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
