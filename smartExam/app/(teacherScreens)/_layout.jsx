import { Ionicons } from "@expo/vector-icons";
import { Stack, Tabs, useRouter } from "expo-router";
import { View, Image, TouchableOpacity } from "react-native";
import examModeTab from "../../assets/images/examModeTab.png";
import examModeTabF from "../../assets/images/examModeTabF.png";
import house from "../../assets/images/house.png";
import houseF from "../../assets/images/houseF.png";
import calendar1 from "../../assets/images/calendar1.png";
import calendar1F from "../../assets/images/calendar1F.png";
import presentation from "../../assets/images/presentation.png";
import presentationF from "../../assets/images/presentationF.png";



export default function TeacherLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#F0FFFF", paddingTop: 0 },
        tabBarActiveTintColor: "#E27C48",
        tabBarInactiveTintColor: "#000",
        headerStyle: {
          backgroundColor: "#E27C48",
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitle: () => (
          <View style={{ flex: 1, alignItems: "center" }}>
            <Image
              source={require("../../assets/images/Logo2.png")}
              style={{ width: 300, height: 30, resizeMode: "contain" }}
            />
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => router.push("/teacherProfile")}>
            <Ionicons name="person-outline" size={28} color="white" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity style={{ marginRight: 15 }}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="teacherDashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? houseF : house}
              style={{
                width: focused ? 30 : 26,
                height: focused ? 30 : 26,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />


      <Tabs.Screen
        name="teacherCalendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? calendar1F : calendar1}
              style={{
                width: focused ? 30 : 26,
                height: focused ? 30 : 26,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />


      <Tabs.Screen
        name="teacherInbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
          tabBarButton: () => null, // Hides the button
          tabBarItemStyle: { display: "none" }, // Removes reserved space
        }}
      />


      <Tabs.Screen
        name="teacher_exam_mode"
        options={{
          title: "Exam Mode",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? examModeTabF : examModeTab}
              style={{
                width: focused ? 34 : 28,
                height: focused ? 34 : 28,
                resizeMode: "contain",
              }}
            />
          ),
          tabBarLabelStyle: {
            color: "#1E3A70",
            fontWeight: "bold",
            fontSize: 11,
          },
          tabBarItemStyle: {
            backgroundColor: "#FFE4C4",
            borderRadius: 10,
            margin: -2,
          },
        }}
      />


      <Tabs.Screen
        name="teacherClasses"
        options={{
          headerStyle: { backgroundColor: "#1E3A70" },
          title: "Classes",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? presentationF : presentation}
              style={{
                width: focused ? 30 : 26,
                height: focused ? 30 : 26,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />


      <Tabs.Screen
        name="teacherProfile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}