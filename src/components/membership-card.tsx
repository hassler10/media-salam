"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import QRCode from "qrcode";
import { useBranding } from "@/components/branding-context";
import {
  BookMarkIcon,
  IconBriefcase,
  IconCalendar,
  IconCard,
  IconPhone,
  IconUser,
  CmpLogo,
  MosqueSkyline,
  PhotoPlaceholder,
} from "@/components/card-graphics";
import {
  ALIGN_VALUES,
  DEFAULT_BRANDING,
  STYLE_VALUES,
  cssFontFamily,
  hexToRgba,
  logoSrc,
  num,
  type CardBranding,
} from "@/lib/branding";
import { fitFontMm, formatDateFR } from "@/lib/utils";

export type CardData = {
  lastName: string;
  firstName: string;
  profession?: string | null;
  phone: string;
  subscriptionNumber: string;
  validityDate: string;
  gender: "masculin" | "feminin";
  photoData?: string | null;
};

type Props = {
  data: CardData;
  className?: string;
  branding?: CardBranding;
};

function Field({
  icon,
  label,
  value,
  maxChars,
  base = 1.55,
  scale = 1,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  maxChars: number;
  base?: number;
  scale?: number;
}) {
  const size = fitFontMm(value, maxChars, base * scale, 1.05 * scale);
  return (
    <div className="card-field">
      <span className="card-field-icon">{icon}</span>
      <span className="card-field-label">{label}&nbsp;:</span>
      <span className="card-field-value" style={{ fontSize: `${size}mm` }}>
        {value || "—"}
      </span>
    </div>
  );
}

export function MembershipCard({ data, className, branding: brandingProp }: Props) {
  const ctx = useBranding();
  const branding = brandingProp ?? ctx.branding ?? DEFAULT_BRANDING;
  const theme = data.gender === "feminin" ? "gold" : "green";
  const primary = theme === "green" ? branding.malePrimary : branding.femalePrimary;
  const accent = theme === "green" ? branding.maleAccent : branding.femaleAccent;
  const [qr, setQr] = useState<string>("");

  const fieldScale = num(branding, "fieldScale", 1);
  const cardStyle = (STYLE_VALUES as readonly string[]).includes(branding.cardStyle)
    ? branding.cardStyle
    : "classique";

  const cardVars = {
    "--c-primary": primary,
    "--c-primary-dark": primary,
    "--c-accent": accent,
    "--c-title": primary,
    "--c-icon": primary,
    "--c-photo-border": primary,
    "--c-mosque": primary,
    "--c-pill": hexToRgba(primary, 0.09),
    "--c-pattern": hexToRgba(primary, 0.055),
    "--c-font": cssFontFamily(branding),
    "--c-card-bg": /^#[0-9a-f]{3,8}$/i.test(branding.cardBackground) ? branding.cardBackground : "#ffffff",
    "--s-title": num(branding, "titleScale", 1),
    "--s-field": fieldScale,
    "--s-banner": num(branding, "bannerScale", 1),
    "--s-hint": num(branding, "hintScale", 1),
    "--s-qr": num(branding, "qrScale", 1),
    "--o-header-y": `${num(branding, "headerOffsetY", 0)}mm`,
    "--o-fields-y": `${num(branding, "fieldsOffsetY", 0)}mm`,
    "--o-fields-x": `${num(branding, "fieldsOffsetX", 0)}mm`,
    "--o-photo-y": `${num(branding, "photoOffsetY", 0)}mm`,
    "--o-qr-y": `${num(branding, "qrOffsetY", 0)}mm`,
    "--title-align": (ALIGN_VALUES as readonly string[]).includes(branding.titleAlign)
      ? branding.titleAlign
      : "left",
    "--fields-align": (ALIGN_VALUES as readonly string[]).includes(branding.fieldsAlign)
      ? branding.fieldsAlign
      : "left",
    "--card-radius": `${num(branding, "cornerRadius", 2.6)}mm`,
    "--pattern-opacity": num(branding, "patternOpacity", 0.9),
  } as CSSProperties;

  const libraryUrl = useMemo(() => {
    const base = branding.publicBaseUrl.trim();
    return base ? base.replace(/\/$/, "") : "";
  }, [branding.publicBaseUrl]);

  useEffect(() => {
    if (!libraryUrl) return;
    let cancelled = false;
    QRCode.toDataURL(libraryUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: primary, light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr("");
      });
    return () => {
      cancelled = true;
    };
  }, [libraryUrl, primary]);

  const lastName = (data.lastName || "Nom de l'abonné").toUpperCase();
  const firstName = data.firstName || "Prénoms de l'abonné";
  const showExtraField = Boolean(branding.extraFieldLabel.trim() && branding.extraFieldValue.trim());

  return (
    <article
      className={`membership-card theme-${theme} ${className ?? ""}`}
      data-style={cardStyle}
      style={cardVars}
    >
      <div className="card-pattern" />
      <div className="card-banner">
        <div className="card-banner-text">
          {branding.bannerLine1 ? <span>{branding.bannerLine1}</span> : null}
          {branding.bannerLine2 ? <span>{branding.bannerLine2}</span> : null}
          {branding.bannerLine3 ? <span>{branding.bannerLine3}</span> : null}
        </div>
      </div>
      <header className="card-header">
        <div className="card-brand">
          <CmpLogo className="card-logo" alt={branding.shortName} src={logoSrc(branding)} />
          <div className="card-titles">
            {branding.titleLine1 ? <h1>{branding.titleLine1}</h1> : null}
            {branding.titleLine2 ? <h2>{branding.titleLine2}</h2> : null}
            {branding.titleLine3 ? <h2>{branding.titleLine3}</h2> : null}
            {branding.tagline ? <p className="card-tagline">{branding.tagline}</p> : null}
            {branding.extraLine ? <p className="card-extra-line">{branding.extraLine}</p> : null}
          </div>
        </div>
      </header>

      <div className="card-body">
        <div className="card-photo-col">
          <div className="card-photo">
            {data.photoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoData} alt="Photo d'identité" />
            ) : (
              <PhotoPlaceholder className="card-photo-placeholder" />
            )}
          </div>
          {branding.photoCaption ? <p className="card-photo-caption">{branding.photoCaption}</p> : null}
        </div>

        <div className="card-fields">
          <Field icon={<IconUser />} label="Nom" value={lastName} maxChars={18} scale={fieldScale} />
          <Field icon={<IconUser />} label="Prénoms" value={firstName} maxChars={20} scale={fieldScale} />
          <Field
            icon={<IconBriefcase />}
            label="Profession"
            value={data.profession || "—"}
            maxChars={22}
            scale={fieldScale}
          />
          <Field
            icon={<IconPhone />}
            label="Contact"
            value={data.phone || "—"}
            maxChars={22}
            scale={fieldScale}
          />
          {showExtraField ? (
            <Field
              icon={<IconCard />}
              label={branding.extraFieldLabel}
              value={branding.extraFieldValue}
              maxChars={20}
              scale={fieldScale}
            />
          ) : null}
          <Field
            icon={<IconCard />}
            label="N° d'abonnement"
            value={data.subscriptionNumber || "BSN-AAAA-000000"}
            maxChars={20}
            scale={fieldScale}
          />
          <Field
            icon={<IconCalendar />}
            label="Date de validité"
            value={data.validityDate ? formatDateFR(data.validityDate) : "—"}
            maxChars={14}
            scale={fieldScale}
          />
        </div>

        <div className="card-qr-col">
          <div className="card-qr">
            {qr && libraryUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code d'abonnement" />
            ) : (
              <div className="card-qr-empty" />
            )}
          </div>
          {branding.qrHint ? (
            <p className="card-qr-hint">
              <span className="card-qr-scan">
                <IconPhone />
              </span>
              {branding.qrHint}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="card-footer">
        <svg className="card-gold-curve" viewBox="0 0 856 54" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 38 C180 8, 420 8, 620 28 S780 48, 856 22 L856 54 L0 54 Z" fill={primary} />
          <path d="M0 36 C180 6, 420 6, 620 26 S780 46, 856 20" fill="none" stroke={accent} strokeWidth="3.2" />
        </svg>
        {branding.showFooterMotto ? (
          <div className="card-footer-content">
            <span className="card-footer-book">
              <BookMarkIcon />
            </span>
            <span className="card-footer-motto">{branding.motto}</span>
          </div>
        ) : null}
        {branding.showMosque ? <MosqueSkyline className="card-mosque" color={primary} /> : null}
      </footer>
    </article>
  );
}

export function CardScaler({
  children,
  scale = 1,
}: {
  children: ReactNode;
  scale?: number;
}) {
  return (
    <div
      className="card-scaler"
      style={{
        width: `${85.6 * scale}mm`,
        height: `${53.98 * scale}mm`,
      }}
    >
      <div className="card-scaler-inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
