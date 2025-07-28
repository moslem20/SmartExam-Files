import React, { useState, useEffect, useLayoutEffect } from "react";
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
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const baseURL = "http://smartexam.somee.com/api";

export default function QuestionPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { examId, course } = useLocalSearchParams();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [timeLeft, setTimeLeft] = useState(30); // Default to 30 seconds
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const [isImageLoading, setIsImageLoading] = useState(true); // Loading state for image
  const [timer, setTimer] = useState(null); // Store timer reference to clear it

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // Hide header and home button
    });
  }, [navigation]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const numExamId = parseInt(examId, 10);
      if (!examId || isNaN(numExamId)) {
        console.error("examId is invalid in QuestionPage:", examId);
        Alert.alert("Error", "Invalid Exam ID. Please go back and try again.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${baseURL}/questions/by-exam/${numExamId}`);
        const fetchedQuestions = response.data.map(q => {
          let options = [];
          if (q.questionType?.toLowerCase() === "truefalse" && (!q.options || q.options.length === 0) && !q.pairs) {
            options = ["True", "False"];
          } else if (typeof q.options === "string" && q.options) {
            options = q.options.split(",").map(opt => opt.trim());
          } else {
            options = q.options || [];
          }
          const imageFilename = q.imageUrl ? q.imageUrl.split('/').pop() : null;
          const imageUrl = imageFilename ? `${baseURL}/Questions/images/${imageFilename}` : null;
          console.log("Raw imageUrl from API:", q.imageUrl, "Constructed imageUrl:", imageUrl); // Debug log
          return {
            ...q,
            Options: options,
            imageUrl: imageUrl,
          };
        });
        if (fetchedQuestions.length === 0) {
          Alert.alert("Warning", "No questions available for this exam.");
        }
        setQuestions(fetchedQuestions);
        if (fetchedQuestions.length > 0) setCurrentIndex(0);
      } catch (error) {
        console.error("Error fetching questions:", error.response?.data || error.message);
        Alert.alert("Error", "Failed to load questions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, [examId]);

  useEffect(() => {
    let newTimer;
    const currentQuestion = questions[currentIndex] || {};
    const questionType = currentQuestion.questionType?.toLowerCase() || "";
    const isPhotoQuestion = questionType.includes("photowithtext") || questionType === "photo";
    if (questions.length > 0 && !isLoading && !isPhotoQuestion) {
      newTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(newTimer);
            nextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (questions.length > 0 && !isLoading && isPhotoQuestion && !isImageLoading) {
      newTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(newTimer);
            nextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setTimer(newTimer); // Store the timer reference
    return () => clearInterval(newTimer); // Cleanup on unmount or dependency change
  }, [currentIndex, questions, isLoading, isImageLoading]);

  // Stop timer when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (timer) {
        clearInterval(timer);
        setTimeLeft(0); // Reset time to stop timer
      }
    });
    return unsubscribe;
  }, [navigation, timer]);

  const handleAnswer = (answer) => {
    const currentQuestionId = questions[currentIndex]?.questionId;
    if (currentQuestionId) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestionId]: answer,
      }));
      setSelectedOptions(prev => ({
        ...prev,
        [currentQuestionId]: answer,
      }));
    }
  };

  const nextQuestion = () => {
    if (timer) {
      clearInterval(timer); // Stop the timer when "Next" is clicked
      setTimer(null); // Clear the timer reference
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(questions[currentIndex + 1]?.timeLimit || 30);
      setIsImageLoading(true); // Reset image loading for next question
    } else {
      submitExam();
    }
  };

  const submitExam = async () => {
    if (timer) {
      clearInterval(timer); // Stop the timer when "Submit" is clicked
      setTimer(null); // Clear the timer reference
    }
    setTimeLeft(0); // Stop timer on submit
    try {
      const studentId = await AsyncStorage.getItem("loggedInUser");
      const user = studentId ? JSON.parse(studentId) : null;
      if (!user || !user.studentId) {
        Alert.alert("Error", "Student ID not found. Please log in again.");
        return;
      }

      const numExamId = parseInt(examId, 10);
      if (isNaN(numExamId)) {
        throw new Error("Invalid examId");
      }

      if (Object.keys(answers).length === 0) {
        Alert.alert("Error", "Please select an answer before submitting.");
        return;
      }

      const classExamId = questions.length > 0 ? questions[0].classExamId : numExamId;
      console.log("Submitting with classExamId:", classExamId);

      const submission = {
        examId: classExamId,
        studentId: user.studentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: questionId.toString(),
          answerText: typeof answer === "object" ? JSON.stringify(answer) : answer.toString(),
          grade: null,
        })),
        timestamp: new Date().toISOString(),
      };

      console.log('submission:',submission);
      await axios.post(`${baseURL}/Questions/answers`, submission);

      router.push({
        pathname: "/student_exam_mode/examResult",
        params: { course },
      });
    } catch (error) {
      console.error("Error submitting exam:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to submit exam: ${error.response?.data?.message || error.message}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return <View style={styles.loadingContainer}><Text>No questions available...</Text></View>;
  }

  const currentQuestion = questions[currentIndex] || {};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.timer}>⏳ Time Left: {timeLeft}s</Text>
        <Text style={styles.questionNumber}>
          {currentIndex + 1}/{questions.length}
        </Text>
        <Text style={styles.question}>{currentQuestion.questionText || "No question available"}</Text>
        {currentQuestion.imageUrl && (
          <View>
            {isImageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
            <Image
              source={{ uri: currentQuestion.imageUrl }}
              style={styles.questionImage}
              resizeMode="contain"
              onLoad={() => setIsImageLoading(false)}
              onError={(error) => {
                console.log("Image load error for filename:", currentQuestion.imageUrl.split('/').pop(), error.nativeEvent.error);
                setIsImageLoading(false);
              }}
            />
          </View>
        )}

        {(() => {
          const type = currentQuestion.questionType?.toLowerCase() || "";

          switch (type) {
            case "open":
            case "openended":
              return (
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
                >
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your answer..."
                    placeholderTextColor="#B0C4DE"
                    onChangeText={(text) => handleAnswer(text)}
                    multiline
                  />
                </KeyboardAvoidingView>
              );

            case "mc":
            case "multiplechoice":
              return (currentQuestion.Options || []).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.option,
                    selectedOptions[currentQuestion.questionId] === option && styles.selectedOption,
                  ]}
                  onPress={() => handleAnswer(option)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ));

            case "photowithtext":
            case "photo":
              return (
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
                >
                  <TextInput
                    style={styles.textInput}
                    placeholder="Describe the image..."
                    placeholderTextColor="#B0C4DE"
                    onChangeText={(text) => handleAnswer(text)}
                    multiline
                  />
                </KeyboardAvoidingView>
              );

            case "truefalse":
              return (currentQuestion.Options || ["True", "False"]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.option,
                    selectedOptions[currentQuestion.questionId] === option && styles.selectedOption,
                  ]}
                  onPress={() => handleAnswer(option)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ));

            case "matching":
              return (currentQuestion.pairs || []).map((pair, index) => (
                <View key={index} style={styles.pairContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                    placeholder={`Term ${index + 1}`}
                    placeholderTextColor="#B0C4DE"
                    value={pair.left || ""}
                    onChangeText={(text) => {
                      const newPairs = [...(currentQuestion.pairs || [])];
                      newPairs[index] = { ...newPairs[index], left: text };
                      handleAnswer(newPairs);
                    }}
                  />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder={`Definition ${index + 1}`}
                    placeholderTextColor="#B0C4DE"
                    value={pair.right || ""}
                    onChangeText={(text) => {
                      const newPairs = [...(currentQuestion.pairs || [])];
                      newPairs[index] = { ...newPairs[index], right: text };
                      handleAnswer(newPairs);
                    }}
                  />
                </View>
              ));

            default:
              return (
                <Text style={styles.question}>
                  Unknown question type: {currentQuestion.questionType}
                </Text>
              );
          }
        })()}

        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.buttonText}>
            {currentIndex === questions.length - 1 ? "Submit" : "Next"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A38" },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: "center" },
  timer: { fontSize: 18, fontWeight: "bold", color: "#FF6347", textAlign: "center", marginBottom: 10 },
  questionNumber: { fontSize: 16, color: "#FFD700", textAlign: "center", marginBottom: 10 },
  question: { fontSize: 18, fontWeight: "bold", color: "#FFD700", marginBottom: 15 },
  questionImage: { width: "100%", height: 200 },
  imageLoadingContainer: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0, 0, 0, 0.5)" 
  },
  option: { backgroundColor: "#335ACF", padding: 12, marginVertical: 5, borderRadius: 8 },
  selectedOption: { backgroundColor: "#32CD32" }, // Green for selected answer
  optionText: { color: "#fff", fontSize: 16, textAlign: "center" },
  textInput: { backgroundColor: "#2C3E50", color: "#fff", padding: 12, borderRadius: 8, marginTop: 10 },
  pairContainer: { flexDirection: "row", marginBottom: 10 },
  nextButton: { backgroundColor: "#E27C48", padding: 15, borderRadius: 10, marginTop: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#1E2A38" 
  },
  loadingText: { 
    fontSize: 16, 
    color: "#FFD700", 
    marginTop: 10 
  },
});