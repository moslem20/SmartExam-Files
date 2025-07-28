import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const baseURL = "http://smartexam.somee.com/api";

export default function Inbox() {
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [readMessages, setReadMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("loggedInUser");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === "student" && user.studentId) {
            setStudentId(user.studentId);
          } else {
            Alert.alert("Error", "Student ID not found. Please log in again.");
          }
        } else {
          Alert.alert("Error", "Please log in to access inbox.");
        }
      } catch (error) {
        console.error("Error fetching student ID:", error);
        Alert.alert("Error", "Failed to load user data.");
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchMessages();
      loadReadMessages();
    }
  }, [studentId]);

  useEffect(() => {
    const unreadMessages = messages.filter((msg) => !readMessages.includes(msg.id)).length;
    setUnreadCount(unreadMessages);
    saveUnreadCount(unreadMessages);
  }, [readMessages, messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${baseURL}/Classes/messages/student/${studentId}`);
      console.log("Fetched messages:", response.data);
      setMessages(response.data);
    } catch (error) {
      console.error("Fetch messages error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch messages: " + (error.response?.data || error.message));
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [studentId]);

  const toggleMessage = async (id) => {
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
    const allReadIds = messages.map((msg) => msg.id);
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
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#335ACF" }]} onPress={markAllAsRead}>
          <Text style={styles.buttonText}>Mark All as Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#E27C48" }]} onPress={markAllAsUnread}>
          <Text style={styles.buttonText}>Mark All as Unread</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <Text style={styles.noMessagesText}>No messages found.</Text>
        ) : (
          messages.map((item) => {
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
                    {/* Header: Sender Info */}
                    <View style={styles.headerRow}>
                      <Text style={styles.nameText}>{item.senderName}</Text>
                      <Text style={styles.dateText}>{new Date(item.sentAt).toLocaleString()}</Text>
                    </View>
                    

                    {/* Course & Exam Title side by side */}
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

                    {/* Message Body */}
                    <View style={styles.messageSection}>
                      <Text style={styles.messageTitle}>Message</Text>
                      <Text style={styles.messageContent}>{item.messageText}</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.button} onPress={() => toggleMessage(item.id)}>
                  <Text style={styles.buttonText}>
                    {expandedMessageId === item.id ? "Hide Message" : "Show Message"}
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
    backgroundColor: "#335ACF",
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
    color: "#335ACF",
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
    opacity: 1,
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
    backgroundColor: "#335ACF",
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