import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const baseURL = "http://smartexam.somee.com/api";

export default function AIGenerate() {
  const navigation = useNavigation();
  const { examId, questions: questionsParam } = useLocalSearchParams();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(questionsParam ? JSON.parse(questionsParam) : []);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [bgFadeAnim] = useState(new Animated.Value(0.8));

  // Animations for loading screen
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bgFadeAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bgFadeAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(1);
      rotateAnim.setValue(0);
      bgFadeAnim.setValue(0.8);
    }
  }, [loading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please write a prompt (e.g., 'Generate 3 multiple-choice questions about World Geography').");
      return;
    }

    setLoading(true);
    try {
      const fullPrompt = `
${prompt}

Return the response in the following JSON structure (JSON only, no explanation):

[
  {
    "ClassExamId": ${examId || 0},
    "QuestionType": "open|mc|truefalse|matching",
    "QuestionText": "string (required, non-empty)",
    "CorrectAnswer": "string (required for open and mc, null for truefalse and matching)",
    "Options": "string (comma-separated, required for mc with exactly 4 options, null otherwise)",
    "IsTrue": "boolean (required for truefalse questions — 💡 set it to true or false based on the correct answer to the question)",
    "Pairs": "string (JSON array of {left: string, right: string} objects, required for matching with at least 4 pairs, null otherwise)",
    "ImageUrl": null,
    "TimeLimit": "number (required, positive integer, default 30)"
  }
]

Rules for generation:
- For **"open"** questions, **CorrectAnswer** must be a non-empty string.
- For **"mc"** questions:
  - Options must include exactly 4 non-empty items (comma-separated).
  - CorrectAnswer must be one of those options.
- For **"truefalse"** questions:
  - 💡 AI must choose the correct answer (either true or false), and assign it to **IsTrue** as a boolean.
- For **"matching"** questions:
  - Pairs must contain at least 4 valid {left, right} objects with non-empty values.
- **ImageUrl** must always be null.
- **TimeLimit** must be a positive integer (default 30 if not sure).
`;

      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyACVQOs3LZX3eE13e27VwNxIJT72FOjMDc`,
        {
          contents: [{ parts: [{ text: fullPrompt }] }],
        }
      );

      const rawText = resp.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonStart = rawText.indexOf("[");
      const jsonEnd = rawText.lastIndexOf("]");
      const jsonString = rawText.substring(jsonStart, jsonEnd + 1);

      let aiQuestions;
      try {
        aiQuestions = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON parse failed:", parseError);
        Alert.alert("Error", "Could not parse questions. Ensure the AI returns valid JSON.");
        setLoading(false);
        return;
      }

      // Validate and map questions to match AddQuestions structure
      const mapped = aiQuestions.map((q) => {
        const qType = q.QuestionType?.toLowerCase();
        if (!["open", "mc", "truefalse", "matching"].includes(qType)) {
          throw new Error("Invalid question type.");
        }

        let validationError = "";
        if (!q.QuestionText?.trim()) {
          validationError = "Question text is required.";
        } else if (qType === "open" && !q.CorrectAnswer?.trim()) {
          validationError = "Open questions require a correct answer.";
        } else if (qType === "mc") {
          const options = q.Options?.split(",").map((opt) => opt.trim());
          const correct = q.CorrectAnswer?.trim();
          if (!options || options.length !== 4 || options.some((opt) => !opt)) {
            validationError = "MC questions must have 4 non-empty options.";
          } else if (!correct || !options.includes(correct)) {
            validationError = "CorrectAnswer must match one of the options.";
          }
        } else if (qType === "truefalse" && typeof q.IsTrue !== "boolean") {
          validationError = "True/False questions require a boolean value.";
        } else if (qType === "matching") {
          try {
            const pairs = JSON.parse(q.Pairs || "[]");
            if (
              !Array.isArray(pairs) ||
              pairs.length < 4 ||
              pairs.some((pair) => !pair.left?.trim() || !pair.right?.trim())
            ) {
              validationError = "Matching questions must have 4+ valid pairs.";
            }
          } catch (e) {
            validationError = "Invalid JSON format in Pairs.";
          }
        }

        if (!Number.isInteger(q.TimeLimit) || q.TimeLimit <= 0) {
          validationError = "TimeLimit must be a positive integer.";
        }

        if (validationError) {
          throw new Error(validationError);
        }

        return {
          ClassExamId: parseInt(examId) || 0,
          QuestionType: qType,
          QuestionText: q.QuestionText.trim(),
          CorrectAnswer: ["open", "mc"].includes(qType) ? q.CorrectAnswer?.trim() : null,
          Options: qType === "mc" ? q.Options.split(",").map((opt) => opt.trim()).join(",") : null,
          IsTrue: qType === "truefalse" ? q.IsTrue : null,
          Pairs: qType === "matching" ? JSON.stringify(JSON.parse(q.Pairs)) : null,
          ImageUrl: null,
          TimeLimit: q.TimeLimit || 30,
        };
      });

      setGenerated(mapped);
      Alert.alert("Success", "Questions generated!");
    } catch (e) {
      console.error("AI parse error:", e);
      Alert.alert("Error", e.message || "AI generation failed. Check prompt format.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (generated.length === 0) {
      Alert.alert("Error", "Please generate at least one question.");
      return;
    }
    navigation.navigate("createExam", {
      questions: JSON.stringify(generated),
      examId: examId || null,
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧠 Generate AI Questions</Text>
          <Text style={styles.headerSubtitle}>Generate questions using AI for your exam</Text>
        </View>

        <View style={styles.formCard}>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            placeholder="e.g., Generate 3 multiple-choice questions about World Geography"
            placeholderTextColor="#A3A3A3"
            value={prompt}
            onChangeText={setPrompt}
            multiline
          />
          <TouchableOpacity style={styles.addButton} onPress={handleGenerate}>
            <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Generate Questions</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <Animated.View
            style={[
              styles.loadingOverlay,
              { opacity: bgFadeAnim },
            ]}
          >
            <View style={styles.loadingCard}>
              <View style={styles.loaderContainer}>
                <Animated.View
                  style={[
                    styles.loaderDot,
                    { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.loaderDot,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { scale: fadeAnim },
                        { translateX: fadeAnim.interpolate({ inputRange: [0.4, 1], outputRange: [10, 0] }) },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.loaderDot,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { scale: fadeAnim },
                        { translateX: fadeAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-10, 0] }) },
                      ],
                    },
                  ]}
                />
              </View>
              <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
                Generating Questions...
              </Animated.Text>
            </View>
          </Animated.View>
        )}

        {generated.length > 0 && (
          <View style={styles.questionsCard}>
            <Text style={styles.cardTitle}>Generated Questions ({generated.length})</Text>
            {generated.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <View style={styles.questionContent}>
                  <Text style={styles.questionText}>
                    {index + 1}. {question.QuestionText} (
                    {questionTypes.find((t) => t.value === question.QuestionType)?.label}
                    , {question.TimeLimit}s)
                  </Text>
                  {question.QuestionType === "mc" && question.CorrectAnswer && (
                    <Text style={styles.correctAnswerText}>
                      Correct Answer: {question.CorrectAnswer}
                    </Text>
                  )}
                  {question.QuestionType === "open" && question.CorrectAnswer && (
                    <Text style={styles.correctAnswerText}>
                      Expected Answer: {question.CorrectAnswer}
                    </Text>
                  )}
                  {question.QuestionType === "truefalse" && (
                    <Text style={styles.correctAnswerText}>
                      Answer: {question.IsTrue ? "True" : "False"}
                    </Text>
                  )}
                  {question.QuestionType === "matching" && question.Pairs && (
                    <Text style={styles.correctAnswerText}>
                      Pairs: {JSON.parse(question.Pairs).map((p) => `${p.left} -> ${p.right}`).join(", ")}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleProceed}>
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
    </KeyboardAvoidingView>
  );
}

const questionTypes = [
  { label: "Open-Ended", value: "open", icon: "pencil-outline" },
  { label: "Multiple Choice", value: "mc", icon: "checkmark-circle-outline" },
  { label: "True/False", value: "truefalse", icon: "help-circle-outline" },
  { label: "Matching", value: "matching", icon: "swap-horizontal-outline" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FC",
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 36,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 28,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2B3A67",
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#667085",
    marginTop: 6,
    fontWeight: "400",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  questionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#2B3A67",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#E27C48",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6B7280",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  questionItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  correctAnswerText: {
    fontSize: 14,
    color: "#059669",
    marginTop: 6,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    width: "80%",
    maxWidth: 300,
  },
  loaderContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E27C48",
    marginHorizontal: 6,
  },
  loadingText: {
    color: "#2B3A67",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});