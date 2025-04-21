import { useState } from "react";
import { fetch } from 'expo/fetch';
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseURL } from "../../baseUrl";


const API_URL = `${baseURL}/Users/register`; 

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState(null); // "teacher" or "student"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    console.log("Register button pressed, URL:", API_URL);
    if (!fullName || !email || !password || (role === "student" && (!studentId || !phoneNumber))) {
      Alert.alert("Error", "Please fill out all required fields");
      setIsLoading(false);
      return;
    }

    const user = {
      FullName: fullName.trim(),
      Email: email.trim().toLowerCase(),
      Password: password.trim(),
      Role: role.toLowerCase(),
      StudentId: role === "student" ? studentId.trim() : null,
      PhoneNumber: role === "student" ? phoneNumber.trim() : null,
    };

    console.log("Sending request with:", user);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(user),
        headers: new Headers({
          'Content-type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
        }),
      });

      const result = await response.json();
      console.log("Response:", result);

      if (response.ok) {
        // Save user data in AsyncStorage
        await AsyncStorage.setItem("loggedInUser", JSON.stringify({
          fullName: result.fullName,
          email: result.email,
          role: result.role,
          studentId: result.studentId || null,
          phoneNumber: result.phoneNumber || null,
        }));

        Alert.alert("Success", "Registration successful!");
       console.log("Success", "Registration successful!");
        router.push("/screens/login");
      } else {
        Alert.alert("Error", result.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", `Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create an Account</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === "teacher" && styles.selectedRole]}
            onPress={() => setRole("teacher")}
          >
            <Text style={styles.roleText}>Register as Teacher</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === "student" && styles.selectedRole]}
            onPress={() => setRole("student")}
          >
            <Text style={styles.roleText}>Register as Student</Text>
          </TouchableOpacity>
        </View>

        {role && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#ccc"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#ccc"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {role === "student" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Student ID"
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  value={studentId}
                  onChangeText={setStudentId}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#ccc"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </>
            )}
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.push("/screens/login")}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 15,
    width: 350,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#D9D9D9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  selectedRole: {
    backgroundColor: "#E27C48",
  },
  roleText: {
    fontSize: 16,
    fontWeight: "light",
    color: "#000",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    width: "100%",
    backgroundColor: "#E27C48",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#fff",
  },
  link: {
    color: "#D9D9D9",
    marginTop: 15,
    fontSize: 16,
  },
});
