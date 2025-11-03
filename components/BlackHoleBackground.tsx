"use client";
import { useEffect, useRef, useState } from "react";

// Black Hole Background: I borrowed and slightly modified this animation from codepen.io
// Source: https://codepen.io/StarKnightt/pen/VYvZeom, felt like it was a good fit for the background.

interface Star {
    orbital: number;
    x: number;
    y: number;
    yOrigin: number;
    speed: number;
    rotation: number;
    startRotation: number;
    id: number;
    collapseBonus: number;
    color: string;
    hoverPos: number;
    expansePos: number;
    prevR: number;
    prevX: number;
    prevY: number;
    originalY: number;
    trail?: number;
    draw: () => void;
}

const createStar = (
    maxorbit: number,
    centerx: number,
    centery: number,
    getParticleColor: (orbital: number) => string,
    stars: Star[],
    getCurrentTime: () => number,
    getCollapse: () => boolean,
    getExpanse: () => boolean,
    getReturning: () => boolean,
    context: CanvasRenderingContext2D,
    rotate: (cx: number, cy: number, x: number, y: number, angle: number) => [number, number]
): Star => {
    const rands: number[] = [];
    rands.push(Math.random() * (maxorbit / 2) + 1);
    rands.push(Math.random() * (maxorbit / 2) + maxorbit);

    const orbital = rands.reduce((p, c) => p + c, 0) / rands.length;
    const star: Star = {
        orbital,
        x: centerx,
        y: centery + orbital,
        yOrigin: centery + orbital,
        speed: (Math.floor(Math.random() * 2.5) + 1.5) * Math.PI / 180,
        rotation: 0,
        startRotation: (Math.floor(Math.random() * 360) + 1) * Math.PI / 180,
        id: stars.length,
        collapseBonus: 0,
        color: getParticleColor(orbital),
        hoverPos: 0,
        expansePos: 0,
        prevR: 0,
        prevX: centerx,
        prevY: centery + orbital,
        originalY: centery + orbital,
        draw() {
            const currentTime = getCurrentTime();
            const collapse = getCollapse();
            const expanse = getExpanse();
            const returning = getReturning();

            if (!expanse && !returning) {
                star.rotation = star.startRotation + currentTime * star.speed;
                if (!collapse) {
                    if (star.y > star.yOrigin) {
                        star.y -= 2.5;
                    }
                    if (star.y < star.yOrigin - 4) {
                        star.y += (star.yOrigin - star.y) / 10;
                    }
                } else {
                    star.trail = 1;
                    if (star.y > star.hoverPos) {
                        star.y -= (star.hoverPos - star.y) / -5;
                    }
                    if (star.y < star.hoverPos - 4) {
                        star.y += 2.5;
                    }
                }
            } else if (expanse && !returning) {
                star.rotation = star.startRotation + currentTime * (star.speed / 2);
                if (star.y > star.expansePos) {
                    star.y -= Math.floor(star.expansePos - star.y) / -80;
                }
            } else if (returning) {
                star.rotation = star.startRotation + currentTime * star.speed;
                if (Math.abs(star.y - star.originalY) > 2) {
                    star.y += (star.originalY - star.y) / 50;
                } else {
                    star.y = star.originalY;
                    star.yOrigin = star.originalY;
                }
            }

            if (!context) return;

            context.save();
            context.fillStyle = star.color;
            context.strokeStyle = star.color;
            context.beginPath();
            const oldPos = rotate(centerx, centery, star.prevX, star.prevY, -star.prevR);
            context.moveTo(oldPos[0], oldPos[1]);
            context.translate(centerx, centery);
            context.rotate(star.rotation);
            context.translate(-centerx, -centery);
            context.lineTo(star.x, star.y);
            context.stroke();
            context.restore();

            star.prevR = star.rotation;
            star.prevX = star.x;
            star.prevY = star.y;
        }
    };

    star.collapseBonus = star.orbital - maxorbit * 0.7;
    if (star.collapseBonus < 0) {
        star.collapseBonus = 0;
    }

    star.hoverPos = centery + maxorbit / 2 + star.collapseBonus;
    star.expansePos = centery + (star.id % 100) * -10 + (Math.floor(Math.random() * 20) + 1);
    star.prevR = star.startRotation;

    return star;
};

const BlackHoleBackground = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
        };

        checkTheme();
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => checkTheme();
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const maxorbit = 255;

        let cw = container.offsetWidth;
        let ch = container.offsetHeight;
        let centerx = cw / 2;
        let centery = ch / 2;

        const startTime = new Date().getTime();
        let currentTime = 0;
        let animationFrameId: number;

        const stars: Star[] = [];
        const collapse = false;
        const expanse = false;
        const returning = false;

        const getBackgroundColor = (alpha: number) => {
            return isDarkMode
                ? `rgba(25,25,25,${alpha})`
                : `rgba(245,245,245,${alpha})`;
        };

        const getParticleColor = (orbital: number) => {
            const opacity = 1 - (orbital / 255);
            return isDarkMode
                ? `rgba(255,255,255,${opacity})`
                : `rgba(25,25,25,${opacity})`;
        };

        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        container.appendChild(canvas);
        const context = canvas.getContext("2d");

        if (!context) return;

        context.globalCompositeOperation = "multiply";

        function setDPI(canvas: HTMLCanvasElement, dpi: number) {
            const scaleFactor = dpi / 96;
            canvas.width = Math.ceil(cw * scaleFactor);
            canvas.height = Math.ceil(ch * scaleFactor);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.scale(scaleFactor, scaleFactor);
            }
        }

        function rotate(cx: number, cy: number, x: number, y: number, angle: number): [number, number] {
            const radians = angle;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const nx = cos * (x - cx) + sin * (y - cy) + cx;
            const ny = cos * (y - cy) - sin * (x - cx) + cy;
            return [nx, ny];
        }

        function updateDimensions() {
            cw = container.offsetWidth;
            ch = container.offsetHeight;
            centerx = cw / 2;
            centery = ch / 2;
            setDPI(canvas, 192);
        }

        updateDimensions();

        const handleResize = () => {
            updateDimensions();
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        window.addEventListener("resize", handleResize);

        function loop() {
            const now = new Date().getTime();
            currentTime = (now - startTime) / 50;

            if (!context) return
            context.fillStyle = getBackgroundColor(0.2);
            context.fillRect(0, 0, cw, ch);

            for (let i = 0; i < stars.length; i++) {
                if (stars[i] !== undefined) {
                    stars[i].draw();
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        }

        function init() {
            if (!context) return
            context.fillStyle = getBackgroundColor(1);
            context.fillRect(0, 0, cw, ch);

            for (let i = 0; i < 2500; i++) {
                const star = createStar(
                    maxorbit,
                    centerx,
                    centery,
                    getParticleColor,
                    stars,
                    () => currentTime,
                    () => collapse,
                    () => expanse,
                    () => returning,
                    context,
                    rotate
                );
                star.color = getParticleColor(star.orbital);
                stars.push(star);
            }

            loop();
        }

        init();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            resizeObserver.disconnect();
            if (canvas.parentNode) {
                container.removeChild(canvas);
            }
        };
    }, [isDarkMode]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
};

export default BlackHoleBackground;

