"use client";
import { useEffect, useRef, useState } from "react";

// Black Hole Background: I borrowed and slightly modified this animation from codepen.io
// Source: https://codepen.io/StarKnightt/pen/VYvZeom, felt like it was a good fit for the background.

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
        let collapse = false;
        let expanse = false;
        let returning = false;

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

        function rotate(cx: number, cy: number, x: number, y: number, angle: number) {
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

        class Star {
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

            constructor() {
                const rands: number[] = [];
                rands.push(Math.random() * (maxorbit / 2) + 1);
                rands.push(Math.random() * (maxorbit / 2) + maxorbit);

                this.orbital = rands.reduce((p, c) => p + c, 0) / rands.length;

                this.x = centerx;
                this.y = centery + this.orbital;

                this.yOrigin = centery + this.orbital;

                this.speed = (Math.floor(Math.random() * 2.5) + 1.5) * Math.PI / 180;
                this.rotation = 0;
                this.startRotation = (Math.floor(Math.random() * 360) + 1) * Math.PI / 180;

                this.id = stars.length;

                this.collapseBonus = this.orbital - maxorbit * 0.7;
                if (this.collapseBonus < 0) {
                    this.collapseBonus = 0;
                }

                this.color = getParticleColor(this.orbital);

                this.hoverPos = centery + maxorbit / 2 + this.collapseBonus;
                this.expansePos = centery + (this.id % 100) * -10 + (Math.floor(Math.random() * 20) + 1);

                this.prevR = this.startRotation;
                this.prevX = this.x;
                this.prevY = this.y;

                this.originalY = this.yOrigin;

                stars.push(this);
            }

            draw() {
                if (!expanse && !returning) {
                    this.rotation = this.startRotation + currentTime * this.speed;
                    if (!collapse) {
                        if (this.y > this.yOrigin) {
                            this.y -= 2.5;
                        }
                        if (this.y < this.yOrigin - 4) {
                            this.y += (this.yOrigin - this.y) / 10;
                        }
                    } else {
                        this.trail = 1;
                        if (this.y > this.hoverPos) {
                            this.y -= (this.hoverPos - this.y) / -5;
                        }
                        if (this.y < this.hoverPos - 4) {
                            this.y += 2.5;
                        }
                    }
                } else if (expanse && !returning) {
                    this.rotation = this.startRotation + currentTime * (this.speed / 2);
                    if (this.y > this.expansePos) {
                        this.y -= Math.floor(this.expansePos - this.y) / -80;
                    }
                } else if (returning) {
                    this.rotation = this.startRotation + currentTime * this.speed;
                    if (Math.abs(this.y - this.originalY) > 2) {
                        this.y += (this.originalY - this.y) / 50;
                    } else {
                        this.y = this.originalY;
                        this.yOrigin = this.originalY;
                    }
                }

                if (!context) return;

                context.save();
                context.fillStyle = this.color;
                context.strokeStyle = this.color;
                context.beginPath();
                const oldPos = rotate(centerx, centery, this.prevX, this.prevY, -this.prevR);
                context.moveTo(oldPos[0], oldPos[1]);
                context.translate(centerx, centery);
                context.rotate(this.rotation);
                context.translate(-centerx, -centery);
                context.lineTo(this.x, this.y);
                context.stroke();
                context.restore();

                this.prevR = this.rotation;
                this.prevX = this.x;
                this.prevY = this.y;
            }
        }

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
                const star = new Star();
                star.color = getParticleColor(star.orbital);
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

