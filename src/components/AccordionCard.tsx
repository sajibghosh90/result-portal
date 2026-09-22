"use client";

import { useState } from "react";

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  badgeCount?: number;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AccordionCard({
  title,
  subtitle,
  badgeCount,
  icon = "📁",
  defaultOpen = false,
  children,
}: AccordionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 mb-4">
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50 transition"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-gray-800">{title}</h2>
              {badgeCount !== undefined && badgeCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {badgeCount}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Expand / Collapse Indicator Icon */}
        <div className="text-gray-400">
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && <div className="p-5 border-t border-gray-100 bg-gray-50/50">{children}</div>}
    </div>
  );
}