import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Camera, CameraType } from "expo-camera"; // Ensure CameraType is imported
import * as FileSystem from "expo-file-system";

const sampleQuestions = [
  { id: 1, type: "mcq", question: "What is 2 + 2?", options: ["3", "4", "5"], correctAnswer: "4", timeLimit: 30 },
  { id: 2, type: "open", question: "Explain the concept of recursion.", timeLimit: 120 },
  { id: 3, type: "mcq", question: "Which language is used for React Native?", options: ["Java", "C#", "JavaScript"], correctAnswer: "JavaScript", timeLimit: 45 },
];

export default function QuestionPage() {
  const router = useRouter();
  const { examId, course } = useLocalSearchParams();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(sampleQuestions[0].timeLimit);
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);

  const cameraRef = useRef(null);
  const currentQuestion = sampleQuestions[currentIndex];

  // Request camera permissions and start recording on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      if (status === "granted" && cameraRef.current) {
        startSnapshotMode();
      }
    })();
  }, []);

  // Timer for each question
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          nextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const snapshotInterval = useRef(null);

const startSnapshotMode = () => {
  if (cameraRef.current) {
    snapshotInterval.current = setInterval(async () => {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log("Snapshot taken:", photo.uri);

        // Optionally upload or save photo using FileSystem
        const fileName = `${FileSystem.documentDirectory}exam_snapshot_${Date.now()}.jpg`;
        await FileSystem.moveAsync({
          from: photo.uri,
          to: fileName,
        });

        console.log("Snapshot saved to:", fileName);
      } catch (error) {
        console.error("Snapshot error:", error);
      }
    }, 10000); // every 10 seconds
  }
};

const stopSnapshotMode = () => {
  if (snapshotInterval.current) {
    clearInterval(snapshotInterval.current);
    snapshotInterval.current = null;
  }
};


  /*const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopSnapshotMode();
        setIsRecording(false);
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }
  };*/

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentQuestion.id]: answer });
    if (currentQuestion.type === "mcq") setSelectedOption(answer);
  };

  const nextQuestion = () => {
    if (currentIndex < sampleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setTimeLeft(sampleQuestions[currentIndex + 1].timeLimit);
    } else {
      stopSnapshotMode();
      submitExam();
    }
  };

  const submitExam = () => {
    router.push({
      pathname: "/student_exam_mode/examResult",
      params: { course, videoUri },
    });
  };

  if (hasPermission === null) {
    return <View style={styles.loadingContainer}><Text>Loading...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.loadingContainer}><Text>No camera access</Text></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.timer}>⏳ Time Left: {timeLeft}s</Text>
        <Text style={styles.question}>{currentQuestion.question}</Text>

        {currentQuestion.type === "mcq" ? (
          currentQuestion.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                selectedOption === option ? styles.selectedOption : null,
              ]}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <TextInput
            style={styles.textInput}
            placeholder="Type your answer..."
            placeholderTextColor="#B0C4DE"
            onChangeText={(text) => handleAnswer(text)}
            multiline
          />
        )}

        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.buttonText}>
            {currentIndex === sampleQuestions.length - 1 ? "Submit" : "Next"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Camera Display */}
      {hasPermission && CameraType ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={CameraType.front} 
            ref={cameraRef}
          />
          <Text style={styles.recordingStatus}>
            {isRecording ? "🔴 Recording" : "Camera Ready"}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A38" },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: "center" },
  timer: { fontSize: 18, fontWeight: "bold", color: "#FF6347", textAlign: "center", marginBottom: 10 },
  question: { fontSize: 18, fontWeight: "bold", color: "#FFD700", marginBottom: 15 },
  option: { backgroundColor: "#335ACF", padding: 12, marginVertical: 5, borderRadius: 8 },
  selectedOption: { backgroundColor: "#FFD700" },
  optionText: { color: "#fff", fontSize: 16, textAlign: "center" },
  textInput: { backgroundColor: "#2C3E50", color: "#fff", padding: 12, borderRadius: 8, marginTop: 10 },
  nextButton: { backgroundColor: "#E27C48", padding: 15, borderRadius: 10, marginTop: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1E2A38" },

  // Camera Styles
  cameraContainer: {
    position: "absolute",
    top: 40,
    right: 10,
    width: 120,
    height: 180,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFD700",
    backgroundColor: "#2C3E50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  camera: {
    width: "100%",
    height: "80%",
  },
  recordingStatus: {
    color: "#FFD700",
    fontSize: 12,
    textAlign: "center",
    padding: 5,
  },
});