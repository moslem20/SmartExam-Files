import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const baseURL = 'http://smartexam.somee.com/api';

const QuestionCard = ({ question, index }) => {
  const options = question.options ? question.options.split(',') : [];
  const imageFilename = question.imageUrl ? question.imageUrl.split('/').pop() : null;

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionTitle}>Question {index + 1}</Text>
      <Text style={styles.questionText}>{question.questionText}</Text>
      <Text style={styles.questionDetail}>Type: {question.questionType}</Text>
      {imageFilename && (
        <Image
          source={{ uri: `${baseURL}/Questions/images/${imageFilename}` }}
          style={styles.questionImage}
          resizeMode="contain"
          onError={(e) => console.log(`Image load error for ${imageFilename}:`, e.nativeEvent.error)}
        />
      )}
      {question.questionType === 'Multiple Choice' && options.length > 0 && (
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>Options:</Text>
          {options.map((option, idx) => (
            <Text key={idx} style={styles.optionText}>
              {idx + 1}. {option}
            </Text>
          ))}
          <Text style={styles.questionDetail}>
            Correct Answer: {question.correctAnswer || 'Not specified'}
          </Text>
        </View>
      )}
      {question.questionType === 'True/False' && (
        <Text style={styles.questionDetail}>
          Correct Answer: {question.isTrue !== null ? question.isTrue.toString() : 'Not specified'}
        </Text>
      )}
      {question.questionType === 'Essay' && question.answer && (
        <Text style={styles.questionDetail}>Sample Answer: {question.answer}</Text>
      )}
    </View>
  );
};

export default function examsDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { examId } = route.params;
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [bgFadeAnim] = useState(new Animated.Value(0.8));

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
      bgFadeAnim.setValue(0.8);
    }
  }, [loading]);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);

        console.log('Fetching exam details for examId:', examId);
        const examResponse = await axios.get(`${baseURL}/Exams/${examId}`);
        console.log('Exam details response:', examResponse.data);
        console.log('Raw exam data:', JSON.stringify(examResponse.data, null, 2));

        const examData = examResponse.data;
        setExam({
          id: examData.examId.toString(),
          title: examData.title,
          className: examData.course || 'Unknown',
          examDate: examData.examDate.split('T')[0],
          time: examData.time || 'N/A',
          description: examData.description || 'No description provided',
          studentsAssigned: examData.studentsAssigned || 0,
          status: new Date(examData.examDate) < new Date() ? 'Completed' : 'Scheduled',
        });

        console.log('Fetching questions for examId:', examId);
        const questionsResponse = await axios.get(`${baseURL}/Questions/by-exam/${examId}`);
        console.log('Questions response:', questionsResponse.data);

        setQuestions(
          questionsResponse.data.map((q, index) => ({
            id: q.questionId,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points || 0,
            options: q.options,
            correctAnswer: q.correctAnswer,
            isTrue: q.isTrue,
            answer: q.answer,
            imageUrl: q.imageUrl,
          }))
        );
      } catch (error) {
        console.error('Fetch exam details error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        Alert.alert('Error', `Failed to fetch exam details: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamDetails();
    }
  }, [examId]);

  const handleDeleteExam = async () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this exam? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.delete(`${baseURL}/Exams/${examId}`);
              Alert.alert('Success', 'Exam deleted successfully.');
              navigation.goBack();
            } catch (error) {
              console.error('Delete exam error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
              });
              Alert.alert('Error', `Failed to delete exam: ${error.response?.data?.message || error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
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
            Loading Exam Details...
          </Animated.Text>
        </View>
      </Animated.View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Exam not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{exam.title}</Text>
        <Text style={styles.headerSubtitle}>Exam Details</Text>
      </View>

      <View style={styles.examDetailsCard}>
        <Text style={styles.sectionTitle}>📋 Exam Information</Text>
        <Text style={styles.examDetail}>Class: {exam.className}</Text>
        <Text style={styles.examDetail}>Date: {exam.examDate}</Text>
        <Text style={styles.examDetail}>Time: {exam.time}</Text>
        <Text style={styles.examDetail}>Description: {exam.description}</Text>
        <Text style={styles.examDetail}>Students Assigned: {exam.studentsAssigned}</Text>
        <Text style={styles.examDetail}>Status: {exam.status}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteExam}
        >
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.deleteButtonText}>Delete Exam</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.questionsSection}>
        <Text style={styles.sectionTitle}>❓ Questions</Text>
        {questions.length === 0 ? (
          <Text style={styles.emptyText}>No questions found for this exam.</Text>
        ) : (
          <FlatList
            data={questions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <QuestionCard question={item} index={index} />}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4E2D8',
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#704C9F',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#4B4B4B',
    marginTop: 4,
  },
  examDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#704C9F',
    marginBottom: 12,
  },
  examDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  questionsSection: {
    marginBottom: 24,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#704C9F',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  questionDetail: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#704C9F',
    marginBottom: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    marginBottom: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    width: '80%',
    maxWidth: 300,
  },
  loaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E27C48',
    marginHorizontal: 6,
  },
  loadingText: {
    color: '#704C9F',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E27C48',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});