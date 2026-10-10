"use client";

import { useEffect, useState } from "react";

type Lang = "bn" | "en";
const COOKIE = "googtrans";

function readLang(): Lang {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(COOKIE + "="));
  const val = raw ? decodeURIComponent(raw.split("=")[1] || "") : "";
  return val === "/bn/en" ? "en" : "bn";
}

function setLang(lang: Lang) {
  if (lang === "en") {
    document.cookie = `${COOKIE}=/bn/en; path=/`;
  } else {
    const past = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `${COOKIE}=; ${past}; path=/`;
    document.cookie = `${COOKIE}=; ${past}; path=/; domain=${location.hostname}`;
  }
  location.reload();
}

export default function LanguageToggle() {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    const current = readLang();
    setLangState(current);
    if (current !== "en") return;

    const proto = Node.prototype as any;
    if (!proto.__gtPatched) {
      const origRemove = proto.removeChild;
      const origInsert = proto.insertBefore;
      proto.removeChild = function (child: Node) {
        if (child.parentNode !== this) return child;
        return origRemove.apply(this, arguments);
      };
      proto.insertBefore = function (newNode: Node, ref: Node | null) {
        if (ref && ref.parentNode !== this) return newNode;
        return origInsert.apply(this, arguments);
      };
      proto.__gtPatched = true;
    }

    (window as any).googleTranslateElementInit = () => {
      const g = (window as any).google;
      new g.translate.TranslateElement(
        { pageLanguage: "bn", includedLanguages: "en,bn", autoDisplay: false },
        "google_translate_element"
      );
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const btn = (active: boolean) =>
    `px-3 py-1 rounded-md text-xs font-bold transition ${
      active ? "bg-amber-400 text-slate-900" : "text-slate-300 hover:text-white"
    }`;

  return (
    <div className="notranslate print:hidden bg-slate-900 border-b border-slate-700/60" translate="no">
      <div className="flex items-center justify-end gap-1 px-3 py-1">
        <span className="text-[11px] text-slate-400 mr-1">🌐</span>
        <button type="button" onClick={() => lang !== "bn" && setLang("bn")} className={btn(lang === "bn")}>
          বাংলা
        </button>
        <button type="button" onClick={() => lang !== "en" && setLang("en")} className={btn(lang === "en")}>
          English
        </button>
      </div>
      <div id="google_translate_element" style={{ position: "absolute", left: "-9999px", top: 0, height: 0, overflow: "hidden" }} />
    </div>
  );
}
