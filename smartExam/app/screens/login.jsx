import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { baseURL } from "../../baseUrl";

const API_URL = `${baseURL}/Users/login`; 

const fontFamily = Platform.select({
  ios: "Helvetica Neue",
  android: "Roboto",
});

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerForPushNotifications = async () => {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    }
  };

  const sendExamNotification = async (examDetails) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📅 Exam Reminder",
        body: `You have an exam today: ${examDetails.course} at ${examDetails.time} in ${examDetails.location}.`,
        sound: "default",
      },
      trigger: null,
    });
  };

  //saving today's exam to get a Notifications and to start the exam
  const checkExamsForToday = async () => {
    try {
      const examsData = await AsyncStorage.getItem("examData");
      if (!examsData) return;

      const exams = JSON.parse(examsData);
      const today = new Date().toISOString().split("T")[0];

      if (exams[today]) {
        sendExamNotification(exams[today]);
      }
    } catch (error) {
      console.error("Error checking exams:", error);
    }
  };

  //get premisson for Notifications
  useEffect(() => {
    registerForPushNotifications();
  }, []);


  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill out all fields");
      return;
    }

    const credentials = {
      Email: email.trim().toLowerCase(),
      Password: password,
    };

    console.log("credentials:", credentials);
    console.log("URL:", API_URL);
    
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: new Headers({
          'Content-type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
        }),
      });

      const text = await response.text();
      console.log("Raw response:", text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON:", err.message);
        Alert.alert("Error", "Received invalid response from server");
        return;
      }


      if (response.ok) {
        console.log("Success", "Login successful!");
        console.log("User Role:", result.user.role);

        const userData =
          result.user.role === "student"
            ? {
              studentId: result.user.studentId,
              fullName: result.user.fullName,
              email: result.user.email,
              role: result.user.role,
              phoneNumber: result.user.phoneNumber,
            }
            : {
              fullName: result.user.fullName,
              email: result.user.email,
              role: result.user.role,
              phoneNumber: "N/A",
            };

        await AsyncStorage.setItem("loggedInUser", JSON.stringify(userData));


        if (result.user.role === "student") {
          await checkExamsForToday();
          router.push("/(studentScreens)/studentDashboard");
        } else {
          router.push("/(teacherScreens)/teacherDashboard");
        }
      } else {
        Alert.alert("Error", result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Network error. Please check your connection and try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          Don't have an account?
          <Text style={styles.link} onPress={() => router.push("/screens/register")}>
            {" "}
            Sign Up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#335ACF",
    
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    marginBottom: 20,
    fontFamily,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#E27C48",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily,

  },
  footerText: {
    color: "white",
    marginTop: 15,
    fontSize: 16,
    fontFamily,
  },
  link: {
    color: "#FFD700",
    fontWeight: "bold",
    fontFamily,
  },
});
