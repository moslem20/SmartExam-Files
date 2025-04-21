import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseURL } from "../../baseUrl";

export default function Grades() {
  const [grades, setGrades] = useState([]);
  const [gpa, setGPA] = useState("0.00");
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchGrades = async () => {
      try {
        // Retrieve user ID from AsyncStorage
        const loggedInUser = await AsyncStorage.getItem("loggedInUser");
        const userId =JSON.parse(loggedInUser);

        if (!userId.studentId) {
          console.error("User ID not found in AsyncStorage");
          setLoading(false);
          return;
        }
        console.log("user id =" ,userId.studentId );
        

        // Fetch grades from the backend
        const response = await fetch(`http://smartexam.somee.com/api/Grades/student/${userId.studentId}`, {
          headers: new Headers({
            'Content-type': 'application/json; charset=UTF-8',
            'Accept': 'application/json; charset=UTF-8',
          }),
        });        
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to fetch grades: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        setGrades(data);
        calculateGPA(data);
      } catch (error) {
        console.error("Error fetching grades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  // Calculate GPA
  const calculateGPA = async (grades) => {
    if (grades.length === 0) {
      setGPA("0.00");
      return;
    }
    
    const total = grades.reduce((sum, item) => sum + item.grade, 0);
    const gpa = (total / grades.length).toFixed(2);

    try {
      await AsyncStorage.setItem("userGPA", gpa);
    } catch (error) {
      console.error("Error saving GPA:", error);
    }

    setGPA(gpa);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Your Grades</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Course</Text>
            <Text style={styles.headerText}>Grade</Text>
          </View>

          <ScrollView style={styles.scrollableTable}>
            {grades.length > 0 ? (
              grades.map((item, index) => (
                <View key={index.toString()} style={styles.tableRow}>
                  <Text style={styles.cellText}>{item.courseName || item.courseCode || "N/A"}</Text>
                  <Text style={styles.cellText}>{item.grade}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No grades available</Text>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.gpaContainer}>
        <Text style={styles.sectionTitle}>Your GPA</Text>
        <View style={styles.gpaBox}>
          <Text style={styles.gpaText}>{gpa}</Text>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.optionBox}>
          <Ionicons name="create-outline" size={40} color="#335ACF" />
          <Text style={styles.optionText}>Your Feedback</Text>
        </View>
        <View style={styles.optionBox}>
          <Ionicons name="megaphone-outline" size={40} color="#E27C48" />
          <Text style={styles.optionText}>Appeals</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#335ACF",
    alignItems: "center",
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    width: "90%",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    width: "50%",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  cellText: {
    fontSize: 16,
    width: "50%",
    textAlign: "center",
  },
  gpaContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  gpaBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  gpaText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#335ACF",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },
  optionBox: {
    width: "45%",
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  scrollableTable: {
    maxHeight: 260,
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    paddingVertical: 10,
  },
});

