import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Easing, ScrollView, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { baseURL } from "../../baseUrl";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
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

  const fetchTeacherData = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      if (loggedInUser) {
        const userData = JSON.parse(loggedInUser);
        setTeacherName(userData.fullName || "Teacher");
        setUserEmail(userData.email);
        await fetchProfilePhotoFromServer(userData.email);
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeacherData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTeacherData();
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
    outputRange: ["#704C9F", "#F4E2D8", "#704C9F"],
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
      style={{ flex: 1, backgroundColor: "white" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#704C9F"]} />}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY }] }]}>
        <View style={styles.topBackground}>
          <View style={styles.header}>
            <Animated.View style={[styles.animatedBorder, { borderColor: borderColorInterpolation }]}>
              <Image
                source={
                  profilePhoto
                    ? { uri: profilePhoto }
                    : require("../../assets/images/profile 1.png")
                }
                style={styles.profileImage}
              />
            </Animated.View>
            <Text style={styles.welcomeText}>
              Hello, {"\n"}
              <Text style={{ color: "#704C9F" }}>MR.</Text> {teacherName}!
            </Text>
          </View>

          <View style={styles.cardContainer}>
            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(teacherScreens)/teacherClasses")}>
              <Text style={styles.cardTitle}>Classes</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/Classes.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>Manage Classes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/teacher_exam_mode/examsDash")}>
              <Text style={styles.cardTitle}>Exam Mode</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/Exam-Mode.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>Create/Review Exams</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(teacherScreens)/teacherInbox")}>
              <Text style={styles.cardTitle}>Inbox</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/inbox.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>Check Messages</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push("/(teacherScreens)/teacherCalendar")}>
              <Text style={styles.cardTitle}>Calendar</Text>
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/calendar.png")}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardText}>Exam Schedule</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomBackground}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  topBackground: {
    backgroundColor: "#E27C48",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginBottom: 30,
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
    fontWeight: "600",
    fontFamily: "System",
    lineHeight: 32,
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 10,
  },
  cardWrapper: {
    width: "47%",
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#F4E2D8",
    fontFamily: "System",
    marginBottom: 5,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: 120,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  cardIcon: {
    width: 40,
    height: 40,
  },
  cardText: {
    fontSize: 17,
    fontWeight: "500",
    fontFamily: "System",
    color: "#704C9F",
    textAlign: "center",
    marginTop: 8,
  },
  bottomBackground: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    paddingBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#704C9F",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "System",
  },
});