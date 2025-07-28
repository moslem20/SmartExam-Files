import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Easing, ScrollView, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Feather, Entypo } from "@expo/vector-icons";
import { baseURL } from "../../baseUrl";

export default function StudentDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Student");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userGPA, setUserGPA] = useState("Loading...");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const fetchProfilePhotoFromServer = async (email) => {
    const url = `${baseURL}/users/get-profile-image?email=${encodeURIComponent(email)}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        setProfilePhoto(url); // valid image path
      } else {
        setProfilePhoto(null); // fallback to placeholder
      }
    } catch (err) {
      console.error("Failed to fetch profile image:", err);
      setProfilePhoto(null);
    }
  };

  const fetchUserData = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      if (loggedInUser) {
        const userData = JSON.parse(loggedInUser);
        setUserName(userData.fullName || "Student");
        setUserEmail(userData.email);
        await fetchProfilePhotoFromServer(userData.email);
      }

      const storedGPA = await AsyncStorage.getItem("userGPA");
      setUserGPA(storedGPA ? storedGPA : "N/A");

      const unreadCount = await AsyncStorage.getItem("unreadCount");
      setUnreadMessages(unreadCount ? JSON.parse(unreadCount) : 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserData();

    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }).start();

    Animated.loop(
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const borderColorInterpolation = borderAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#335ACF", "#F6C36B", "#335ACF"],
  });

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("loggedInUser");
      router.replace("/screens/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY }] }]}>
        <View style={styles.blueBackground}>
          <View style={styles.header}>
            <Animated.View style={[styles.animatedBorder, { borderColor: borderColorInterpolation }]}>
              <Image
                source={
                  profilePhoto
                    ? { uri: profilePhoto }
                    : require("../../assets/images/profile-placeholder.png")
                }
                style={styles.profileImage}
              />
            </Animated.View>
            <Text style={styles.welcomeText}>Hello, {"\n"}{userName}!</Text>
          </View>

          <View style={styles.cardContainer}>
            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(studentScreens)/grades")}>
              <Text style={styles.cardTitle}>Your GPA</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/gpa.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>{userGPA}%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/student_exam_mode/examMode")}>
              <Text style={styles.cardTitle}>Your Next Exam</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/Exam-Mode.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>Exam Mode</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(studentScreens)/inbox")}>
              <Text style={styles.cardTitle}>Inbox</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/inbox.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>{unreadMessages} New Messages</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(studentScreens)/calendar")}>
              <Text style={styles.cardTitle}>Calendar</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/calendar.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>View Exams</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.whiteBackground}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  blueBackground: {
    backgroundColor: "#335ACF",
    flex: 2.0,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    paddingTop: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginBottom: 40,
  },
  animatedBorder: {
    borderWidth: 2,
    padding: 3,
    borderRadius: 40,
    marginRight: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  welcomeText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },
  cardWrapper: {
    width: "45%",
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "300",
    color: "white",
    marginBottom: 5,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    width: 158,
    height: 127,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  cardIcon: {
    width: 40,
    height: 40,
  },
  cardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#335ACF",
    textAlign: "center",
    marginTop: 6,
  },
  whiteBackground: {
    flex: 0.6,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    backgroundColor: "red",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});