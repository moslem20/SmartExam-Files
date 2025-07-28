import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import { baseURL } from "../../baseUrl";

export default function TeacherProfile() {
  const [teacher, setTeacher] = useState({
    fullName: "Teacher",
    email: "",
    phoneNumber: "",
    profilePhoto: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const scale = useSharedValue(1);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const data = await AsyncStorage.getItem("loggedInUser");
      if (data) {
        const parsedTeacher = JSON.parse(data);
        const imageUrl = `${baseURL}/users/get-profile-image?email=${encodeURIComponent(parsedTeacher.email)}`;
        setTeacher({
          ...parsedTeacher,
          profilePhoto: imageUrl,
        });
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    }
  };

  const handleImageUpload = async (uri) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: `profile_${teacher.email}.jpg`,
    });
    formData.append("email", teacher.email);

    try {
      setUploadingImage(true);
      const response = await fetch(`${baseURL}/users/upload-profile-image`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.ok) {
        const updatedImageUrl = `${baseURL}/users/get-profile-image?email=${encodeURIComponent(teacher.email)}`;
        setTeacher((prev) => ({ ...prev, profilePhoto: updatedImageUrl }));
        Alert.alert("Success", "Profile image uploaded successfully.");
      } else {
        const data = await response.json();
        Alert.alert("Upload failed", data?.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImagePick = async () => {
    const options = [
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert("Permission required", "Allow access to change profile picture.");
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

          if (!result.canceled) {
            await handleImageUpload(result.assets[0].uri);
          }
        },
      },
      {
        text: "Take Photo",
        onPress: async () => {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert("Permission required", "Allow access to take a photo.");
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

          if (!result.canceled) {
            await handleImageUpload(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ];

    Alert.alert("Profile Photo", "Choose an option", options);
  };

  const handleSave = async () => {
  try {
    const response = await fetch("http://smartexam.somee.com/api/users/update-teacher-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: teacher.email,
        fullName: teacher.fullName,
      }),
    });

    if (response.ok) {
      await AsyncStorage.setItem("loggedInUser", JSON.stringify(teacher));
      Alert.alert("Success", "Your profile has been updated.");
      setIsEditing(false);
      setRefreshing(true);
      fetchTeacherData();
      setRefreshing(false);
    } else {
      const result = await response.json();
      Alert.alert("Update failed", result?.message || "Something went wrong.");
    }
  } catch (error) {
    console.error("Error saving teacher profile:", error);
    Alert.alert("Error", "Could not connect to the server.");
  }
};


  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Validation Error", "Please fill in both password fields.");
      return;
    }
  
    try {
      const response = await fetch("http://smartexam.somee.com/api/UpdatedPass/change", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: teacher.email,
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });
  
      const result = await response.text();
  
      if (response.ok) {
        Alert.alert("Success", result || "Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setShowPasswordBox(false);
      } else {
        Alert.alert("Error", result || "Failed to update password.");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      Alert.alert("Error", "Could not connect to the server.");
    }
  };

  const animatedProfileImage = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTeacherData} />}
      >
        <Animated.View style={styles.profileCard} entering={FadeInUp.duration(500)}>
          <Text style={styles.profileTitle}>Teacher Profile</Text>

          <TouchableOpacity
            onPress={handleImagePick}
            onPressIn={() => (scale.value = withSpring(1.1))}
            onPressOut={() => (scale.value = withSpring(1))}
          >
            {uploadingImage ? (
              <ActivityIndicator size="large" color="#FFF" style={{ marginBottom: 16 }} />
            ) : (
              <>
                <Animated.Image
                  source={
                    teacher.profilePhoto
                      ? { uri: teacher.profilePhoto }
                      : require("../../assets/images/profile 1.png")
                  }
                  style={[styles.profileImage, animatedProfileImage]}
                  onError={() => {
                    setTeacher(prev => ({ ...prev, profilePhoto: null }));
                  }}
                />
                <Text style={styles.editText}>Edit Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={teacher.fullName}
                  onChangeText={(text) => setTeacher({ ...teacher, fullName: text })}
                />
              ) : (
                <Text style={styles.infoText}>{teacher.fullName}</Text>
              )}
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.infoText}>{teacher.email}</Text>
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: "#FFC107", marginTop: 10 }]}
              onPress={() => setShowPasswordBox(!showPasswordBox)}
            >
              <Text style={[styles.editButtonText, { color: "#333" }]}>
                {showPasswordBox ? "Cancel Password Change" : "Change Password"}
              </Text>
            </TouchableOpacity>
          )}

          {showPasswordBox && (
            <View style={styles.passwordBox}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: "black" }]}
                onPress={handlePasswordChange}
              >
                <Text style={styles.saveButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          )}

          {isEditing ? (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4E2D8",
  },
  scrollView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  profileCard: {
    backgroundColor: "#E27C48",
    width: "90%",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 8,
  },
  profileTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    letterSpacing: 1,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "white",
    marginBottom: 8,
  },
  editText: {
    color: "#FFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  infoContainer: {
    width: "100%",
    marginTop: 10,
  },
  infoBlock: {
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
    marginBottom: 3,
  },
  infoText: {
    fontSize: 16,
    color: "#F4E2D8",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 5,
  },
  input: {
    backgroundColor: "white",
    color: "#704C9F",
    borderRadius: 5,
    padding: 8,
  },
  editButton: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  editButtonText: {
    color: "#E27C48",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#704C9F",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  passwordBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
});