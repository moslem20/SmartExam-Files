import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCalendar from "expo-calendar";
import axios from "axios";
import { baseURL } from "../../baseUrl";

const todayDate = new Date().toISOString().split("T")[0];

export default function TeacherCalendar() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [examData, setExamData] = useState({});
  const [teacherEmail, setTeacherEmail] = useState("");
  const [classOptions, setClassOptions] = useState([{ label: "All Classes", value: "all" }]);

  const API_URL = `${baseURL}/Classes/teacher`;

  useEffect(() => {
    const getTeacherEmail = async () => {
      try {
        const userData = await AsyncStorage.getItem("loggedInUser");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === "teacher" && user.email) {
            setTeacherEmail(user.email.toLowerCase());
          } else {
            Alert.alert("Error", "Teacher email not found. Please log in again.");
          }
        } else {
          Alert.alert("Error", "Please log in to access the calendar.");
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
      const fetchClasses = async () => {
        try {
          const response = await axios.get(`${API_URL}/${teacherEmail}`);
          const mappedClasses = response.data.map((course) => ({
            label: course.courseName,
            value: course.id,
          }));
          setClassOptions([{ label: "All Classes", value: "all" }, ...mappedClasses]);
        } catch (error) {
          console.error("Fetch classes error:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          Alert.alert("Error", "Failed to fetch classes.");
        }
      };

      fetchClasses();
    }
  }, [teacherEmail]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        if (!teacherEmail) return;

        const response = await axios.get(`${API_URL}/${teacherEmail}/exams`);
        const examsFromServer = response.data || [];

        const formattedData = {};
        examsFromServer.forEach((exam) => {
          const date = new Date(exam.examDate).toISOString().split("T")[0];
          const cleanTime = exam.time?.split("GMT")[0]?.trim() || exam.time;
          formattedData[date] = {
            course: exam.course || exam.title,
            time: cleanTime,
            location: exam.location || "TBD",
            title: exam.title || "",
            className: classOptions.find((opt) => opt.value === exam.classId)?.label || exam.course || "Unknown",
            status: new Date(exam.examDate) < new Date() ? "Completed" : "Scheduled",
          };
        });

        await AsyncStorage.setItem("examData", JSON.stringify(formattedData));
        setExamData(formattedData);
        console.log("Fetched and stored exams:", formattedData);
      } catch (error) {
        console.error("Fetch exams error:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        Alert.alert("Error", `Failed to fetch exams: ${error.response?.data || error.message}`);
      }
    };

    if (teacherEmail && classOptions.length > 1) {
      fetchExams();
    }
  }, [teacherEmail, classOptions]);

  const markedDates = Object.keys(examData).reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: "#F6C36B",
      selected: date === selectedDate,
      selectedColor: "#E27C48",
      selectedTextColor: "#FFFFFF",
    };
    return acc;
  }, {});

  const parseTimeToDate = (dateString, timeString) => {
    const [time, period] = timeString.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const date = new Date(dateString + "T00:00:00");
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
      Alert.alert("Success", `Exam saved to your calendar!`);
    } catch (error) {
      console.error("Error saving to calendar:", error.message);
      Alert.alert("Error", "Failed to save the exam to your calendar.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>📅 Teacher Calendar</Text>

        <View style={styles.calendarContainer}>
          <Calendar
            current={new Date().toISOString().split("T")[0]}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              todayTextColor: "#E27C48",
              selectedDayBackgroundColor: "#E27C48",
              selectedDayTextColor: "#FFFFFF",
              dayTextColor: "#4B4B4B",
              textDisabledColor: "#D1D5DB",
              dotColor: "#E27C48",
              selectedDotColor: "#FFFFFF",
              arrowColor: "#704C9F",
              monthTextColor: "#704C9F",
              textDayFontFamily: "System",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "600",
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        {selectedDate && examData[selectedDate] && (
          <View style={styles.examBox}>
            <Text style={styles.examTitle}>📄 Exam Details</Text>
            <Text style={styles.examText}>📅 {formatDate(selectedDate)}</Text>
            <Text style={styles.examText}>📖 Course: {examData[selectedDate].course}</Text>
            {examData[selectedDate].title && (
              <Text style={styles.examText}>📋 Title: {examData[selectedDate].title}</Text>
            )}
            <Text style={styles.examText}>⏰ Time: {examData[selectedDate].time}</Text>
            <Text style={styles.examText}>📊 Status: {examData[selectedDate].status}</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveToCalendar(examData[selectedDate])}
            >
              <Text style={styles.buttonText}>Save to Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedDate(null)}
            >
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
    backgroundColor: "#F4E2D8",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E27C48",
    marginBottom: 20,
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  examBox: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    width: "90%",
    marginTop: 25,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E27C48",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  examTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#704C9F",
    marginBottom: 12,
  },
  examText: {
    fontSize: 15,
    color: "#4B4B4B",
    marginBottom: 6,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: "#E27C48",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: "#704C9F",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});