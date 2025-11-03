"use client";
import { useRef, useEffect, useState } from "react";

interface SuggestionChipsProps {
    suggestions: string[];
    onSuggestionClick: (suggestion: string) => void;
    disabled?: boolean;
}

function SuggestionChips({ suggestions, onSuggestionClick, disabled = false }: SuggestionChipsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Check if we can scroll and update indicators
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const updateScrollState = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setCanScrollLeft(scrollLeft > 10);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        };

        updateScrollState();
        container.addEventListener("scroll", updateScrollState);

        // Also check on resize
        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(container);

        return () => {
            container.removeEventListener("scroll", updateScrollState);
            resizeObserver.disconnect();
        };
    }, [suggestions]);

    const scrollLeft = () => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollBy({ left: -200, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollBy({ left: 200, behavior: "smooth" });
        }
    };

    if (suggestions.length === 0 || disabled) {
        return null;
    }

    return (
        <div className="relative w-full mb-3">
            {/* Left scroll arrow */}
            {canScrollLeft && (
                <button
                    onClick={scrollLeft}
                    className="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#2A2A2A] border border-[#E0E8E3] dark:border-[#2F3A30] shadow-md hover:bg-[#FAFCFB] dark:hover:bg-[#333D35] flex items-center justify-center transition-all"
                    aria-label="Scroll left"
                >
                    <svg
                        className="w-4 h-4 text-gray-600 dark:text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Container with masking to show partial chip */}
            <div className="overflow-hidden relative mx-8">
                {/* Left fade gradient */}
                {canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-linear-to-r from-white dark:from-[#1A1A1A] to-transparent pointer-events-none z-10" />
                )}

                {/* Scrollable container - allows chips to extend beyond visible area */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-2 overflow-x-auto hide-scrollbar px-2"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => !disabled && onSuggestionClick(suggestion)}
                            disabled={disabled}
                            className="cursor-pointer shrink-0 px-4 py-2 bg-[#F5F7F6] dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 border border-[#E0E8E3] dark:border-[#2F3A30] rounded-full text-sm font-medium hover:bg-[#EEF2F0] dark:hover:bg-[#333D35] active:bg-[#E8F0EB] dark:active:bg-[#3A453C] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>

                {/* Right fade gradient */}
                {canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-white dark:from-[#1A1A1A] to-transparent pointer-events-none z-10" />
                )}
            </div>

            {/* Right scroll arrow */}
            {canScrollRight && (
                <button
                    onClick={scrollRight}
                    className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#2A2A2A] border border-[#E0E8E3] dark:border-[#2F3A30] shadow-md hover:bg-[#FAFCFB] dark:hover:bg-[#333D35] flex items-center justify-center transition-all"
                    aria-label="Scroll right"
                >
                    <svg
                        className="w-4 h-4 text-gray-600 dark:text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default SuggestionChips;

