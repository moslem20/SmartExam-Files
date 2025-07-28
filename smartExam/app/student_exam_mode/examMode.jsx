import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const baseURL = "http://smartexam.somee.com/api";

export default function ExamMode() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [todayExam, setTodayExam] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [hasStartedExam, setHasStartedExam] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const userData = await AsyncStorage.getItem("loggedInUser");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === "student" && user.studentId) {
            setStudentId(user.studentId);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchStudentData();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        if (!studentId) return;

        const response = await axios.get(
          `${baseURL}/Classes/student/${studentId}/exams`,
          {
            headers: {
              Authorization: `Bearer ${await AsyncStorage.getItem("authToken")}`,
            },
          }
        );

        const examsData = response.data || [];

        const processedExams = examsData
          .map((exam) => ({
            examId: exam.ExamId || exam.examId,
            course: exam.course || exam.title,
            title: exam.title || "", 
            ExamDate: exam.ExamDate || exam.examDate,
            time: exam.time,
            description: exam.description || "TBD",
          }))
          .filter((exam) => !isNaN(new Date(exam.ExamDate).getTime()))
          .sort(
            (a, b) =>
              new Date(a.ExamDate).getTime() - new Date(b.ExamDate).getTime()
          );

        setExams(processedExams);
        const todayExamData = processedExams.find((exam) => {
          const examDate = new Date(exam.ExamDate).toISOString().split("T")[0];
          return examDate === todayDate;
        });
        setTodayExam(todayExamData);

        
      } catch (error) {
        console.error("Error fetching exams:", error);
        Alert.alert(
          "Error",
          `Failed to fetch exams: ${error.response?.data || error.message}`
        );
      }
    };

    fetchExams();
  }, [studentId, todayDate]);

  useEffect(() => {
  const checkExamStarted = async () => {
    if (todayExam && todayExam.examId) {
      const started = await AsyncStorage.getItem(`exam_started_${studentId}_${todayExam.examId}`);
      setHasStartedExam(started === "true");
    }
  };

  checkExamStarted();
}, [todayExam]);


  const handleStartExam = () => {
  if (!todayExam || !todayExam.examId) {
    Alert.alert("Error", "No valid exam available to start.");
    return;
  }

  Alert.alert(
    "Start Exam",
    "Are you sure you want to start this exam? You cannot retake it once started.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Start",
        onPress: async () => {
          await AsyncStorage.setItem(`exam_started_${studentId}_${todayExam.examId}`, "true");
          setHasStartedExam(true);
          router.push({
            pathname: "/student_exam_mode/examPage",
            params: {
              course: todayExam.course,
              time: todayExam.time,
              location: todayExam.description,
              examId: todayExam.examId,
              title: todayExam.title,
            },
          });
        },
      },
    ]
  );
};


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📘 Exam Mode</Text>

      {todayExam ? (
        <View style={styles.cardToday}>
          <Text style={styles.todayExamText}>📅 You have an exam today!</Text>
          <Text style={styles.examTitle}>{todayExam.course}</Text>
          {todayExam.title && (
            <Text style={styles.examSubtitle}>{todayExam.title}</Text>
          )}

          <Text style={styles.examDetail}>🕓 {todayExam.time}</Text>
          <Text style={styles.examDetail}>📜 {todayExam.description}</Text>

          {hasStartedExam ? (
            <Text style={styles.examDoneText}>✅ Exam already taken</Text>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={handleStartExam}>
              <Text style={styles.startButtonText}>Start Exam</Text>
            </TouchableOpacity>
          )}

        </View>
      ) : (
        <View style={styles.noExamBox}>
          <Text style={styles.noExamText}>✅ No exams today. Enjoy your free time!</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>📆 Upcoming Exams</Text>

      {exams.filter((e) => new Date(e.ExamDate).toISOString().split("T")[0] > todayDate).length === 0 ? (
        <Text style={styles.emptyState}>No upcoming exams found.</Text>
      ) : (
        exams
          .filter(
            (exam) =>
              new Date(exam.ExamDate).toISOString().split("T")[0] > todayDate
          )
          .map((item, index) => (
            <View style={styles.examCard} key={index}>
              <Text style={styles.examTitle}>{item.course}</Text>
              {item.title && (
                <Text style={styles.examSubtitle}>{item.title}</Text>
              )}
              <Text style={styles.examDetail}>📅 {item.ExamDate}</Text>
              <Text style={styles.examDetail}>🕓 {item.time}</Text>
              <Text style={styles.examDetail}>📜 {item.description}</Text>
            </View>

          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#F7F7F7",
    textAlign: "center",
    marginBottom: 20,
  },
  examSubtitle: {
  fontSize: 15,
  color: "#FFA500", // or "#F7C59F" or any other highlight
  fontWeight: "600",
  marginBottom: 4,
},

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F7F7F7",
    marginTop: 20,
    marginBottom: 10,
  },
  cardToday: {
    backgroundColor: "#3A0CA3",
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  todayExamText: {
    color: "#E0E0E0",
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "600",
  },
  examTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FDC500",
    marginBottom: 4,
  },
  examDetail: {
    fontSize: 14,
    color: "#D3D3D3",
    marginVertical: 2,
  },
  startButton: {
    marginTop: 12,
    backgroundColor: "#F77F00",
    paddingVertical: 10,
    borderRadius: 6,
  },
  startButtonText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  noExamBox: {
    backgroundColor: "#2C2C54",
    padding: 18,
    borderRadius: 10,
    marginBottom: 10,
  },
  noExamText: {
    color: "#B0BEC5",
    fontSize: 16,
    textAlign: "center",
  },
  examCard: {
    backgroundColor: "#25274D",
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },

  examDoneText: {
  marginTop: 12,
  fontSize: 16,
  fontWeight: "bold",
  color: "#00C853",
  textAlign: "center",
},

});
