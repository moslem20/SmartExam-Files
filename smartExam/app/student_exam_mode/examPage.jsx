import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ExamPage() {
  const router = useRouter();
  const { course, time, location, examId, title } = useLocalSearchParams();


  React.useEffect(() => {
    console.log("ExamPage params:", { course, time, location, examId });
    if (!examId) {
      console.warn("examId is undefined in ExamPage");
      Alert.alert(
        "Error",
        "Exam ID is missing. Please ensure the exam is selected properly."
      );
    }
  }, [examId, course, time, location]);

  const handleStartExam = () => {
    if (!examId) {
      Alert.alert("Error", "Exam ID is missing. Cannot start exam.");
      return;
    }
    router.push({
      pathname: "/student_exam_mode/questionPage",
      params: { examId, course },
    });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>
        📝 {course || "Unknown Course"} Exam
      </Text>
      {title && <Text style={styles.titleText}>📄 {title}</Text>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📌 Details</Text>
        <Text style={styles.detailText}>📘 Course: {course || "N/A"}</Text>
        {title && <Text style={styles.subDetailText}>🧾 Title: {title}</Text>}
        <Text style={styles.detailText}>🕓 Time: {time || "N/A"}</Text>
        <Text style={styles.detailText}>📍 Description: {location || "N/A"}</Text>
      </View>


      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📜 Instructions</Text>
        <Text style={styles.instructionText}>✔ Read each question carefully.</Text>
        <Text style={styles.instructionText}>✔ Select one option for MCQs.</Text>
        <Text style={styles.instructionText}>✔ Type clearly for open-ended.</Text>
        <Text style={styles.instructionText}>✔ Submit before the timer ends!</Text>
      </View>

      <TouchableOpacity
        style={[styles.startButton, !examId && styles.disabledButton]}
        onPress={handleStartExam}
        disabled={!examId}
      >
        <Text style={styles.startButtonText}>Start Exam</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
  padding: 20,
  alignItems: "center",
  justifyContent: "center",
},
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FDC500",
    textAlign: "center",
    marginBottom: 20,
  },
  scroll: {
  flex: 1,
  backgroundColor: "#1A1A2E", // same as container background
},
titleText: {
  fontSize: 18,
  fontWeight: "600",
  color: "#F7C59F",
  textAlign: "center",
  marginBottom: 12,
},


  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F7F7F7",
    marginBottom: 8,
  },

  subDetailText: {
  fontSize: 15,
  color: "#FFA500",
  fontWeight: "600",
  marginBottom: 4,
},

  detailText: {
    fontSize: 15,
    color: "#D3D3D3",
    marginVertical: 2,
  },
  instructionText: {
    fontSize: 14,
    color: "#B0C4DE",
    marginVertical: 3,
  },
  card: {
    backgroundColor: "#25274D",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  startButton: {
    marginTop: 10,
    backgroundColor: "#F77F00",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: "center",
  },
  disabledButton: {
    backgroundColor: "#888",
    opacity: 0.5,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
