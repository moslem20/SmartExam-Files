import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ExamResult() {
  const router = useRouter();
  const { course } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Exam Completed!</Text>
      <Text style={styles.subtitle}>You have finished the {course} exam.</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/studentDashboard")}>
        <Text style={styles.buttonText}>Return to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A38", alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFD700", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#B0C4DE", marginBottom: 20 },
  button: { backgroundColor: "#E27C48", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
