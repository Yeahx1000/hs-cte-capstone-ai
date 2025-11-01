import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to create a typing animation effect
 * @param text - The text to animate
 * @param speed - Speed in milliseconds between each character (default: 20ms)
 * @param enabled - Whether to enable the animation (default: true)
 * @param onceOnly - If true, animation only runs once and subsequent text changes show immediately (default: false)
 * @returns The animated text with a blinking cursor
 */
export const useTypingAnimation = (
    text: string,
    speed: number = 20,
    enabled: boolean = true,
    onceOnly: boolean = false
) => {
    const [animatedText, setAnimatedText] = useState<string>("");
    const hasAnimatedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!enabled) {
            setAnimatedText(text);
            return;
        }

        if (onceOnly && hasAnimatedRef.current) {
            setAnimatedText(text);
            return;
        }

        hasAnimatedRef.current = true;

        let index = 0;
        const interval = setInterval(() => {
            if (index <= text.length) {
                setAnimatedText(
                    index < text.length
                        ? text.slice(0, index) + '▋'
                        : text
                );
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, enabled, onceOnly]);

    return animatedText;
};

