import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,

} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker"
import { Platform } from "react-native";



export default function Reports() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");

  const baseURL = "http://smartexam.somee.com/api";

  useEffect(() => {
    const initialize = async () => {
      try {
        const loggedInUser = await AsyncStorage.getItem("loggedInUser");
        const user = JSON.parse(loggedInUser);

        if (!user || user.role !== "teacher") {
          Alert.alert("Error", "You must be a teacher to access this page.");
          navigation.goBack();
          return;
        }

        setTeacherEmail(user.email);
        await fetchClasses(user.email);
      } catch (error) {
        console.error("Error initializing Reports:", error);
        Alert.alert("Error", "Failed to initialize reports.");
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchClasses = async (email) => {
    try {
      const response = await fetch(`${baseURL}/Classes/teacher/${email.toLowerCase()}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch classes failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0].id);
        await fetchExams(data[0].id, email);
      } else {
        setExams([]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      Alert.alert("Error", "Failed to fetch classes.");
      setLoading(false);
    }
  };

  const fetchExams = async (classId, email) => {
    try {
      const response = await fetch(`${baseURL}/Classes/teacher/${email.toLowerCase()}/exams`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch exams failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const classExams = data.filter((exam) => exam.classId === classId);
      setExams(classExams);
      if (classExams.length > 0) {
        setSelectedExamId(classExams[0].examId.toString());
      } else {
        setSelectedExamId("");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching exams:", error);
      Alert.alert("Error", "Failed to fetch exams.");
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    setSelectedClassId(classId);
    setSelectedExamId("");
    setLoading(true);
    await fetchExams(classId, teacherEmail);
  };

  const generateCSV = (data, headers, filename) => {
    const escapeCSV = (value) => {
      if (value == null) return "";
      const str = value.toString();
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.map(escapeCSV).join(",")];
    data.forEach((row) => {
      const values = headers.map((header) => escapeCSV(row[header]));
      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadQuestions = async () => {
    if (!selectedExamId) {
      Alert.alert("Error", "Please select an exam.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${baseURL}/Questions/by-exam/${selectedExamId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch questions failed: ${response.status} - ${errorText}`);
      }

      const questions = await response.json();
      const headers = [
        "QuestionId",
        "QuestionText",
        "QuestionType",
        "Options",
        "CorrectAnswer",
        "IsTrue",
        "Pairs",
        "ImageUrl",
        "TimeLimit",
      ];

      const data = questions.map((q) => ({
        QuestionId: q.questionId,
        QuestionText: q.questionText || "N/A",
        QuestionType: q.questionType || "N/A",
        Options: q.options || "",
        CorrectAnswer: q.correctAnswer || "",
        IsTrue: q.isTrue != null ? q.isTrue.toString() : "",
        Pairs: q.pairs ? JSON.stringify(q.pairs) : "",
        ImageUrl: q.imageUrl || "",
        TimeLimit: q.timeLimit || "30",
      }));

      generateCSV(data, headers, `Exam_Questions_${selectedExamId}.csv`);
    } catch (error) {
      console.error("Error fetching questions:", error);
      Alert.alert("Error", "Failed to fetch exam questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAnswers = async () => {
    if (!selectedExamId) {
      Alert.alert("Error", "Please select an exam.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${baseURL}/Questions/answers/by-exam/${selectedExamId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch answers failed: ${response.status} - ${errorText}`);
      }

      const answers = await response.json();
      const headers = [
        "AnswerId",
        "QuestionId",
        "StudentId",
        "AnswerText",
        "SelectedOption",
        "IsTrue",
        "MatchingPairs",
        "SubmittedDate",
        "Grade",
      ];

      const data = answers.map((a) => ({
        AnswerId: a.answerId || "N/A",
        QuestionId: a.questionId || "N/A",
        StudentId: a.studentId || "N/A",
        AnswerText: a.answerText || "No answer provided",
        SelectedOption: a.selectedOption || "",
        IsTrue: a.isTrue != null ? a.isTrue.toString() : "",
        MatchingPairs: a.matchingPairs ? JSON.stringify(a.matchingPairs) : "",
        SubmittedDate: a.submittedDate ? new Date(a.submittedDate).toLocaleString() : "N/A",
        Grade: a.grade != null ? a.grade.toString() : "N/A",
      }));

      generateCSV(data, headers, `Student_Answers_${selectedExamId}.csv`);
    } catch (error) {
      console.error("Error fetching answers:", error);
      Alert.alert("Error", "Failed to fetch student answers.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadGrades = async () => {
    if (!selectedExamId) {
      Alert.alert("Error", "Please select an exam.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${baseURL}/Grades/exam/${selectedExamId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch grades failed: ${response.status} - ${errorText}`);
      }

      const grades = await response.json();
      const headers = ["GradeId", "StudentId", "CourseName", "Grade", "ExamId"];

      const data = grades.map((g) => ({
        GradeId: g.gradeId || "N/A",
        StudentId: g.studentId || "N/A",
        CourseName: g.courseName || "N/A",
        Grade: g.grade != null ? g.grade.toString() : "N/A",
        ExamId: g.examId || "N/A",
      }));

      generateCSV(data, headers, `Class_Grades_${selectedExamId}.csv`);
    } catch (error) {
      console.error("Error fetching grades:", error);
      Alert.alert("Error", "Failed to fetch class grades.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Generate Reports</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={styles.card}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.label}>Select Class</Text>
            <Picker
              selectedValue={selectedClassId}
              style={styles.picker}
              onValueChange={(value) => handleClassChange(value)}
            >
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <Picker.Item
                    key={cls.id}
                    label={cls.courseName || cls.id}
                    value={cls.id}
                  />
                ))
              ) : (
                <Picker.Item label="No classes available" value="" />
              )}
            </Picker>
          </View>

          <View style={styles.dropdownContainer}>
            <Text style={styles.label}>Select Exam</Text>
            <Picker
              selectedValue={selectedExamId}
              style={styles.picker}
              onValueChange={(value) => setSelectedExamId(value)}
            >
              {exams.length > 0 ? (
                exams.map((exam) => (
                  <Picker.Item
                    key={exam.examId}
                    label={`${exam.title} (${exam.examDate})`}
                    value={exam.examId.toString()}
                  />
                ))
              ) : (
                <Picker.Item label="No exams available" value="" />
              )}
            </Picker>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadQuestions}
              disabled={!selectedExamId}
            >
              <Text style={styles.actionButtonText}>Download Exam Questions CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadAnswers}
              disabled={!selectedExamId}
            >
              <Text style={styles.actionButtonText}>Download Student Answers CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadGrades}
              disabled={!selectedExamId}
            >
              <Text style={styles.actionButtonText}>Download Class Grades CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.actionButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F4F6F9", // light background
    alignItems: "center",
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 20,
  },
  dropdownContainer: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#444",
    marginBottom: 6,
  },
  picker: {
  backgroundColor: "#1E3A70",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#ccc",
  paddingVertical: Platform.OS === "android" ? 4 : 12,
  paddingHorizontal: Platform.OS === "android" ? 8 : 14,
  fontSize: 16,
  color: "#333",
},

  buttonContainer: {
    marginTop: 20,
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#335ACF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  backButton: {
    backgroundColor: "#9CA3AF", // Tailwind gray-400
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
