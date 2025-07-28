import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";


const baseURL = "http://smartexam.somee.com/api";

export default function TeacherInbox() {
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [readMessages, setReadMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appeals, setAppeals] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState("All");

  const filteredAppeals =
    selectedCourse === "All"
      ? appeals
      : appeals.filter((appeal) => appeal.courseName === selectedCourse);


  const [availableCourses, setAvailableCourses] = useState([]);


  useEffect(() => {
    const loadUserData = async () => {
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
          Alert.alert("Error", "Please log in to access inbox.");
        }
      } catch (error) {
        console.error("Error fetching teacher email:", error);
        Alert.alert("Error", "Failed to load user data.");
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (teacherEmail) {
      fetchAppeals();
      loadReadMessages();
    }
  }, [teacherEmail]);

  useEffect(() => {
    const unreadAppeals = appeals.filter((appeal) => !readMessages.includes(appeal.id)).length;
    setUnreadCount(unreadAppeals);
    saveUnreadCount(unreadAppeals);
  }, [readMessages, appeals]);

  const fetchAppeals = async () => {
    try {
      const response = await axios.get(`${baseURL}/Grades/teacher/${teacherEmail}/appeals`);
      console.log("Fetched appeals:", response.data);

      // Sort appeals by sentAt descending (newest first)
      const sortedAppeals = response.data.sort(
        (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
      );

      setAppeals(sortedAppeals);
      // Extract unique course names for dropdown
      const courses = [...new Set(sortedAppeals.map((a) => a.courseName))];
      setAvailableCourses(["All", ...courses]);
    } catch (error) {
      console.error("Fetch appeals error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch appeals: " + (error.response?.data || error.message));
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppeals();
    setRefreshing(false);
  }, [teacherEmail]);

  const toggleAppeal = async (id) => {
    setExpandedMessageId(expandedMessageId === id ? null : id);

    if (!readMessages.includes(id)) {
      const updatedReadMessages = [...readMessages, id];
      setReadMessages(updatedReadMessages);
      await AsyncStorage.setItem("readMessages", JSON.stringify(updatedReadMessages));
    }
  };

  const loadReadMessages = async () => {
    try {
      const storedReadMessages = await AsyncStorage.getItem("readMessages");
      if (storedReadMessages) {
        setReadMessages(JSON.parse(storedReadMessages));
      }
    } catch (error) {
      console.error("Error loading read messages:", error);
    }
  };

  const saveUnreadCount = async (count) => {
    try {
      await AsyncStorage.setItem("unreadCount", JSON.stringify(count));
    } catch (error) {
      console.error("Error saving unread count:", error);
    }
  };

  const markAllAsRead = async () => {
    const allReadIds = appeals.map((appeal) => appeal.id);
    setReadMessages(allReadIds);
    await AsyncStorage.setItem("readMessages", JSON.stringify(allReadIds));
  };

  const markAllAsUnread = async () => {
    setReadMessages([]);
    await AsyncStorage.removeItem("readMessages");
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.sectionTitle}>Inbox ({unreadCount} Unread)</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#704C9F" }]} onPress={markAllAsRead}>
          <Text style={styles.buttonText}>Mark All as Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#E27C48" }]} onPress={markAllAsUnread}>
          <Text style={styles.buttonText}>Mark All as Unread</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Filter by Course:</Text>
        <ScrollView horizontal contentContainerStyle={styles.dropdownList} showsHorizontalScrollIndicator={false}>
          {availableCourses.map((course, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dropdownItem,
                selectedCourse === course && styles.dropdownItemSelected,
              ]}
              onPress={() => setSelectedCourse(course)}
            >
              <Text style={styles.dropdownItemText}>{course}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      <View style={styles.messagesContainer}>


        {/* Messages List */}
        {filteredAppeals.length === 0 ? (
          <Text style={styles.noMessagesText}>No appeals found.</Text>
        ) : (
          [...filteredAppeals]
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)) // Sort new to old
            .map((item) => {
              const isRead = readMessages.includes(item.id);
              return (
                <View key={item.id} style={[styles.messageBox, isRead && styles.readMessage]}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderText}>{item.senderName}</Text>
                    <Text style={styles.courseText}>{item.courseName}</Text>
                    {!isRead && <Ionicons name="ellipse" size={12} color="#E27C48" />}
                  </View>
                  {expandedMessageId === item.id && (
                    <View style={styles.expandedBox}>
                      <View style={styles.headerRow}>
                        <Text style={styles.nameText}>{item.senderName}</Text>
                        <Text style={styles.dateText}>{new Date(item.sentAt).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.subInfo}>ID: {item.studentId}</Text>

                      <View style={styles.rowSection}>
                        <View style={styles.halfSection}>
                          <Text style={styles.sectionTitle}>Course</Text>
                          <Text style={styles.sectionContent}>{item.courseName}</Text>
                        </View>
                        <View style={styles.halfSection}>
                          <Text style={styles.sectionTitle}>Exam Title</Text>
                          <Text style={styles.sectionContent}>{item.examTitle}</Text>
                        </View>
                      </View>

                      <View style={styles.messageSection}>
                        <Text style={styles.messageTitle}>Message</Text>
                        <Text style={styles.messageContent}>{item.messageText}</Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.button} onPress={() => toggleAppeal(item.id)}>
                    <Text style={styles.buttonText}>
                      {expandedMessageId === item.id ? "Hide Appeal" : "Show Appeal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1E3A70",
    alignItems: "center",
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  messagesContainer: {
    width: "90%",
  },

  dropdownContainer: {
    width: "90%",
    marginBottom: 15,
  },
  dropdownLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  dropdownList: {
    flexDirection: "row",
    gap: 10,
  },
  dropdownItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dropdownItemSelected: {
    backgroundColor: "#704C9F",
    borderColor: "#704C9F",
  },
  dropdownItemText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

  messageBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  readMessage: {
    opacity: 0.7,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  senderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#704C9F",
  },
  courseText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E27C48",
  },
  expandedBox: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    opacity: 1, // Ensure full opacity to override parent
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nameText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#335ACF",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  subInfo: {
    fontSize: 12,
    color: "#555",
    marginBottom: 10,
  },
  rowSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  halfSection: {
    flex: 1,
    marginHorizontal: 5,
  },
  messageSection: {
    backgroundColor: "#E27C48",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#B35A32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  messageContent: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#704C9F",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  noMessagesText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});