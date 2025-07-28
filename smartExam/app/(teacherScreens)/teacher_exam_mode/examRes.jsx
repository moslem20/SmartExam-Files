import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = 'http://smartexam.somee.com/api';

const ExamResults = () => {
  const { examId, className } = useLocalSearchParams();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [gradeInputs, setGradeInputs] = useState({});
  const [correctness, setCorrectness] = useState({});
  const [classExamId, setClassExamId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [aiGrading, setAiGrading] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchClassExamId = async () => {
      try {
        console.log('Fetching ClassExamId for examId:', examId);
        const response = await axios.get(`${baseURL}/ClassExams/exam/${examId}/class-exam-id`);
        const fetchedClassExamId = response.data;
        if (!fetchedClassExamId) {
          throw new Error('No ClassExamId returned for the provided ExamId.');
        }
        setClassExamId(fetchedClassExamId);
      } catch (error) {
        console.error('Error fetching ClassExamId:', error);
        Alert.alert(
          'Error',
          error.response?.status === 404
            ? 'No ClassExam found for this ExamId.'
            : 'Failed to fetch exam details. Please try again.'
        );
        setLoading(false);
      }
    };

    if (examId) {
      fetchClassExamId();
    } else {
      Alert.alert('Error', 'No ExamId provided.');
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!classExamId) return;

      try {
        setLoading(true);

        // Fetch questions
        let fetchedQuestions = [];
        try {
          const questionsResponse = await axios.get(`${baseURL}/Questions/by-exam/${examId}`);
          fetchedQuestions = questionsResponse.data || [];
        } catch (error) {
          if (error.response?.status === 404) {
            Alert.alert('Warning', 'No questions found for this exam. Displaying answers only.');
          } else throw error;
        }
        setQuestions(fetchedQuestions);

        // Fetch answers
        const answersResponse = await axios.get(`${baseURL}/Questions/answers/by-exam/${classExamId}`);
        const answers = answersResponse.data || [];

        // Group answers by studentId and questionId, keep most recent answer
        const studentResults = {};
        answers.forEach((answer) => {
          const studentId = answer.studentId || 'Unknown';
          const questionId = answer.questionId;
          if (!studentResults[studentId]) {
            studentResults[studentId] = {
              id: studentId,
              answers: {},
              averageGrade: null,
              checked: false,
            };
          }
          const currentAnswer = studentResults[studentId].answers[questionId];
          if (!currentAnswer || new Date(answer.submittedDate) > new Date(currentAnswer.submittedDate)) {
            studentResults[studentId].answers[questionId] = {
              answerId: answer.answerId,
              questionId: answer.questionId,
              answerText: answer.answerText || 'No answer provided',
              grade: answer.grade ? answer.grade.toString() : 'N/A',
              gradeId: answer.gradeId || null,
              submittedDate: answer.submittedDate,
            };
          }
        });

        // Convert answers object to array and calculate local average grade
        let formattedResults = Object.values(studentResults).map((student) => {
          const answersArray = Object.values(student.answers);
          const grades = answersArray
            .filter((a) => a.grade !== 'N/A')
            .map((a) => parseFloat(a.grade));
          return {
            ...student,
            answers: answersArray,
            averageGrade: grades.length > 0
              ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2)
              : 'N/A',
            checked: false,
          };
        });

        // Fetch official grades per student from Grades API
        const fetchOfficialGrades = async () => {
          const updatedResults = await Promise.all(
            formattedResults.map(async (student) => {
              try {
                const res = await axios.get(`${baseURL}/Grades/exam/${examId}/student/${student.id}`);
                if (res.data && res.data.grade !== null && res.data.grade !== undefined) {
                  return {
                    ...student,
                    averageGrade: res.data.grade.toString(),
                    checked: true,
                    gradeId: res.data.gradeId,
                  };
                }
              } catch (error) {
                if (error.response?.status !== 404) {
                  console.error(`Failed to fetch grade for student ${student.id}:`, error.message);
                }
              }
              return student;
            })
          );
          return updatedResults;
        };

        formattedResults = await fetchOfficialGrades();
        setResults(formattedResults);
      } catch (error) {
        console.error('Fetch data error:', error);
        Alert.alert(
          'Error',
          error.response?.status === 404
            ? 'No answers found for this exam.'
            : 'Failed to fetch exam data. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classExamId]);

  const handleViewAnswers = (studentId, isEditMode = false) => {
    try {
      const student = results.find((r) => r.id === studentId);
      if (!student) {
        Alert.alert('Error', 'Student not found.');
        return;
      }

      setIsEditing(isEditMode);
      setSelectedGradeId(isEditMode ? student.gradeId : null);

      // Map each question to a detailed answer object
      const studentAnswers = questions.map((question) => {
        const qId = question.questionId.toLowerCase();

        // Match answer by questionId case-insensitively
        const answer = student.answers.find(
          (a) => a.questionId.toLowerCase() === qId
        );

        let studentAnswerText = 'No answer provided';

        if (answer && answer.answerText != null) {
          if (question.questionType?.toLowerCase() === 'mc') {
            // Handle multiple choice by showing the selected option
            const options = typeof question.options === 'string'
              ? question.options.split(',').map(opt => opt.trim())
              : [];

            const selectedOption = options.find(
              (opt) => opt.toLowerCase() === answer.answerText.trim().toLowerCase()
            );

            studentAnswerText = selectedOption || answer.answerText;
          } else {
            // Handle open-ended or other types
            studentAnswerText = answer.answerText;
          }
        }

        return {
          questionId: question.questionId,
          questionText: question.questionText || 'No question text available',
          studentAnswer: studentAnswerText,
          correctAnswer:
            question.questionType?.toLowerCase() === 'truefalse'
              ? question.isTrue != null
                ? question.isTrue.toString()
                : 'Not specified'
              : question.correctAnswer || 'Not specified',
          answerId: answer?.answerId || `${studentId}-${question.questionId}-${Date.now()}`,
          grade: answer?.grade || '',
          gradeId: answer?.gradeId || null,
          id: studentId,
        };
      });

      // Fallback if no questions exist: use just student.answers
      const fallbackAnswers = student.answers.map((answer) => ({
        questionId: answer.questionId,
        questionText: 'Question text not available',
        studentAnswer: answer.answerText || 'No answer provided',
        correctAnswer: 'Not specified',
        answerId: answer.answerId || `${studentId}-${answer.questionId}-${Date.now()}`,
        grade: answer.grade || '',
        gradeId: answer.gradeId || null,
        id: studentId,
      }));

      const answersToUse = studentAnswers.length > 0 ? studentAnswers : fallbackAnswers;

      // Initialize grade inputs and correctness statuses
      const initialGrades = answersToUse.reduce(
        (acc, q) => ({ ...acc, [q.answerId]: q.grade }),
        {}
      );

      const initialCorrectness = answersToUse.reduce((acc, q) => ({
        ...acc,
        [q.answerId]: q.grade && q.grade !== 'N/A'
          ? parseFloat(q.grade) >= 50
            ? 'correct'
            : parseFloat(q.grade) > 0
            ? 'half'
            : 'incorrect'
          : null,
      }), {});

      setSelectedAnswers(answersToUse);
      setGradeInputs(initialGrades);
      setCorrectness(initialCorrectness);
    } catch (error) {
      console.error('Error preparing answer details:', error);
      Alert.alert('Error', 'Failed to load answer details.');
    }
  };

  const handleAiCheck = async (studentId) => {
    try {
      setAiGrading(true);
      const student = results.find((r) => r.id === studentId);
      if (!student) {
        Alert.alert('Error', 'Student not found.');
        return;
      }

      // Prepare answers for AI grading
      const studentAnswers = questions.map((question) => {
        const qId = question.questionId.toLowerCase();
        const answer = student.answers.find((a) => a.questionId.toLowerCase() === qId);
        return {
          questionId: question.questionId,
          questionText: question.questionText || 'No question text available',
          studentAnswer: answer?.answerText || 'No answer provided',
          correctAnswer:
            question.questionType?.toLowerCase() === 'truefalse'
              ? question.isTrue != null
                ? question.isTrue.toString()
                : 'Not specified'
              : question.correctAnswer || 'Not specified',
          questionType: question.questionType?.toLowerCase() || 'unknown',
          options: question.options || null,
          answerId: answer?.answerId || `${studentId}-${question.questionId}-${Date.now()}`,
          id: studentId,
        };
      });

      const fallbackAnswers = student.answers.map((answer) => ({
        questionId: answer.questionId,
        questionText: 'Question text not available',
        studentAnswer: answer.answerText || 'No answer provided',
        correctAnswer: 'Not specified',
        questionType: 'unknown',
        options: null,
        answerId: answer.answerId || `${studentId}-${answer.questionId}-${Date.now()}`,
        id: studentId,
      }));

      const answersToGrade = studentAnswers.length > 0 ? studentAnswers : fallbackAnswers;

      // Prepare AI prompt
      const aiPrompt = `
Grade the following student answers by comparing them to the correct answers. Assign a grade between 0 and 100 based on accuracy.

Input:
${JSON.stringify(answersToGrade, null, 2)}

Instructions:
- For multiple-choice (mc) questions, assign 100 if the student answer exactly matches the correct answer, 0 otherwise.
- For true/false (truefalse) questions, assign 100 if the student answer matches the correct answer, 0 otherwise.
- For open-ended (open) questions, evaluate the student answer's semantic similarity to the correct answer. Assign a grade (0-100) based on how closely the answer matches in meaning, considering partial credit (e.g., 50 for partially correct answers).
- For matching (matching) questions, assign 100 if all pairs match perfectly, otherwise scale the grade based on the proportion of correct pairs.
- If the student answer is "No answer provided" or empty, assign 0.
- Return the response in the following JSON structure (JSON only, no explanation):

[
  {
    "answerId": "string",
    "grade": number
  }
]

Ensure:
- Grades are integers between 0 and 100.
- Each answerId matches the input answerId.
`;

      // Call AI API
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyACVQOs3LZX3eE13e27VwNxIJT72FOjMDc`,
        {
          contents: [{ parts: [{ text: aiPrompt }] }],
        }
      );

      const rawText = resp.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonStart = rawText.indexOf("[");
      const jsonEnd = rawText.lastIndexOf("]");
      const jsonString = rawText.substring(jsonStart, jsonEnd + 1);

      let aiGrades;
      try {
        aiGrades = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON parse failed:", parseError);
        Alert.alert("Error", "Could not parse AI grades. Ensure the AI returns valid JSON.");
        return;
      }

      // Validate AI grades
      for (const grade of aiGrades) {
        if (!grade.answerId || !Number.isInteger(grade.grade) || grade.grade < 0 || grade.grade > 100) {
          throw new Error("Invalid AI grade format.");
        }
      }

      // Update gradeInputs and correctness
      const newGradeInputs = { ...gradeInputs };
      const newCorrectness = { ...correctness };
      aiGrades.forEach(({ answerId, grade }) => {
        newGradeInputs[answerId] = grade.toString();
        newCorrectness[answerId] = grade >= 50 ? (grade === 100 ? 'correct' : 'half') : 'incorrect';
      });

      setGradeInputs(newGradeInputs);
      setCorrectness(newCorrectness);
      setSelectedAnswers(answersToGrade);
      setIsEditing(true);
      setSelectedGradeId(student.gradeId || null);

      Alert.alert("Success", "AI grading completed! Review and save the grades.");
    } catch (error) {
      console.error("AI grading error:", error);
      Alert.alert("Error", error.message || "AI grading failed. Please try again.");
    } finally {
      setAiGrading(false);
    }
  };

  const handleFeedback = async (student) => {
    try {
      const user = await AsyncStorage.getItem('loggedInUser');
      const parsedUser = user ? JSON.parse(user) : null;
      if (!parsedUser || !parsedUser.email) {
        Alert.alert('Error', 'Teacher email not found. Please log in again.');
        return;
      }
      setSelectedStudent(student);
      setFeedbackText('');
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error('Error opening feedback modal:', error);
      Alert.alert('Error', 'Failed to open feedback modal.');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedStudent || !selectedStudent.gradeId) {
      Alert.alert('Error', 'No grade selected for feedback.');
      return;
    }
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Feedback text is required.');
      return;
    }

    try {
      const user = await AsyncStorage.getItem('loggedInUser');
      const parsedUser = user ? JSON.parse(user) : null;
      if (!parsedUser || !parsedUser.email) {
        Alert.alert('Error', 'Teacher email not found. Please log in again.');
        return;
      }

      const feedbackPayload = {
        gradeId: selectedStudent.gradeId,
        teacherEmail: parsedUser.email,
        feedbackText: feedbackText.trim(),
      };

      console.log('Submitting feedback payload:', JSON.stringify(feedbackPayload, null, 2));
      await axios.post(`${baseURL}/Grades/feedback`, feedbackPayload);

      Alert.alert('Success', 'Feedback submitted successfully.');
      setFeedbackModalVisible(false);
      setFeedbackText('');
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error submitting feedback:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit feedback.');
    }
  };

  const handleSaveGrade = async () => {
    try {
      // Validate all grades
      for (const answer of selectedAnswers) {
        const grade = gradeInputs[answer.answerId];
        if (
          grade === undefined ||
          grade === '' ||
          isNaN(grade) ||
          parseFloat(grade) < 0 ||
          parseFloat(grade) > 100
        ) {
          Alert.alert(
            'Error',
            `Please enter a valid grade between 0 and 100 for "${answer.questionText}".`
          );
          return;
        }
      }

      // Create new answer records in StudentAnswers
      const studentId = selectedAnswers[0]?.id;
      const answerSubmission = {
        ExamId: parseInt(examId),
        StudentId: studentId,
        Timestamp: new Date().toISOString(),
        Answers: selectedAnswers.map((answer) => ({
          QuestionId: answer.questionId,
          AnswerText: answer.studentAnswer,
          Grade: Math.round(parseFloat(gradeInputs[answer.answerId])),
        })),
      };

      try {
        console.log('Submitting answers payload (POST):', JSON.stringify(answerSubmission, null, 2));
        await axios.post(`${baseURL}/Questions/answers`, answerSubmission);
      } catch (error) {
        console.error(
          `Failed to create answers for student ${studentId}:`,
          error.response ? JSON.stringify(error.response.data, null, 2) : error.message
        );
        throw new Error('Failed to save answer grades.');
      }

      // Calculate average grade and create or update grade in Grades
      const gradedAnswers = selectedAnswers.filter(
        (a) => gradeInputs[a.answerId] !== 'N/A'
      );
      const totalGrade = gradedAnswers.reduce(
        (sum, a) => sum + parseFloat(gradeInputs[a.answerId]),
        0
      );
      const averageGrade =
        gradedAnswers.length > 0
          ? Math.round(totalGrade / gradedAnswers.length)
          : 0;

      const gradePayload = {
        gradeId: selectedGradeId,
        studentId,
        courseName: className || 'Unknown Course',
        grade: averageGrade,
        examId: parseInt(examId),
      };

      if (isEditing && selectedGradeId) {
        try {
          console.log('Submitting grade update payload (PUT):', JSON.stringify(gradePayload, null, 2));
          await axios.put(`${baseURL}/Grades/${selectedGradeId}`, gradePayload);
        } catch (error) {
          console.error(
            `Failed to update grade for student ${studentId}:`,
            error.response ? JSON.stringify(error.response.data, null, 2) : error.message
          );
          throw new Error('Failed to update grade.');
        }
      } else {
        try {
          console.log('Submitting grade creation payload (POST):', JSON.stringify(gradePayload, null, 2));
          await axios.post(`${baseURL}/Grades`, gradePayload);
        } catch (error) {
          console.error(
            `Failed to create grade for student ${studentId}:`,
            error.response ? JSON.stringify(error.response.data, null, 2) : error.message
          );
          throw new Error('Failed to create new grade.');
        }
      }

      // Update local results state
      const updatedResults = results.map((student) => {
        if (student.id === studentId) {
          const updatedAnswers = selectedAnswers.map((answer) => ({
            answerId: `${student.id}-${answer.questionId}-${Date.now()}`,
            questionId: answer.questionId,
            answerText: answer.studentAnswer,
            grade: gradeInputs[answer.answerId].toString(),
            submittedDate: new Date().toISOString(),
          }));
          return {
            ...student,
            answers: updatedAnswers,
            averageGrade: averageGrade.toString(),
            checked: true,
            gradeId: isEditing ? student.gradeId : student.gradeId || selectedGradeId,
          };
        }
        return student;
      });

      setResults(updatedResults);
      setSelectedAnswers([]);
      setGradeInputs({});
      setCorrectness({});
      setIsEditing(false);
      setSelectedGradeId(null);
      Alert.alert('Success', `Grades ${isEditing ? 'updated' : 'saved'} successfully.`);
    } catch (error) {
      console.error('Error saving grades:', error.message);
      Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'save'} grades.`);
    }
  };

  const handleCorrectness = (answerId, status) => {
    setCorrectness((prev) => ({ ...prev, [answerId]: status }));
    if (status === 'correct') setGradeInputs((prev) => ({ ...prev, [answerId]: '100' }));
    else if (status === 'half') setGradeInputs((prev) => ({ ...prev, [answerId]: '50' }));
    else if (status === 'incorrect') setGradeInputs((prev) => ({ ...prev, [answerId]: '0' }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="hourglass-outline" size={24} color="#2B3A67" />
        <Text style={styles.loadingText}>Loading exam results...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Exam Results</Text>
        <Text style={styles.headerSubtitle}>Results for Exam ID: {examId}</Text>
      </View>

      <View style={styles.resultsCard}>
        <Text style={styles.sectionTitle}>Student Results</Text>
        {results.length === 0 ? (
          <Text style={styles.emptyText}>No results available.</Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.resultRow}>
                <Text style={styles.resultCell}>{item.id}</Text>
                <Text style={styles.resultCell}>{item.averageGrade}</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.answerButton, { flex: 1 }]}
                    onPress={() => handleViewAnswers(item.id, item.checked)}
                    disabled={aiGrading}
                  >
                    <Text style={styles.answerButtonText}>{item.checked ? 'Edit Grade' : 'View Answers'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aiButton, { flex: 1 }, aiGrading && styles.disabledButton]}
                    onPress={() => handleAiCheck(item.id)}
                    disabled={aiGrading}
                  >
                    <Text style={styles.answerButtonText}>AI Check</Text>
                  </TouchableOpacity>
                  {item.checked && (
                    <TouchableOpacity
                      style={[styles.feedbackButton, { flex: 1 }]}
                      onPress={() => handleFeedback(item)}
                      disabled={aiGrading}
                    >
                      <Text style={styles.answerButtonText}>Feedback</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.resultCell, styles.checkStatus, item.checked ? styles.checked : styles.unchecked]}>
                  {item.checked ? 'Checked' : 'Pending'}
                </Text>
              </View>
            )}
            scrollEnabled={false}
            ListHeaderComponent={() => (
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Student ID</Text>
                <Text style={styles.headerCell}>Grade</Text>
                <Text style={styles.headerCell}>Actions</Text>
                <Text style={styles.headerCell}>Status</Text>
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={selectedAnswers.length > 0}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedAnswers([]);
          setGradeInputs({});
          setCorrectness({});
          setIsEditing(false);
          setSelectedGradeId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? `Edit Grades for Student ${selectedAnswers[0]?.id}` : `Answer Details for Student ${selectedAnswers[0]?.id}`}
              </Text>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {selectedAnswers.map((answer, index) => (
                <View key={answer.answerId || index} style={styles.answerSection}>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  <Text style={styles.questionText}>{answer.questionText}</Text>

                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Student Answer:</Text>
                    <Text style={styles.answerValue}>{answer.studentAnswer}</Text>
                  </View>

                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Correct Answer:</Text>
                    <Text style={styles.answerValue}>{answer.correctAnswer}</Text>
                  </View>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
                  >
                    <TextInput
                      style={styles.gradeInput}
                      placeholder="Enter grade (0-100)"
                      placeholderTextColor="#A3A3A3"
                      keyboardType="numeric"
                      value={gradeInputs[answer.answerId] || ''}
                      onChangeText={(text) => setGradeInputs((prev) => ({ ...prev, [answer.answerId]: text }))}
                    />
                  </KeyboardAvoidingView>

                  <View style={styles.correctnessButtons}>
                    <TouchableOpacity
                      style={[styles.correctnessButton, correctness[answer.answerId] === 'correct' && styles.selectedButton]}
                      onPress={() => handleCorrectness(answer.answerId, 'correct')}
                    >
                      <Text style={styles.correctnessButtonText}>Correct</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.correctnessButton, correctness[answer.answerId] === 'half' && styles.selectedButton]}
                      onPress={() => handleCorrectness(answer.answerId, 'half')}
                    >
                      <Text style={styles.correctnessButtonText}>Half</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.correctnessButton, correctness[answer.answerId] === 'incorrect' && styles.selectedButton]}
                      onPress={() => handleCorrectness(answer.answerId, 'incorrect')}
                    >
                      <Text style={styles.correctnessButtonText}>Incorrect</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGrade}>
                <Text style={styles.saveButtonText}>{isEditing ? 'Update Grades' : 'Save All Grades'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setSelectedAnswers([]);
                  setGradeInputs({});
                  setCorrectness({});
                  setIsEditing(false);
                  setSelectedGradeId(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setFeedbackModalVisible(false);
          setFeedbackText('');
          setSelectedStudent(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Provide Feedback for Student {selectedStudent?.id}
              </Text>
            </View>

            <View style={styles.modalScrollContent}>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Student Grade:</Text>
                <Text style={styles.answerValue}>{selectedStudent?.averageGrade || 'N/A'}</Text>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
              >
                <TextInput
                  style={[styles.gradeInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Enter feedback..."
                  placeholderTextColor="#A3A3A3"
                  multiline
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                />
              </KeyboardAvoidingView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmitFeedback}>
                <Text style={styles.saveButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setFeedbackModalVisible(false);
                  setFeedbackText('');
                  setSelectedStudent(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F1ED',
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 32,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2B3A67',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '400',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3A67',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerCell: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B3A67',
    flex: 1,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  resultCell: {
    fontSize: 15,
    color: '#2D2D2D',
    flex: 1,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'column',
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  answerButton: {
    backgroundColor: '#E27C48',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  aiButton: {
    backgroundColor: '#2B3A67',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  feedbackButton: {
    backgroundColor: '#191970',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
  },
  answerButtonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  checkStatus: {
    fontWeight: '500',
  },
  checked: {
    color: '#2E7D32',
  },
  unchecked: {
    color: '#D32F2F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F1ED',
  },
  loadingText: {
    fontSize: 16,
    color: '#2B3A67',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3A67',
    textAlign: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  answerSection: {
    marginVertical: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B3A67',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 15,
    color: '#2D2D2D',
    marginBottom: 12,
    lineHeight: 22,
  },
  answerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  answerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B3A67',
    width: 120,
  },
  answerValue: {
    fontSize: 15,
    color: '#2D2D2D',
    flex: 1,
    lineHeight: 22,
  },
  gradeInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    fontWeight: '400',
    color: '#2D2D2D',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  correctnessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 8,
  },
  correctnessButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  selectedButton: {
    backgroundColor: '#2B3A67',
    borderColor: '#2B3A67',
  },
  correctnessButtonText: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#E27C48',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#6B7280',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExamResults;