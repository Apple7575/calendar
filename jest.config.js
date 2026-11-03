module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns:["/node_modules/","[/\\\\]\\.expo[/\\\\]"],
  modulePathIgnorePatterns:["[/\\\\]\\.expo[/\\\\]"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*)",
  ],
};
