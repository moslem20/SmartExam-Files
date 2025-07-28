import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseURL } from "../../baseUrl";

export default function Grades() {
  const [grades, setGrades] = useState([]);
  const [gpa, setGPA] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const loggedInUser = await AsyncStorage.getItem("loggedInUser");
        const user = JSON.parse(loggedInUser);

        if (!user.studentId) {
          console.error("User ID not found in AsyncStorage");
          setLoading(false);
          return;
        }

        const response = await fetch(`${baseURL}/Grades/student/${user.studentId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        setGrades(data);
        calculateGPA(data);
      } catch (error) {
        console.error("Error fetching grades:", error);
        Alert.alert("Error", "Failed to fetch grades.");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const calculateGPA = async (grades) => {
    let gpa = "0.00";

    if (grades.length > 0) {
      const total = grades.reduce((sum, item) => sum + item.grade, 0);
      gpa = (total / grades.length).toFixed(2);
    }

    try {
      await AsyncStorage.setItem("userGPA", gpa);
    } catch (error) {
      console.error("Error saving GPA:", error);
    }

    setGPA(gpa);
  };

  const handleAppealSubmit = async () => {
    if (!selectedGradeId || !messageText.trim()) {
      Alert.alert("Error", "Please select a grade and enter a message.");
      return;
    }

    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      const user = JSON.parse(loggedInUser);

      const response = await fetch(`${baseURL}/Grades/${selectedGradeId}/appeal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          studentId: user.studentId,
          messageText: messageText
        })
      });

      const responseText = await response.text();
      console.log("Appeal Response:", responseText);

      if (!response.ok) {
        throw new Error(responseText);
      }

      Alert.alert("Success", "Appeal submitted successfully!");
      setModalVisible(false);
      setSelectedGradeId(null);
      setMessageText("");
    } catch (error) {
      console.error("Error submitting appeal:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to submit appeal.");
    }
  };

  const handleViewFeedback = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      const user = JSON.parse(loggedInUser);

      if (!user.studentId) {
        console.error("User ID not found in AsyncStorage");
        Alert.alert("Error", "Student ID not found. Please log in again.");
        return;
      }

      const response = await fetch(`${baseURL}/Grades/feedback/student/${user.studentId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const sortedFeedbacks = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setFeedbacks(sortedFeedbacks);

      setFeedbackModalVisible(true);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to fetch feedback.");
    }
  };

  const handleViewAnswers = async (examId, gradeId) => {
    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      const user = JSON.parse(loggedInUser);

      if (!user.studentId) {
        console.error("User ID not found in AsyncStorage");
        Alert.alert("Error", "Student ID not found. Please log in again.");
        return;
      }

      // Fetch ClassExamId
      const classExamResponse = await fetch(`${baseURL}/ClassExams/exam/${examId}/class-exam-id`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });

      if (!classExamResponse.ok) {
        const errorText = await classExamResponse.text();
        throw new Error(`Fetch ClassExamId failed: ${classExamResponse.status} - ${errorText}`);
      }

      const classExamId = await classExamResponse.json();
      if (!classExamId) {
        throw new Error("No ClassExamId returned for the provided ExamId.");
      }

      // Fetch questions
      let questions = [];
      try {
        const questionsResponse = await fetch(`${baseURL}/Questions/by-exam/${examId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        });
        if (!questionsResponse.ok) {
          const errorText = await questionsResponse.text();
          throw new Error(`Fetch questions failed: ${questionsResponse.status} - ${errorText}`);
        }
        questions = await questionsResponse.json();
      } catch (error) {
        console.warn("No questions found for exam:", error.message);
        questions = [];
      }

      // Fetch student answers
      const answersResponse = await fetch(`${baseURL}/Questions/answers/by-exam/${classExamId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });

      if (!answersResponse.ok) {
        const errorText = await answersResponse.text();
        throw new Error(`Fetch answers failed: ${answersResponse.status} - ${errorText}`);
      }

      const answers = await answersResponse.json();
      const studentAnswers = answers.filter((answer) => answer.studentId.toLowerCase() === user.studentId.toLowerCase());

      // Map answers to questions
      const formattedAnswers = questions.map((question) => {
        const qId = question.questionId.toLowerCase();
        const answer = studentAnswers.find((a) => a.questionId.toLowerCase() === qId);
        let studentAnswerText = "No answer provided";

        if (answer && answer.answerText != null) {
          if (question.questionType?.toLowerCase() === "mc") {
            const options = typeof question.options === "string"
              ? question.options.split(",").map((opt) => opt.trim())
              : [];
            const selectedOption = options.find(
              (opt) => opt.toLowerCase() === answer.answerText.trim().toLowerCase()
            );
            studentAnswerText = selectedOption || answer.answerText;
          } else {
            studentAnswerText = answer.answerText;
          }
        }

        const correctAnswerText =
          question.questionType?.toLowerCase() === "truefalse"
            ? question.isTrue != null
              ? question.isTrue.toString()
              : "Not specified"
            : question.correctAnswer || "Not specified";

        // Determine if the answer is correct
        const isCorrect =
          studentAnswerText === "No answer provided" || correctAnswerText === "Not specified"
            ? null
            : studentAnswerText.toLowerCase() === correctAnswerText.toLowerCase();

        return {
          questionId: question.questionId,
          questionText: question.questionText || "No question text available",
          studentAnswer: studentAnswerText,
          correctAnswer: correctAnswerText,
          grade: answer?.grade ? answer.grade.toString() : "N/A",
          answerId: answer?.answerId || `${user.studentId}-${question.questionId}-${Date.now()}`,
          isCorrect,
        };
      });

      // Fallback if no questions
      const fallbackAnswers = studentAnswers.map((answer) => ({
        questionId: answer.questionId,
        questionText: "Question text not available",
        studentAnswer: answer.answerText || "No answer provided",
        correctAnswer: "Not specified",
        grade: answer.grade ? answer.grade.toString() : "N/A",
        answerId: answer.answerId || `${user.studentId}-${answer.questionId}-${Date.now()}`,
        isCorrect:
          answer.answerText && answer.answerText !== "No answer provided"
            ? answer.answerText.toLowerCase() === "Not specified" ? null : false
            : null,
      }));

      const answersToUse = formattedAnswers.length > 0 ? formattedAnswers : fallbackAnswers;

      setSelectedAnswers(answersToUse);
      setSelectedExamId(examId);
      setSelectedGradeId(gradeId);
      setAnswersModalVisible(true);
    } catch (error) {
      console.error("Error fetching answers:", error);
      Alert.alert("Error", error.message || "Failed to fetch answers.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Your Grades</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Course</Text>
            <Text style={styles.headerText}>Grade</Text>
            <Text style={styles.headerText}>Action</Text>
          </View>

          <ScrollView style={styles.scrollableTable}>
            {grades.length > 0 ? (
              grades.map((item, index) => (
                <View key={index.toString()} style={styles.tableRow}>
                  <Text style={styles.cellText}>{item.courseName || item.courseCode || "N/A"}</Text>
                  <Text style={styles.cellText}>{item.grade}</Text>
                  <View style={styles.cellAction}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewAnswers(item.examId, item.gradeId)}
                    >
                      <Text style={styles.actionButtonText}>View Answers</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No grades available</Text>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.gpaContainer}>
        <Text style={styles.sectionTitle}>Your GPA</Text>
        <View style={styles.gpaBox}>
          <Text style={styles.gpaText}>{gpa}</Text>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.optionBox} onPress={handleViewFeedback}>
          <Ionicons name="chatbox-outline" size={40} color="#E27C48" />
          <Text style={styles.optionText}>Feedbacks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionBox} onPress={() => setModalVisible(true)}>
          <Ionicons name="megaphone-outline" size={40} color="#E27C48" />
          <Text style={styles.optionText}>Appeals</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for appeal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit an Appeal</Text>
            <View style={styles.gradeGrid}>
              {grades.map((grade) => (
                <TouchableOpacity
                  key={grade.gradeId}
                  style={[styles.gradeItemGrid, selectedGradeId === grade.gradeId && styles.gradeItemSelected]}
                  onPress={() => setSelectedGradeId(grade.gradeId)}
                >
                  <Text style={styles.gradeText}>{grade.courseName} – {grade.grade}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your appeal message"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.button} onPress={handleAppealSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal for feedback */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your Feedbacks</Text>
            <ScrollView style={styles.feedbackScroll}>
              {feedbacks.length > 0 ? (
                feedbacks.map((feedback, index) => {
                  const grade = grades.find((g) => g.gradeId === feedback.gradeId);
                  return (
                    <View key={feedback.feedbackId || index} style={styles.emailContainer}>
                      <View style={styles.emailHeader}>
                        <Text style={styles.emailHeaderText}>
                          From: {feedback.teacherEmail}
                        </Text>
                        <Text style={styles.emailHeaderText}>
                          Subject: Feedback for {grade?.courseName || "N/A"} exam
                        </Text>
                        <Text style={styles.emailDateText}>
                          Date: {new Date(feedback.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                          })}
                        </Text>
                      </View>
                      <View style={styles.emailBody}>
                        <Text style={styles.emailMessageText}>{feedback.feedbackText}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noDataText}>No feedbacks available</Text>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for viewing answers */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={answersModalVisible}
        onRequestClose={() => {
          setAnswersModalVisible(false);
          setSelectedAnswers([]);
          setSelectedExamId(null);
          setSelectedGradeId(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your Answers for {grades.find((g) => g.examId === selectedExamId)?.courseName || "Exam"}</Text>
            <ScrollView style={styles.answerScroll}>
              {selectedAnswers.length > 0 ? (
                selectedAnswers.map((answer, index) => (
                  <View
                    key={answer.answerId || index}
                    style={[
                      styles.answerSection,
                      answer.isCorrect === true
                        ? styles.correctAnswer
                        : answer.isCorrect === false
                        ? styles.incorrectAnswer
                        : styles.ungradedAnswer
                    ]}
                  >
                    <Text style={styles.questionNumber}>Question {index + 1}</Text>
                    <Text style={styles.questionText}>{answer.questionText}</Text>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Your Answer:</Text>
                      <Text style={styles.answerValue}>{answer.studentAnswer}</Text>
                    </View>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Correct Answer:</Text>
                      <Text style={styles.answerValue}>{answer.correctAnswer}</Text>
                    </View>
                    
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No answers available</Text>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setAnswersModalVisible(false);
                  setSelectedAnswers([]);
                  setSelectedExamId(null);
                  setSelectedGradeId(null);
                }}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#335ACF",
    alignItems: "center",
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    width: "33.33%",
    textAlign: "center",
    color: "#335ACF",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  cellText: {
    fontSize: 16,
    width: "33.33%",
    textAlign: "center",
    color: "#333",
  },
  cellAction: {
    width: "33.33%",
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#E27C48",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  scrollableTable: {
    maxHeight: 260,
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    paddingVertical: 10,
  },
  gpaContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  gpaBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  gpaText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#335ACF",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },
  optionBox: {
    width: "45%",
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#335ACF",
  },
  gradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  gradeItemGrid: {
    width: "48%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  gradeItemSelected: {
    backgroundColor: "#e8eaf6",
    borderColor: "#335ACF",
  },
  gradeText: {
    textAlign: "center",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: "top",
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#335ACF",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#E27C48",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  feedbackScroll: {
    maxHeight: 300,
    marginBottom: 10,
  },
  emailContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emailHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
    marginBottom: 8,
  },
  emailHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B3A67",
    marginBottom: 4,
  },
  emailDateText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  emailBody: {
    padding: 8,
  },
  emailMessageText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  answerScroll: {
    maxHeight: 300,
    marginBottom: 10,
  },
  answerSection: {
    marginVertical: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  correctAnswer: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },
  incorrectAnswer: {
    backgroundColor: "#FFEBEE",
    borderColor: "#D32F2F",
  },
  ungradedAnswer: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B3A67",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    lineHeight: 20,
  },
  answerRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B3A67",
    width: 100,
  },
  answerValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
});