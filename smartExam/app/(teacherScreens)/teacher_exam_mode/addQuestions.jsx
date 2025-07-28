import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const baseURL = "http://smartexam.somee.com/api";

export default function AddQuestions() {
  const navigation = useNavigation();
  const { questions: questionsParam, examId } = useLocalSearchParams();
  const [questionType, setQuestionType] = useState("");
  const [questionData, setQuestionData] = useState({
    text: "",
    answer: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    isTrue: null,
    pairs: [
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
    ],
    imageUrl: null,
    timeLimit: 30,
  });
  const [questions, setQuestions] = useState(
    questionsParam ? JSON.parse(questionsParam) : []
  );
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isListVisible, setIsListVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const questionTypes = [
    { label: "Select Question Type", value: "", icon: "list-outline" },
    { label: "Open-Ended", value: "open", icon: "pencil-outline" },
    { label: "Multiple Choice", value: "mc", icon: "checkmark-circle-outline" },
    { label: "Photo with Text", value: "photo", icon: "image-outline" },
    { label: "True/False", value: "truefalse", icon: "help-circle-outline" },
  ];

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Permission to access gallery is required!");
      }
    })();
  }, []);

  const handleAddQuestion = () => {
  if (!questionType) {
    Alert.alert("Error", "Please select a question type.");
    return;
  }
  if (!questionData.text.trim()) {
    Alert.alert("Error", "Question text is required.");
    return;
  }

  const timeLimit = parseInt(questionData.timeLimit, 10);
  if (isNaN(timeLimit) || timeLimit <= 0) {
    Alert.alert("Error", "Time limit must be a positive number.");
    return;
  }

  let validationError = "";
  if (questionType === "open" && !questionData.answer.trim()) {
    validationError = "Expected answer is required for open-ended questions.";
  } else if (questionType === "mc") {
    const validOptions = questionData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      validationError = "At least two non-empty options are required for multiple-choice questions.";
    } else if (
      !questionData.correctAnswer ||
      !validOptions.includes(questionData.correctAnswer)
    ) {
      validationError = "Please select a valid correct answer from the options.";
    }
  } else if (questionType === "truefalse" && questionData.isTrue === null) {
    validationError = "Please select True or False.";
  } else if (
    questionType === "matching" &&
    questionData.pairs.some((pair) => !pair.left.trim() || !pair.right.trim())
  ) {
    validationError = "All matching pairs must be filled.";
  } else if (questionType === "photo" && !questionData.imageUrl) {
    validationError = "An image is required for photo questions.";
  } else if (questionType === "photo" && !questionData.answer.trim()) {
    validationError = "An answer is required for photo questions.";
  }

    if (validationError) {
      Alert.alert("Error", validationError);
      return;
    }

    const imageUrl = questionData.imageUrl;
    const imageFilename = imageUrl ? imageUrl.split("/").pop() : null;

    const newQuestion = {
      ClassExamId: examId || 0,
      QuestionType: questionType,
      QuestionText: questionData.text,
      Answer: null,
      CorrectAnswer:
        questionType === "open" || questionType === "photo"
          ? questionData.answer
          : questionType === "mc"
            ? questionData.correctAnswer
            : questionType === "truefalse"
              ? questionData.isTrue === true ? "True" : "False"
              : null,
      Options: questionType === "mc"
        ? questionData.options.filter(opt => opt.trim()).join(",")
        : null,
      IsTrue: questionType === "truefalse" ? questionData.isTrue : null,
      Pairs: questionType === "matching"
        ? JSON.stringify(
          questionData.pairs.filter(pair => pair.left.trim() && pair.right.trim())
        )
        : null,
      ImageUrl: questionType === "photo" ? questionData.imageUrl?.split("/").pop() : null,
      TimeLimit: timeLimit,
    };


  if (editingIndex !== null) {
    const updatedQuestions = [...questions];
    updatedQuestions[editingIndex] = newQuestion;
    setQuestions(updatedQuestions);
    Alert.alert("Success", "Question updated!");
  } else {
    setQuestions([...questions, newQuestion]);
    Alert.alert("Success", "Question added!");
  }

  setQuestionData({
    text: "",
    answer: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    isTrue: null,
    pairs: [
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
    ],
    imageUrl: null,
    timeLimit: 30,
  });
  setQuestionType("");
  setEditingIndex(null);
  setIsListVisible(true);
};

  const handleEditQuestion = (index) => {
    const question = questions[index];
    setQuestionType(question.QuestionType);
    setQuestionData({
      text: question.QuestionText,
      answer:
        question.QuestionType === "open" || question.QuestionType === "photo"
          ? question.CorrectAnswer || ""
          : "",
      options: question.Options ? question.Options.split(",") : ["", "", "", ""],
      correctAnswer:
        question.QuestionType === "mc" ? question.CorrectAnswer || "" : "",
      isTrue: question.IsTrue !== undefined ? question.IsTrue : null,
      pairs: question.Pairs
        ? JSON.parse(question.Pairs)
        : [
            { left: "", right: "" },
            { left: "", right: "" },
            { left: "", right: "" },
            { left: "", right: "" },
          ],
      imageUrl: question.ImageUrl
        ? `${baseURL}/Questions/images/${question.ImageUrl}`
        : null,
      timeLimit: question.TimeLimit || 30,
    });
    setEditingIndex(index);
    setIsListVisible(true);
  };

  const handleDeleteQuestion = (index) => {
    Alert.alert("Confirm", "Delete this question?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: () => {
          const updatedQuestions = questions.filter((_, i) => i !== index);
          setQuestions(updatedQuestions);
          Alert.alert("Success", "Question deleted!");
        },
      },
    ]);
  };

  const handleSaveQuestions = () => {
    if (questions.length === 0) {
      Alert.alert("Error", "Please add at least one question.");
      return;
    }
    navigation.navigate("createExam", {
      questions: JSON.stringify(questions),
      examId: examId || null,
    });
  };

  const handleImagePick = async () => {
    try {
      setIsUploading(true);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const response = await uploadImage(uri);
        console.log("Image upload response:", response);
        setQuestionData({ ...questionData, imageUrl: response.imageUrl });
        Alert.alert("Success", "Image uploaded!");
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", `Failed to upload image: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImage = async (uri) => {
    try {
      const formData = new FormData();
      formData.append("image", {
        uri,
        name: `photo-${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      const response = await fetch(`${baseURL}/questions/upload-image`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload image: ${errorText} (Status: ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  const toggleListVisibility = () => {
    setIsListVisible(!isListVisible);
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
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <Ionicons name={option.icon} size={18} color="#2B3A67" />
                    <Text style={styles.dropdownItemText}>{option.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          <Text style={styles.headerTitle}>📝 Add Exam Questions</Text>
          <Text style={styles.headerSubtitle}>Create questions for your exam</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
        >
          <View style={styles.formCard}>
            <View style={styles.typeSelectorContainer}>
  {questionTypes.slice(1).map((type) => (
    <TouchableOpacity
      key={type.value}
      style={[
        styles.typeButton,
        questionType === type.value && styles.typeButtonSelected,
      ]}
      onPress={() => setQuestionType(type.value)}
    >
      <Ionicons
        name={type.icon}
        size={28}
        color={questionType === type.value ? "#FFFFFF" : "#2B3A67"}
        style={styles.typeButtonIcon}
      />
      <Text
        style={[
          styles.typeButtonText,
          questionType === type.value && styles.typeButtonTextSelected,
        ]}
      >
        {type.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

            <TextInput
              style={styles.input}
              placeholder="Question Text"
              placeholderTextColor="#A3A3A3"
              value={questionData.text}
              onChangeText={(text) => setQuestionData({ ...questionData, text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Time Limit (seconds)"
              placeholderTextColor="#A3A3A3"
              value={questionData.timeLimit.toString()}
              keyboardType="numeric"
              onChangeText={(text) => {
                const value = text ? parseInt(text, 10) || 30 : 30;
                setQuestionData({ ...questionData, timeLimit: value });
              }}
            />
            {questionType === "open" && (
              <TextInput
                style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                placeholder="Expected Answer"
                placeholderTextColor="#A3A3A3"
                multiline
                value={questionData.answer}
                onChangeText={(text) => setQuestionData({ ...questionData, answer: text })}
              />
            )}
            {questionType === "mc" && (
              <>
                {questionData.options.map((option, index) => (
                  <View key={index} style={styles.optionContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#A3A3A3"
                      value={option}
                      onChangeText={(text) => {
                        const newOptions = [...questionData.options];
                        newOptions[index] = text;
                        setQuestionData({ ...questionData, options: newOptions });
                      }}
                    />
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        questionData.correctAnswer === option && styles.radioButtonSelected,
                      ]}
                      onPress={() => setQuestionData({ ...questionData, correctAnswer: option })}
                    >
                      {questionData.correctAnswer === option && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            {questionType === "photo" && (
              <>
                <TouchableOpacity
                  style={[styles.imageButton, isUploading && styles.disabledButton]}
                  onPress={handleImagePick}
                  disabled={isUploading}
                >
                  <Ionicons name="image-outline" size={24} color="#2B3A67" />
                  <Text style={[styles.buttonText, { color: "#000000" }]}>
                    {questionData.imageUrl ? "Image Selected" : "Upload Image"}
                  </Text>

                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                  placeholder="Expected Answer (Describe the image)"
                  placeholderTextColor="#A3A3A3"
                  multiline
                  value={questionData.answer}
                  onChangeText={(text) => setQuestionData({ ...questionData, answer: text })}
                />
              </>
            )}
            {questionType === "truefalse" && (
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    questionData.isTrue === true && styles.radioButtonSelected,
                  ]}
                  onPress={() => setQuestionData({ ...questionData, isTrue: true })}
                >
                  <Text style={styles.radioText}>True</Text>
                  {questionData.isTrue === true && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    questionData.isTrue === false && styles.radioButtonSelected,
                  ]}
                  onPress={() => setQuestionData({ ...questionData, isTrue: false })}
                >
                  <Text style={styles.radioText}>False</Text>
                  {questionData.isTrue === false && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity style={styles.addButton} onPress={handleAddQuestion}>
              <Ionicons
                name={editingIndex !== null ? "pencil-outline" : "add-outline"}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                {editingIndex !== null ? "Update Question" : "Add Question"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <TouchableOpacity style={styles.toggleButton} onPress={toggleListVisibility}>
          <Ionicons
            name={isListVisible ? "chevron-down" : "chevron-up"}
            size={24}
            color="#2B3A67"
          />
          <Text style={styles.toggleButtonText}>
            {isListVisible ? "Hide Questions List" : "Show Questions List"} (
            {questions.length})
          </Text>
        </TouchableOpacity>

        {isListVisible && questions.length > 0 && (
          <View style={styles.questionsCard}>
            <Text style={styles.cardTitle}>Added Questions ({questions.length})</Text>
            {questions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <View style={styles.questionContent}>
                  <Text style={styles.questionText}>
                    {index + 1}. {question.QuestionText} (
                    {questionTypes.find((t) => t.value === question.QuestionType)?.label}
                    , {question.TimeLimit}s)
                  </Text>
                  {question.QuestionType === "photo" && question.ImageUrl && (
                    <Image
                      source={{ uri: `${baseURL}/Questions/images/${question.ImageUrl}` }}
                      style={styles.questionImage}
                      onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
                    />
                  )}
                  {question.QuestionType === "mc" && question.CorrectAnswer && (
                    <Text style={styles.correctAnswerText}>
                      Correct Answer: {question.CorrectAnswer}
                    </Text>
                  )}
                  {(question.QuestionType === "open" || question.QuestionType === "photo") &&
                    question.CorrectAnswer && (
                      <Text style={styles.correctAnswerText}>
                        Expected Answer: {question.CorrectAnswer}
                      </Text>
                    )}
                </View>
                <View style={styles.questionActions}>
                  <TouchableOpacity onPress={() => handleEditQuestion(index)}>
                    <Ionicons name="pencil-outline" size={20} color="#2B3A67" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteQuestion(index)}>
                    <Ionicons name="trash-outline" size={20} color="#E27C48" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveQuestions}>
            <Ionicons name="save-outline" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.navigate("createExam")}
          >
            <Ionicons name="close-outline" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2B3A67" />
          <Text style={styles.loadingText}>Uploading Image...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

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
  dropdownContainer: {
    marginBottom: 16,
    zIndex: 1000,
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
    zIndex: 1001,
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
    zIndex: 1002,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#2D2D2D",
    fontWeight: "400",
    marginLeft: 8,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  radioButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2B3A67",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioButtonSelected: {
    backgroundColor: "#E27C48",
    borderColor: "#2B3A67",
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  radioText: {
    fontSize: 14,
    color: "#2D2D2D",
    fontWeight: "400",
  },
  pairContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  addButton: {
    backgroundColor: "#2B3A67",
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
  toggleButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  toggleButtonText: {
    color: "#2B3A67",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#E27C48",
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
  cancelButton: {
    flex: 1,
    backgroundColor: "#6B7280",
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
  buttonText: {
    color: "#ffffffff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  questionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  questionContent: {
    flex: 1,
    marginRight: 12,
  },
  questionText: {
    fontSize: 15,
    color: "#2D2D2D",
    lineHeight: 22,
  },
  correctAnswerText: {
    fontSize: 14,
    color: "#2E7D32",
    marginTop: 6,
  },
  questionImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginTop: 8,
  },
  questionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
    opacity: 0.7,
  },
  typeSelectorContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  marginBottom: 20,
  gap: 12,
},

typeButton: {
  width: "22%",
  aspectRatio: 1,
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 10,
  paddingHorizontal: 2,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
},

typeButtonSelected: {
  backgroundColor: "#2B3A67",
  borderColor: "#2B3A67",
},

typeButtonIcon: {
  marginBottom: 6,
},

typeButtonText: {
  fontSize: 13,
  fontWeight: "500",
  color: "#2B3A67",
  textAlign: "center",
},

typeButtonTextSelected: {
  color: "#FFFFFF",
},

});