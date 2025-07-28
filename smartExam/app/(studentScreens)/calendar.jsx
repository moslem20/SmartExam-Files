import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCalendar from "expo-calendar";
import axios from "axios";
import { baseURL } from "../../baseUrl";

const todayDate = new Date().toISOString().split("T")[0];

export default function ExamCalendar() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [examData, setExamData] = useState({});
  const [studentId, setStudentId] = useState(null);

  const API_URL = `${baseURL}/Classes/student`;

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const userData = await AsyncStorage.getItem("loggedInUser");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === "student" && user.studentId) {
            setStudentId(user.studentId);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchStudentData();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        if (!studentId) return;

        const response = await axios.get(`${API_URL}/${studentId}/exams`, {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem("authToken")}`,
          },
        });

        const examsFromServer = response.data || [];

        const formattedData = {};
        examsFromServer.forEach((exam) => {
          const date = new Date(exam.ExamDate || exam.examDate).toISOString().split("T")[0];
          formattedData[date] = {
            course: exam.course || exam.title,
            time: exam.time,
            location: exam.description || "TBD",
            examId: exam.ExamId || exam.examId,
            title: exam.title || "",
          };
        });

        await AsyncStorage.setItem("examData", JSON.stringify(formattedData));
        setExamData(formattedData);
        console.log("Fetched and stored exams:", formattedData);
      } catch (error) {
        console.error("Error fetching exams:", error);
        Alert.alert("Error", `Failed to fetch exams: ${error.response?.data || error.message}`);
      }
    };

    fetchExams();
  }, [studentId]);

  const markedDates = Object.keys(examData).reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: "orange",
      selected: date === selectedDate,
      selectedColor: "#1E3A70",
      selectedTextColor: "#FFFFFF",
    };
    return acc;
  }, {});

  const parseTimeToDate = (dateString, timeString) => {
    const [time, period] = timeString.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const date = new Date(dateString);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const saveToCalendar = async (exam) => {
    try {
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Calendar access is required to save the event.");
        return;
      }

      const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find((cal) => cal.allowsModifications) || calendars[0];
      if (!defaultCalendar) {
        Alert.alert("Error", "No writable calendar found.");
        return;
      }

      const startDate = parseTimeToDate(selectedDate, exam.time);
      const eventDetails = {
        title: `Exam: ${exam.course}`,
        startDate,
        endDate: new Date(startDate.getTime() + 60 * 60 * 1000),
        location: exam.location,
        notes: `Exam for ${exam.course} at ${exam.location}`,
        calendarId: defaultCalendar.id,
      };

      const eventId = await ExpoCalendar.createEventAsync(defaultCalendar.id, eventDetails);
      Alert.alert("Success", `Exam saved to your calendar with ID: ${eventId}`);
    } catch (error) {
      console.error("Error saving to calendar:", error.message, error.stack);
      Alert.alert("Error", "Failed to save the exam to your calendar.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>📅 Exam Calendar</Text>
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: "#1E3A70",
              calendarBackground: "#1E3A70",
              todayTextColor: "#F6C36B",
              arrowColor: "#F6C36B",
              monthTextColor: "#F6C36B",
              dayTextColor: "#E5E5E5",
            }}
          />
        </View>

        {selectedDate && examData[selectedDate] && (
          <View style={styles.examBox}>
            <Text style={styles.examTitle}>Exam Details</Text>
            <Text style={styles.examText}>📅 Date: {formatDate(selectedDate)}</Text>
            <Text style={styles.examText}>📖 Course: {examData[selectedDate].course}</Text>
            {examData[selectedDate].title && (
              <Text style={styles.examText}>📋 Title: {examData[selectedDate].title}</Text>
            )}
            <Text style={styles.examText}>⏰ Time: {examData[selectedDate].time}</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveToCalendar(examData[selectedDate])}
            >
              <Text style={styles.buttonText}>Save to your Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedDate(null)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E3A70",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F6C36B",
    marginBottom: 15,
  },
  calendarContainer: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#F6C36B",
    overflow: "hidden",
    backgroundColor: "#25427B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  examBox: {
    backgroundColor: "#2B4B8F",
    padding: 18,
    borderRadius: 12,
    width: "90%",
    marginTop: 25,
    alignItems: "center",
  },
  examTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F6C36B",
    marginBottom: 10,
  },
  examText: {
    fontSize: 16,
    color: "#EAEAEA",
    marginBottom: 5,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#F6C36B",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: "#F6C36B",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: "#1E3A70",
    fontWeight: "bold",
    fontSize: 16,
  },
});