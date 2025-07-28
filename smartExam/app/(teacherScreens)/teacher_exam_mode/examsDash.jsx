import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const baseURL = 'http://smartexam.somee.com/api';

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Completed', value: 'Completed' },
];

const ExamCard = ({ exam, isCompleted, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.examCard}>
    <Text style={styles.examTitle}>{exam.title}</Text>
    <Text style={styles.examDetail}>Class: {exam.className}</Text>
    <Text style={styles.examDetail}>Date: {exam.examDate}</Text>
    <Text style={styles.examDetail}>Students Assigned: {exam.studentsAssigned}</Text>
    {isCompleted && (
      <>
        <Text style={styles.viewResults}>View Results</Text>
      </>
    )}
  </TouchableOpacity>
);

const FilterButton = ({ title, options, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.filterButtonText}>{selected || title}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#704C9F" />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option.value === 'all' ? '' : option.value);
                  setIsOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function TeacherExamDashboard() {
  const navigation = useNavigation();
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classOptions, setClassOptions] = useState([{ label: 'All Classes', value: 'all' }]);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTeacherEmail = async () => {
      try {
        const userData = await AsyncStorage.getItem('loggedInUser');
        console.log('User data from AsyncStorage:', userData);
        if (userData) {
          const user = JSON.parse(userData);
          console.log('Parsed user:', user);
          if (user.role === 'teacher' && user.email) {
            setTeacherEmail(user.email.toLowerCase()); // Normalize email
          } else {
            Alert.alert('Error', 'Teacher email not found. Please log in again.');
          }
        } else {
          Alert.alert('Error', 'Please log in to access classes.');
        }
      } catch (error) {
        console.error('Error fetching teacher email:', error);
        Alert.alert('Error', 'Failed to load user data.');
      }
    };

    getTeacherEmail();
  }, []);

  useEffect(() => {
    if (teacherEmail) {
      const fetchClasses = async () => {
        try {
          console.log('Fetching classes for email:', teacherEmail);
          const response = await axios.get(`${baseURL}/Classes/teacher/${teacherEmail}`);
          console.log('Classes response:', response.data);
          const mappedClasses = response.data.map((course) => ({
            label: course.courseName,
            value: course.id,
          }));
          setClassOptions([{ label: 'All Classes', value: 'all' }, ...mappedClasses]);
        } catch (error) {
          console.error('Fetch classes error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          Alert.alert('Error', 'Failed to fetch classes.');
        }
      };
      

      fetchClasses();
    }
  }, [teacherEmail]);

  useEffect(() => {
    if (teacherEmail && classOptions.length > 1) {
      const fetchExams = async () => {
        try {
          setLoading(true);
          console.log('Fetching exams for email:', teacherEmail);
          console.log('Request URL:', `${baseURL}/Classes/teacher/${teacherEmail}/exams`);
          const response = await axios.get(`${baseURL}/Classes/teacher/${teacherEmail}/exams`);
          console.log('Exams response:', response.data);
          const exams = response.data || []; // Fallback to empty array

          const currentDate = new Date();
          const tenDaysAgo = new Date(currentDate);
          tenDaysAgo.setDate(currentDate.getDate() - 10);

          const upcoming = exams
            .filter((exam) => new Date(exam.examDate) >= currentDate)
            .map((exam) => ({
              id: exam.examId.toString(),
              title: exam.title,
              examDate: exam.examDate.split('T')[0],
              classId: exam.classId,
              className: classOptions.find((opt) => opt.value === exam.classId)?.label || exam.course || 'Unknown',
              studentsAssigned: exam.studentsAssigned || 0,
              status: 'Scheduled',
            }));
          const completed = exams
            .filter((exam) => new Date(exam.examDate) < currentDate && new Date(exam.examDate) >= tenDaysAgo)
            .map((exam) => ({
              id: exam.examId.toString(),
              title: exam.title,
              examDate: exam.examDate.split('T')[0],
              classId: exam.classId,
              className: classOptions.find((opt) => opt.value === exam.classId)?.label || exam.course || 'Unknown',
              studentsAssigned: exam.studentsAssigned || 0,
              status: 'Completed',
            }));

          setUpcomingExams(upcoming);
          setCompletedExams(completed);
        } catch (error) {
          console.error('Fetch exams error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.data,
          });
          Alert.alert('Error', `Failed to fetch exams: ${error.response?.data || error.message}`);
        } finally {
          setLoading(false);
        }
      };

      fetchExams();
    }
  }, [teacherEmail, classOptions]);

  useEffect(() => {
  console.log('Filters updated:', {
    classFilter,
    statusFilter,
    filteredUpcomingCount: filteredUpcoming.length,
    filteredCompletedCount: filteredCompleted.length,
  });
}, [classFilter, statusFilter]);

  const filteredUpcoming = upcomingExams.filter(
    (exam) =>
      (!classFilter || exam.classId === classFilter) &&
      (!statusFilter || exam.status === statusFilter)
  );
  const filteredCompleted = completedExams.filter(
    (exam) =>
      (!classFilter || exam.classId === classFilter) &&
      (!statusFilter || exam.status === statusFilter)
  ).reverse(); // Reverse the filtered completed exams to show new to old

  const totalExams = upcomingExams.length + completedExams.length;
  const upcomingExamsCount = upcomingExams.length;
  const completedExamsCount = completedExams.length;
  const pendingGrading = completedExams.filter(
    (exam) => exam.averageScore === 0 || exam.averageScore === undefined
  ).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📘 Exams Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage and review your exams</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Exam Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalExams}</Text>
            <Text style={styles.summaryLabel}>Total Exams</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{upcomingExamsCount}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{completedExamsCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pendingGrading}</Text>
            <Text style={styles.summaryLabel}>Pending Grading</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => navigation.navigate('createExam')}
          style={[styles.actionButton, styles.createButton]}
        >
          <MaterialIcons name="add-circle-outline" size={22} color="white" />
          <Text style={styles.actionButtonText}>Create New Exam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('teacherCalendar')}
          style={[styles.actionButton, styles.navButton]}
        >
          <Ionicons name="calendar-outline" size={22} color="white" />
          <Text style={styles.actionButtonText}>View Calendar</Text>
        </TouchableOpacity>
        {/*
<TouchableOpacity
  onPress={() => navigation.navigate('reports')}
  style={[styles.actionButton, styles.navButton]}
>
  <Ionicons name="stats-chart-outline" size={22} color="white" />
  <Text style={styles.actionButtonText}>Get Reports</Text>
</TouchableOpacity>
*/}

      </View>

      <View style={styles.filterRow}>
        <FilterButton
          title="Filter by Class"
          options={classOptions}
          selected={classOptions.find((opt) => opt.value === classFilter)?.label}
          onSelect={setClassFilter}
        />
        <FilterButton
          title="Filter by Status"
          options={statusOptions}
          selected={statusOptions.find((opt) => opt.value === statusFilter)?.label}
          onSelect={setStatusFilter}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Upcoming Exams</Text>
        {loading ? (
          <Text style={styles.emptyText}>Loading exams...</Text>
        ) : filteredUpcoming.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming exams.</Text>
        ) : (
          <FlatList
            data={filteredUpcoming}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExamCard
                exam={item}
                isCompleted={false}
                onPress={() =>
                  navigation.navigate('examsDetails', { examId: item.id })
                }
              />
            )}
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Completed Exams</Text>
        {loading ? (
          <Text style={styles.emptyText}>Loading exams...</Text>
        ) : filteredCompleted.length === 0 ? (
          <Text style={styles.emptyText}>No completed exams in the last 10 days.</Text>
        ) : (
          <FlatList
            data={filteredCompleted}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExamCard
                exam={item}
                isCompleted={true}
                onPress={() =>
                  navigation.navigate('examRes', { examId: item.id , className: item.className  })
                }
              />
            )}
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
    backgroundColor: "#F3F4F6", // Subtle neutral background
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#704C9F",
    fontFamily: "System",
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#4B5563",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#704C9F",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E27C48",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  createButton: {
    backgroundColor: "#E27C48",
  },
  navButton: {
    backgroundColor: "#704C9F",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  filterContainer: {
    flex: 1,
    marginHorizontal: 4,
    zIndex: 1000,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1001,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#704C9F",
    fontWeight: "500",
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    zIndex: 1002,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#704C9F",
    marginBottom: 10,
  },
  examCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B4B4B",
  },
  examDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  viewResults: {
    fontSize: 14,
    color: "#E27C48",
    fontWeight: "600",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
});
