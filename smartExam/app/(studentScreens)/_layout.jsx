import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { View, Image, TouchableOpacity } from "react-native";

export default function StudentLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#F0FFFF", paddingTop: 0 },
        tabBarActiveTintColor: "#E27C48",
        tabBarInactiveTintColor: "#000",
        headerStyle: {
          backgroundColor: "#335ACF",
          shadowOpacity: 0,
          elevation: 0, // Removes shadow on Android
          borderBottomWidth: 0, // Removes border on iOS
        },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitle: () => (
          <View style={{ flex: 1, alignItems: "center" }}>
            <Image
              source={require("../../assets/images/Logo.png")}
              style={{ width: 300, height: 30, resizeMode: "contain" }}
            />
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => router.push("/profile")}>
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
      {/* Home Screen */}
      <Tabs.Screen
        name="studentDashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {/* Grades Screen */}
      <Tabs.Screen
        name="grades"
        options={{
          title: "Grades",
          tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} />,
        }}
      />

      {/* Inbox Screen */}
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
        }}
      />

      {/* Calendar Screen */}
      <Tabs.Screen
        name="calendar"
        options={{
          headerStyle: {backgroundColor:'#1E3A70'},
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />

      {/* Profile Screen */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
