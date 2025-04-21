import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ExamPage() {
  const router = useRouter();
  const { course, time, location, examId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{course} Exam</Text>
      <Text style={styles.sectionTitle}>📝 Exam Details:</Text>
      <Text style={styles.detailText}>📌 Course: {course}</Text>
      <Text style={styles.detailText}>⏰ Time: {time}</Text>
      <Text style={styles.detailText}>📍 Location: {location}</Text>

      <View style={styles.instructionsBox}>
        <Text style={styles.sectionTitle}>📜 Instructions:</Text>
        <Text style={styles.instructionText}>✅ Read each question carefully.</Text>
        <Text style={styles.instructionText}>✅ Multiple choice questions: Select one answer.</Text>
        <Text style={styles.instructionText}>✅ Open-ended questions: Type your response.</Text>
        <Text style={styles.instructionText}>✅ Submit before the timer ends!</Text>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push({ pathname: "/student_exam_mode/questionPage", params: { examId, course } })}
      >
        <Text style={styles.buttonText}>Start Exam</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A38", alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#FFD700", marginBottom: 20,  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", marginTop: 15,},
  detailText: { fontSize: 16, color: "#B0C4DE", marginVertical: 3, },
  instructionsBox: {
    backgroundColor: "#2C3E50",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginTop: 15,
  },
  instructionText: { fontSize: 14, color: "#B0C4DE", marginVertical: 2 },
  startButton: { marginTop: 20, backgroundColor: "#E27C48", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
