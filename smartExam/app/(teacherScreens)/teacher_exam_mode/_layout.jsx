import { Stack } from "expo-router";

export default function TeacherExamModeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides the top header
      }}
    >
      <Stack.Screen name="examsDash" options={{ title: "Teacher Exam Dashboard" }} />
      <Stack.Screen name="createExam" options={{ title: "Create Exam", headerShown: false, headerTintColor: "#704C9F" }} />
      <Stack.Screen name="addQuestions" options={{ title: "Add Questions", headerShown: false, headerTintColor: "#704C9F" }} />
      <Stack.Screen name="examsDetails" options={{ title: "Exam Details", headerShown: true, headerTintColor: "#704C9F" }} />
      <Stack.Screen name="examRes" options={{ title: "Exam Result", headerShown: true, headerTintColor: "#704C9F" }} />
      <Stack.Screen name="aiGenerate" options={{ title: "AI", headerShown: false, headerTintColor: "#1E3A70" }} />

      <Stack.Screen name="reports" options={{ title: "reports", headerShown: false, headerTintColor: "#1E3A70" }} />
    </Stack>
  );
}