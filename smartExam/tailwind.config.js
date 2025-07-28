// C:\Users\Hamody\OneDrive\Desktop\פרויקט גמר\smartExam-React\smartExam\tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',                // All app files
    './app/(studentScreens)/**/*.{js,jsx,ts,tsx}', // Explicitly include studentScreens
    './components/**/*.{js,jsx,ts,tsx}',         // If you have components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};