import { Stack } from "expo-router";
import 'react-native-url-polyfill/auto';


export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f4511e",
          elevation: 5, // Shadow for Android
          shadowColor: "#000", // Shadow for iOS
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 20,
          letterSpacing: 1,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="screens/login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="screens/register"
        options={{ headerShown: false }}
      />

      <Stack.Screen name="(studentScreens)" options={{ headerShown: false }} />

      <Stack.Screen name="student_exam_mode" options={{ headerShown: false }} />

      <Stack.Screen name="(teacherScreens)" options={{ headerShown: false }} />



    </Stack>
  );
}