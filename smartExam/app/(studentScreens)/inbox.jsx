import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Sample inbox messages
const messagesData = [
  { id: 1, sender: "Mr. Ahmed", course: "C#", message: "You need to improve your performance in the next assignment." },
  { id: 2, sender: "Ms. Sara", course: "JavaScript", message: "Great job on the last project! Keep it up!" },
  { id: 3, sender: "Dr. Khalid", course: "AI", message: "Your AI project proposal looks promising, let's discuss further." },
  { id: 4, sender: "Prof. Layla", course: "Algorithms", message: "Please review the latest algorithms before the exam." },
  { id: 5, sender: "Mr. Yusuf", course: "Database", message: "Your database schema needs optimization, please revise it." },
];

export default function Inbox() {
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [readMessages, setReadMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadReadMessages();
  }, []);

  useEffect(() => {
    const unreadMessages = messagesData.filter((msg) => !readMessages.includes(msg.id)).length;
    setUnreadCount(unreadMessages);
    saveUnreadCount(unreadMessages);
  }, [readMessages]);

  const toggleMessage = async (id) => {
    setExpandedMessageId(expandedMessageId === id ? null : id);

    if (!readMessages.includes(id)) {
      const updatedReadMessages = [...readMessages, id];
      setReadMessages(updatedReadMessages);
      await AsyncStorage.setItem("readMessages", JSON.stringify(updatedReadMessages));
    }
  };

  const loadReadMessages = async () => {
    const storedReadMessages = await AsyncStorage.getItem("readMessages");
    if (storedReadMessages) {
      setReadMessages(JSON.parse(storedReadMessages));
    }
  };

  const saveUnreadCount = async (count) => {
    await AsyncStorage.setItem("unreadCount", JSON.stringify(count));
  };

  //  Mark all messages as read
  const markAllAsRead = async () => {
    const allReadIds = messagesData.map((msg) => msg.id);
    setReadMessages(allReadIds);
    await AsyncStorage.setItem("readMessages", JSON.stringify(allReadIds));
  };

  // Mark all messages as unread
  const markAllAsUnread = async () => {
    setReadMessages([]);
    await AsyncStorage.removeItem("readMessages");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Inbox ({unreadCount} Unread)</Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "green" }]} onPress={markAllAsRead}>
          <Text style={styles.buttonText}>Mark All as Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "red" }]} onPress={markAllAsUnread}>
          <Text style={styles.buttonText}>Mark All as Unread</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.messagesContainer}>
        {messagesData.map((item) => {
          const isRead = readMessages.includes(item.id);
          return (
            <View key={item.id} style={[styles.messageBox, isRead && styles.readMessage]}>
              <View style={styles.messageHeader}>
                <Text style={styles.senderText}>{item.sender}</Text>
                <Text style={styles.courseText}>{item.course}</Text>
                {!isRead && <Ionicons name="ellipse" size={12} color="red" />}
              </View>
              {expandedMessageId === item.id && <Text style={styles.messageText}>{item.message}</Text>}
              <TouchableOpacity style={styles.button} onPress={() => toggleMessage(item.id)}>
                <Text style={styles.buttonText}>
                  {expandedMessageId === item.id ? "Hide Message" : "Show Message"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  messagesContainer: {
    width: "90%",
  },
  messageBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  readMessage: {
    opacity: 0.6,
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
  messageText: {
    fontSize: 14,
    color: "#333",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#335ACF",
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});

