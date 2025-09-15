/** @type {import('tailwindcss').Config} */
module.exports = {
  // В Tailwind 4 content не нужен!
  theme: {
    extend: {},
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
    'py-1',
    'py-2',
    'text-xs',
    'text-sm',
    'font-small',
    'transition',
  ],

}
