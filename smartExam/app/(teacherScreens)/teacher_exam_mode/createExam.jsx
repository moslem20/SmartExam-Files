import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";

const baseURL = "http://smartexam.somee.com/api";

const CreateExam = () => {
  const navigation = useNavigation();
  const { questions: questionsParam, examId: examIdParam } = useLocalSearchParams();
  const [teacherEmail, setTeacherEmail] = useState("");
  const [classes, setClasses] = useState([]);
  const [examData, setExamData] = useState({
    title: "",
    examDate: new Date(),
    course: "", // ClassId (string)
    className: "", // Class name for Exam payload
    time: "",
    description: "",
  });
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [examId, setExamId] = useState(examIdParam || null);
  const [questions, setQuestions] = useState(
    questionsParam ? JSON.parse(questionsParam) : []
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const typeMap = {
  open: "open",
  mc: "mc",
  photo: "photowithtext",
  truefalse: "truefalse",
  matching: "matching",
};


  useEffect(() => {
    const getTeacherEmail = async () => {
      try {
        const userData = await AsyncStorage.getItem("loggedInUser");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === "teacher" && user.email) {
            setTeacherEmail(user.email);
          } else {
            Alert.alert("Error", "Teacher email not found. Please log in again.");
          }
        } else {
          Alert.alert("Error", "Please log in to access classes.");
        }
      } catch (error) {
        console.error("Error fetching teacher email:", error);
        Alert.alert("Error", "Failed to load user data.");
      }
    };

    getTeacherEmail();
  }, []);

  useEffect(() => {
    if (teacherEmail) {
      fetchClasses();
    }
  }, [teacherEmail]);

  useEffect(() => {
    if (questionsParam) {
      setQuestions(JSON.parse(questionsParam));
    }
  }, [questionsParam]);

  const fetchClasses = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`${baseURL}/Classes/teacher/${teacherEmail}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mappedClasses = response.data.map((course) => ({
        label: course.courseName,
        value: course.id.toString(),
      }));
      setClasses([{ label: "Select Class", value: "" }, ...mappedClasses]);
    } catch (error) {
      console.error("Fetch classes error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to fetch classes: ${error.response?.data?.message || error.message}`);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T${examData.time || "00:00"}:00`;
  };

  const displayDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setExamData({ ...examData, examDate: selectedDate });
    }
  };

 const handleSave = async () => {
  if (!examData.title || !examData.examDate || !examData.course || !examData.time) {
    Alert.alert("Error", "Please fill in all required fields (Title, Date, Class, Duration).");
    return;
  }

  if (examData.title.length < 3) {
    Alert.alert("Error", "Exam title must be at least 3 characters long.");
    return;
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(examData.time)) {
    Alert.alert("Error", "Please enter a valid time in HH:mm format (e.g., 13:30).");
    return;
  }

  if (questions.length === 0) {
    Alert.alert("Error", "Please add at least one question before saving the exam.");
    return;
  }

  // Validate questions
  for (const q of questions) {
    const questionType = typeMap[q.QuestionType.toLowerCase()];
    if (!questionType) {
      Alert.alert("Error", `Invalid question type for question: ${q.QuestionText}`);
      return;
    }
    if (questionType === "mc" && (!q.Options || q.Options.split(",").length < 2)) {
      Alert.alert("Error", `Question "${q.QuestionText}" must have at least two non-empty options.`);
      return;
    }
    if (questionType === "mc" && !q.CorrectAnswer) {
      Alert.alert("Error", `Question "${q.QuestionText}" must have a valid correct answer.`);
      return;
    }
  }

  try {
    const token = await AsyncStorage.getItem("authToken");

    // Prepare exam payload
    const examToCreate = {
      title: examData.title,
      examDate: formatDate(examData.examDate),
      course: examData.className,
      time: examData.time,
      description: examData.description || null,
    };

    console.log("Creating exam with payloads:", JSON.stringify(examToCreate, null, 2));
    const examResponse = await axios.post(`${baseURL}/Exams`, examToCreate, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const createdExam = examResponse.data;
    console.log("Created exam response:", createdExam);

    // Prepare ClassExam payload
    const classExamWithQuestions = {
  classId: examData.course,
  examId: createdExam.examId,
  questions: questions.map((q) => {
    const questionType = typeMap[q.QuestionType.toLowerCase()]; // maps to lowercase string

    return {
      questionType,
      questionText: q.QuestionText || "",
      answer: questionType === "open" || questionType === "photo" ? q.CorrectAnswer || null : null,
      options: questionType === "mc" ? (q.Options || null) : null,
      correctAnswer: questionType === "mc" || questionType === "open" || questionType === "photo" ? q.CorrectAnswer || null : null,
      isTrue: questionType === "truefalse" ? q.IsTrue ?? null : null,
      pairs: questionType === "matching" ? (q.Pairs || null) : null,
      imageUrl: q.ImageUrl || null,
      timeLimit: q.TimeLimit || 30,
    };
  }),
};



    console.log("Creating ClassExams with payload:", JSON.stringify(classExamWithQuestions, null, 2));
    const classExamResponse = await axios.post(`${baseURL}/ClassExams`, classExamWithQuestions, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("ClassExams response:", classExamResponse.data);

    setExamId(createdExam.examId);

    Alert.alert("Success", "Exam and questions created successfully!", [
      {
        text: "OK",
        onPress: () => navigation.navigate("examsDash"),
      },
      {
        text: "Add More Questions",
        onPress: () => navigation.navigate("addQuestions", {
          examId: createdExam.examId,
          questions: JSON.stringify(questions),
        }),
      },
    ]);
  } catch (error) {
    console.error("Create exam error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    const errorMessage = error.response?.data?.errors
      ? JSON.stringify(error.response.data.errors, null, 2)
      : error.response?.data?.title || error.message;
    Alert.alert("Error", `Failed to create exam: ${errorMessage}`);
  }
};

  const handleAddQuestions = () => {
    navigation.navigate("addQuestions", {
      examId: examId || null,
      questions: JSON.stringify(questions),
    });
  };

  const Dropdown = ({ options, selected, onSelect, isOpen, setIsOpen, title }) => {
    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={styles.dropdownButtonText}>{selected || title}</Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#2B3A67"
          />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.dropdown}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option.value, option.label);
                  setIsOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📝 Create New Exam</Text>
          <Text style={styles.headerSubtitle}>Fill in the details and add questions</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
        >
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Exam Title (e.g., Math Midterm)"
              placeholderTextColor="#A3A3A3"
              value={examData.title}
              onChangeText={(text) => setExamData({ ...examData, title: text })}
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {examData.examDate ? displayDate(examData.examDate) : "Select Exam Date"}
              </Text>
              <Ionicons name="calendar-outline" size={24} color="#2B3A67" />
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={examData.examDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor="#FFFFFF"
                  accentColor="#4A5B8C"
                  themeVariant="dark"
                  style={styles.datePicker}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.closeButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Dropdown
              title="Select Class"
              options={classes}
              selected={classes.find((c) => c.value === examData.course)?.label}
              onSelect={(value, label) =>
                setExamData({ ...examData, course: value, className: label })
              }
              isOpen={classDropdownOpen}
              setIsOpen={setClassDropdownOpen}
            />
            <TextInput
              style={styles.input}
              placeholder="Time (e.g., 13:30)"
              placeholderTextColor="#A3A3A3"
              value={examData.time}
              onChangeText={(text) => setExamData({ ...examData, time: text })}
            />
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
              placeholder="Description (optional)"
              placeholderTextColor="#A3A3A3"
              multiline
              value={examData.description}
              onChangeText={(text) => setExamData({ ...examData, description: text })}
            />
          </View>
        </KeyboardAvoidingView>

        {questions.length > 0 && (
          <View style={styles.questionsCard}>
            <Text style={styles.cardTitle}>Added Questions ({questions.length})</Text>
            {questions.map((question, index) => (
              <Text key={index} style={styles.questionText}>
                {index + 1}. {question.QuestionText} ({question.QuestionType})
              </Text>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.buttonLeftAlt}
              onPress={() =>
                navigation.navigate("aiGenerate", {
                  examId,
                  existingQuestions: JSON.stringify(questions),
                })
              }
            >
              <Ionicons name="sparkles-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Generate with AI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonRight} onPress={handleAddQuestions}>
              <Ionicons name="list-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Add Questions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonLeft} onPress={handleSave}>
              <Ionicons name="save-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Save Exam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonRightAlt}
              onPress={() => navigation.navigate("examsDash")}
            >
              <Ionicons name="close-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateExam;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F1ED",
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 32,
    paddingBottom: 60,
  },
  aiButton: {
  flex: 1,
  backgroundColor: "#4B3F72",
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
},

  header: {
    marginBottom: 28,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2B3A67",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "400",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  questionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2B3A67",
    marginBottom: 16,
  },
  questionText: {
    fontSize: 15,
    color: "#2D2D2D",
    marginBottom: 12,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#F8FAFC",
    color: "#2D2D2D",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    fontWeight: "400",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  datePickerText: {
    color: "#2D2D2D",
    fontSize: 16,
    fontWeight: "400",
  },
  datePickerContainer: {
    backgroundColor: "#3B4A7A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4A5B8C",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
    alignItems: "center",
  },
  datePicker: {
    width: "100%",
    backgroundColor: "#4A5B8C",
    borderRadius: 10,
  },
  closeButton: {
    backgroundColor: "#4A5B8C",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#2B3A67",
    fontWeight: "500",
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#2D2D2D",
    fontWeight: "400",
  },
  actionButtons: {
  flexDirection: "column",
  marginBottom: 32,
  gap: 12,
  width: "100%", // Ensure container takes full width
},
topButtonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 12,
  width: "100%", // Ensure row takes full width
},
saveButton: {
  flex: 1, // Each button in top row will take equal space
  backgroundColor: "#E27C48",
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 16,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
  minWidth: 0, // Important for flex items to shrink properly
},
disabledButton: {
  backgroundColor: "#D1D5DB",
  opacity: 0.7,
},
questionsButton: {
  flex: 1, // Each button in top row will take equal space
  backgroundColor: "#2B3A67",
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 16,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
  minWidth: 0, // Important for flex items to shrink properly
},
aiButton: {
  flex: 1, // Each button in top row will take equal space
  backgroundColor: "#4B3F72",
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 16,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
  minWidth: 0, // Important for flex items to shrink properly
},
cancelButton: {
  backgroundColor: "#6B7280",
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderRadius: 16,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
  width: "100%", // Cancel button takes full width
},
buttonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 14,
  gap: 12,
},

buttonLeft: {
  flex: 1,
  backgroundColor: "#2B3A67",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 50,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 3 },
},

buttonRight: {
  flex: 1,
  backgroundColor: "#E27C48",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 50,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 3 },
},

buttonLeftAlt: {
  flex: 1,
  backgroundColor: "#4B3F72",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 50,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 3 },
},

buttonRightAlt: {
  flex: 1,
  backgroundColor: "#6B7280",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 50,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 3 },
},

buttonText: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "600",
  marginLeft: 8,
},

});