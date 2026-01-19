/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#269c92",
                "primary-dark": "#1d7c74",
                "background-light": "#fafaf9",
                "background-dark": "#181a1b",
                "surface-light": "#ffffff",
                "surface-dark": "#22252a",
                "text-main": "#101918",
                "text-muted": "#578e8a",
                "danger": "#ef4444",
                "warning": "#f59e0b",
                "success": "#10b981",
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"],
                "body": ["Inter", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "2xl": "2rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
