/** @type {import('tailwindcss').Config} */
module.exports = {
  // В Tailwind 4 content не нужен!
  theme: {
    extend: {
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'fade-in-out': {
          '0%': { opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in-out': 'fade-in-out 6s ease-in-out forwards',
        sway: 'sway 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-green-200',
    'hover:bg-green-100',
    'active:scale-95',
    'text-black',
    'bg-white',
    'border',
    'rounded-full',
    'px-3',
    'px-12',
    'py-1',
    'py-2',
    'text-xs',
    'text-sm',
    'font-small',
    'transition',
    'top-1/2',
    'left-1/2',
    '-translate-x-1/2',
    '-translate-y-1/2',
    'animate-fade-in-out',
    'animate-sway',
    'max-w-sm',
    'text-center',
    'shadow-xl',
  ],
};
