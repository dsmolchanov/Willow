/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{ts,tsx}', // Added from proposed config
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif']
      },
      keyframes: {
        soundWave: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        "zoom-in": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" }
        },
        moveHorizontal: {
          "0%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
          "50%": {
            transform: "translateX(50%) translateY(10%)",
          },
          "100%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
        },
        moveInCircle: {
          "0%": {
            transform: "rotate(0deg)",
          },
          "50%": {
            transform: "rotate(180deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
        moveVertical: {
          "0%": {
            transform: "translateY(-50%)",
          },
          "50%": {
            transform: "translateY(50%)",
          },
          "100%": {
            transform: "translateY(-50%)",
          },
        },
      },
      animation: {
        soundWave: 'soundWave 0.5s ease-in-out infinite',
        "fade-in": "fade-in 300ms ease-out",
        "zoom-in": "zoom-in 300ms ease-out",
        first: "moveVertical 30s ease infinite",
        second: "moveInCircle 20s reverse infinite",
        third: "moveInCircle 40s linear infinite",
        fourth: "moveHorizontal 40s ease infinite",
        fifth: "moveInCircle 20s ease infinite",
      },
      colors: {
        willow: {
          primary: '#5DCFA1',
          light: '#7DDBB6',
          dark: '#4BB88A'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        'menu-bg': '#151516',
        'menu-text': {
          DEFAULT: '#FEFEFE',
          secondary: '#A4A5A6'
        },
        'menu-gray': {
          '50': '#D1D1D2',
          '100': '#B1B1B2',
          '200': '#919192',
          '300': '#717172',
          '400': '#515152',
          '500': '#313132',
          '600': '#2A2A2B',
          '700': '#232324',
          '800': '#1C1C1D',
          '900': '#151516'
        },
        'menu-white': {
          '100': '#FFFFFF',
          '200': '#F7F7F7',
          DEFAULT: '#FEFEFE'
        },
        'menu-frames': '#0A0A0A',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        gradient: {
          'bg-start': 'rgb(20, 32,40)',
          'bg-end': 'rgb(10, 16,20)',
          'orb': {
            'primary': 'rgb(93, 207, 161)',
            'light': 'rgb(125, 219,182)',
            'dark': 'rgb(75, 184, 138)',
          }
        }
      },
      fontSize: {
        'secondary-text': ['14px', '20px'],
        'text-16': ['16px', '24px'],
        'h3-20': ['20px', '28px'],
        'h3-medium-20': ['20px', '28px'],
        'text-16-bold': ['16px', '24px']
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700'
      },
      backgroundImage: {
        'gradient-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
        'gradient-radial': 'radial-gradient(circleat center, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(40deg, var(--gradient-bg-start), var(--gradient-bg-end))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      mixBlendMode: {
        'soft-light': 'soft-light',
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    // Add any other plugins you might need
  ],
};
