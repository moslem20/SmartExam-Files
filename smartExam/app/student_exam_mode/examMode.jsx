import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ExamMode() {
  const router = useRouter();
  const [exams, setExams] = useState({});
  const [todayExam, setTodayExam] = useState(null);
  const todayDate = new Date().toISOString().split("T")[0]; // Get today's date

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const storedExams = await AsyncStorage.getItem("examData");
        if (storedExams) {
          const parsedExams = JSON.parse(storedExams);
          setExams(parsedExams);

          // Check if there's an exam today
          if (parsedExams[todayDate]) {
            setTodayExam(parsedExams[todayDate]);
          }
        }
      } catch (error) {
        console.error("Error fetching exams:", error);
      }
    };

    fetchExams();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Exam Mode</Text>

      {todayExam ? (
        <View style={styles.examNowBox}>
          <Text style={styles.examNowText}>📢 You have an exam today!</Text>
          <Text style={styles.examNowDetails}>📌 {todayExam.course}</Text>
          <Text style={styles.examNowDetails}>⏰ {todayExam.time}</Text>
          <TouchableOpacity
            style={styles.startExamButton}
            onPress={() =>
              router.push({
                pathname: "/student_exam_mode/examPage",
                params: {
                  course: todayExam.course,
                  time: todayExam.time,
                  location: todayExam.location,
                },
              })
            }
          >
            <Text style={styles.buttonText}>Start Exam</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noExamBox}>
          <Text style={styles.noExamText}>✅ No exams for today! Enjoy your free time. 🎉</Text>
        </View>
      )}

      <Text style={styles.subHeader}>Upcoming Exams</Text>
      <FlatList
        data={Object.entries(exams).filter(([date]) => date > todayDate)}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => {
          const date = item[0];
          const { course, time } = item[1];

          return (
            <View style={styles.examCard}>
              <Text style={styles.examTitle}>{course}</Text>
              <Text style={styles.examInfo}>📅 {date}</Text>
              <Text style={styles.examInfo}>⏰ {time}</Text>
            </View>
          );
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A38", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 20 },
  subHeader: { fontSize: 20, fontWeight: "bold", color: "#fff", marginTop: 20, marginBottom: 10 },
  examNowBox: {
    backgroundColor: "#335ACF",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  examNowText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  examNowDetails: { fontSize: 16, color: "#fff", marginVertical: 3 },
  startExamButton: { marginTop: 10, backgroundColor: "#E27C48", paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  noExamBox: {
    backgroundColor: "#2C3E50",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  noExamText: { fontSize: 16, color: "#B0C4DE", fontWeight: "bold" },
  examCard: { backgroundColor: "#2C3E50", padding: 15, borderRadius: 10, marginVertical: 5 },
  examTitle: { fontSize: 18, fontWeight: "bold", color: "#FFD700" },
  examInfo: { fontSize: 14, color: "#B0C4DE", marginTop: 3 },
});

