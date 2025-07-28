import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const windowHeight = Dimensions.get("window").height;
const baseURL = "http://smartexam.somee.com/api";

const TeacherClasses = () => {
  const [courses, setCourses] = useState([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [createFormVisible, setCreateFormVisible] = useState(false);
  const [messagesModalVisible, setMessagesModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({
    id: "",
    name: "",
    studentIds: "",
    description: "",
  });
  const [message, setMessage] = useState("");
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [previousMessages, setPreviousMessages] = useState([]);

  useEffect(() => {
    const getTeacherEmail = async () => {
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
          Alert.alert("Error", "Please log in to access classes.");
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
      fetchClasses();
    }
  }, [teacherEmail]);

  const fetchClasses = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`${baseURL}/classes/teacher/${teacherEmail}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log("Raw API response:", response.data);
      const mappedCourses = response.data.map((course) => {
        console.log("Course ID:", course.id, typeof course.id); // Log ID type
        return {
          id: String(course.id).trim(), // Ensure ID is a string and trimmed
          name: course.courseName,
          studentIds: course.studentIds,
          description: course.description,
        };
      });
      console.log("Mapped courses:", mappedCourses);
      setCourses(mappedCourses);
    } catch (error) {
      console.error("Fetch classes error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to fetch classes: ${error.response?.data?.message || error.message}`);
    }
  };

  const addCourse = async () => {
  if (!newCourse.id || !newCourse.name || !newCourse.studentIds) {
    Alert.alert("Error", "Please fill in all required fields (ID, Course Name, Student IDs).");
    return;
  }

  if (!teacherEmail) {
    Alert.alert("Error", "Teacher email is missing. Please log in again.");
    return;
  }

  try {
    const courseToAdd = {
      id: newCourse.id.trim(),
      courseName: newCourse.name,
      teacherEmail: teacherEmail,
      studentIds: newCourse.studentIds.split(",").map((id) => id.trim()),
      description: newCourse.description || null,
    };

    console.log("Posting class:", courseToAdd);
    const token = await AsyncStorage.getItem("authToken");
    const response = await axios.post(`${baseURL}/classes`, courseToAdd, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    console.log("Post response:", response.data);
    await fetchClasses();
    setNewCourse({ id: "", name: "", studentIds: "", description: "" });
    setCreateFormVisible(false);
    Alert.alert("Success", "Class created successfully.");
  } catch (error) {
    console.error("Create class error:", error.response?.data || error.message);
    Alert.alert("Error", `Failed to create class: ${error.response?.data?.message || error.message}`);
  }
};


  const editCourse = (course) => {
    setNewCourse({
      id: String(course.id).trim(), // Ensure ID is a string
      name: course.name,
      studentIds: course.studentIds.join(", "),
      description: course.description || "",
    });
    setCreateFormVisible(true);
    setSelectedCourse(course);
  };

  const updateCourse = async () => {
    if (!newCourse.name || !newCourse.studentIds) {
      Alert.alert("Error", "Please fill in all required fields (Course Name, Student IDs).");
      return;
    }

    try {
      const courseToUpdate = {
        id: newCourse.id.trim(), // Keep as string, trim whitespace
        courseName: newCourse.name,
        teacherEmail: teacherEmail,
        studentIds: newCourse.studentIds.split(",").map((id) => id.trim()),
        description: newCourse.description || null,
      };

      console.log("Updating class:", courseToUpdate);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.put(`${baseURL}/classes/${courseToUpdate.id}`, courseToUpdate, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log("Update response:", response.data);
      await fetchClasses();
      setNewCourse({ id: "", name: "", studentIds: "", description: "" });
      setCreateFormVisible(false);
      setSelectedCourse(null);
      Alert.alert("Success", "Class updated successfully.");
    } catch (error) {
      console.error("Update class error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to update class: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
      Alert.alert("Error", "No valid course ID provided.");
      return;
    }

    const formattedCourseId = courseId.trim(); // Ensure no whitespace

    try {
      console.log("Attempting to delete class with ID:", formattedCourseId, typeof formattedCourseId);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.delete(`${baseURL}/classes/${formattedCourseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log("Delete response:", response.data);
      await fetchClasses();
      setDetailsModalVisible(false);
      Alert.alert("Success", "Class deleted successfully.");
    } catch (error) {
      console.error("Delete class error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to delete class: ${error.response?.data?.message || error.message}`);
    }
  };

  const sendMessageToStudents = async (studentIds, message) => {
    if (!message.trim()) {
      Alert.alert("Error", "Please type a message.");
      return;
    }

    if (!selectedCourse?.id || !teacherEmail) {
      Alert.alert("Error", "Class ID or teacher email is missing.");
      return;
    }

    try {
      console.log("Sending message to ClassId:", selectedCourse.id, "Message:", message);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.post(
        `${baseURL}/classes/${selectedCourse.id}/messages`,
        {
          teacherEmail: teacherEmail,
          messageText: message,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      console.log("Send message response:", response.data);
      Alert.alert("Success", "Message sent successfully to all students in the class!");
      setMessage("");
      setMessageModalVisible(false);
    } catch (error) {
      console.error("Send message error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to send message: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchPreviousMessages = async (classId) => {
    if (!classId || !teacherEmail) {
      Alert.alert("Error", "Class ID or teacher email is missing.");
      return;
    }

    try {
      console.log("Fetching messages for ClassId:", classId, "TeacherEmail:", teacherEmail);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`${baseURL}/classes/${classId}/messages`, {
        params: { teacherEmail: teacherEmail },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log("Fetched messages:", JSON.stringify(response.data, null, 2));
      setPreviousMessages(response.data);
      setMessagesModalVisible(true);
    } catch (error) {
      console.error("Fetch messages error:", error.response?.data || error.message);
      Alert.alert("Error", `Failed to fetch messages: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📚 Your Classes</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>Courses: {courses.length}</Text>
        <Text style={styles.summaryText}>
          Students: {courses.reduce((acc, c) => acc + c.studentIds.length, 0)}
        </Text>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tableRow}
            onPress={() => {
              setSelectedCourse(item);
              setDetailsModalVisible(true);
            }}
          >
            <View style={styles.tableCell}>
              <Text style={styles.cell}>{item.name}</Text>
              <Text style={styles.cell}>{item.studentIds.length} students</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => editCourse(item)}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendMessageButton}
                  onPress={() => {
                    setMessage("");
                    setMessageModalVisible(true);
                    setSelectedCourse(item);
                  }}
                >
                  <Text style={styles.buttonText}>Send Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.showMessagesButton}
                  onPress={() => {
                    setSelectedCourse(item);
                    fetchPreviousMessages(item.id);
                  }}
                >
                  <Text style={styles.buttonText}>Messages</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.fixedFooter}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            setSelectedCourse(null);
            setNewCourse({ id: "", name: "", studentIds: "", description: "" });
            setCreateFormVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Create Class</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={createFormVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {selectedCourse ? "Edit Course" : "Create New Course"}
            </Text>

            <TextInput
              placeholder="Course ID"
              style={styles.input}
              placeholderTextColor="#ccc"
              value={newCourse.id}
              onChangeText={(text) =>
                setNewCourse((prev) => ({ ...prev, id: text }))
              }
              editable={!selectedCourse}
              keyboardType="default" // Allow string input
            />

            <TextInput
              placeholder="Course Name"
              style={styles.input}
              placeholderTextColor="#ccc"
              value={newCourse.name}
              onChangeText={(text) =>
                setNewCourse((prev) => ({ ...prev, name: text }))
              }
            />

            <TextInput
              placeholder="Student IDs (comma separated)"
              style={styles.input}
              placeholderTextColor="#ccc"
              value={newCourse.studentIds}
              onChangeText={(text) =>
                setNewCourse((prev) => ({ ...prev, studentIds: text }))
              }
            />

            <TextInput
              placeholder="Course Description"
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
              placeholderTextColor="#ccc"
              value={newCourse.description}
              onChangeText={(text) =>
                setNewCourse((prev) => ({ ...prev, description: text }))
              }
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={selectedCourse ? updateCourse : addCourse}
            >
              <Text style={styles.saveButtonText}>
                {selectedCourse ? "Update Course" : "Add Course"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCreateFormVisible(false);
                setSelectedCourse(null);
                setNewCourse({ id: "", name: "", studentIds: "", description: "" });
              }}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={messageModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Send Message to Students</Text>

            <TextInput
              placeholder="Type your message here"
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
              value={message}
              onChangeText={setMessage}
              placeholderTextColor="#ccc"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() =>
                sendMessageToStudents(selectedCourse?.studentIds || [], message)
              }
            >
              <Text style={styles.saveButtonText}>Send Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setMessageModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>📘 Course Details</Text>
            {selectedCourse && (
              <>
                <Text style={styles.detailsText}>
                  <Text style={styles.detailsLabel}>Name: </Text>{selectedCourse.name}
                </Text>
                <Text style={styles.detailsText}>
                  <Text style={styles.detailsLabel}>Students IDs: </Text>
                  {selectedCourse.studentIds.join(", ")}
                </Text>
                <Text style={styles.detailsText}>
                  <Text style={styles.detailsLabel}>Description: </Text>
                  {selectedCourse.description || "None"}
                </Text>
              </>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => {
                  if (selectedCourse && selectedCourse.id) {
                    Alert.alert(
                      "Confirm Delete",
                      `Are you sure you want to delete ${selectedCourse.name}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", onPress: () => deleteCourse(selectedCourse.id) },
                      ]
                    );
                  } else {
                    Alert.alert("Error", "No valid course selected for deletion.");
                  }
                }}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={messagesModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>📬 Previous Messages</Text>
            {previousMessages.length === 0 ? (
              <Text style={styles.noMessagesText}>No messages found.</Text>
            ) : (
              <FlatList
                data={previousMessages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.messageItem}>
                    <Text style={styles.messageText}>
                      <Text style={styles.detailsLabel}>To Students: </Text>{item.studentId}
                    </Text>
                    <Text style={styles.messageText}>
                      <Text style={styles.detailsLabel}>Message: </Text>{item.messageText}
                    </Text>
                    <Text style={styles.messageText}>
                      <Text style={styles.detailsLabel}>Sent: </Text>
                      {new Date(item.sentAt).toLocaleString()}
                    </Text>
                  </View>
                )}
                style={styles.messagesList}
              />
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={() => setMessagesModalVisible(false)}
            >
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TeacherClasses;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // light neutral background
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 20,
    fontFamily: "System",
  },
  summaryBox: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  summaryText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },
  tableRow: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
  },
  tableCell: {
    flex: 1,
  },
  cell: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  editButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 8,
  },
  sendMessageButton: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 8,
  },
  showMessagesButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "System",
  },
  fixedFooter: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  createButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxHeight: windowHeight * 0.8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontFamily: "System",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 6,
  },
  closeButtonText: {
    color: "#6B7280",
    fontWeight: "500",
    fontSize: 15,
  },
  detailsText: {
    color: "#1F2937",
    fontSize: 16,
    marginBottom: 8,
  },
  detailsLabel: {
    fontWeight: "700",
    color: "#4B5563",
  },
  messageItem: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  messageText: {
    color: "#1F2937",
    fontSize: 14,
    marginBottom: 6,
  },
  noMessagesText: {
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  messagesList: {
    maxHeight: windowHeight * 0.5,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  closeButton: {
    backgroundColor: "#9CA3AF",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
