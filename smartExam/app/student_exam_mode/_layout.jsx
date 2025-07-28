import { Stack, useRouter } from "expo-router";
import { View, TouchableOpacity, Image, StyleSheet, Text, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Layout() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1E2A38" },
          headerTitleAlign: "center",
          headerTintColor: "#fff",
          headerTitle: () => (
            <Image source={require("../../assets/images/Logo.png")} style={styles.logo} />
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.push("/(studentScreens)/profile")}>
              <Ionicons name="person-circle-outline" size={28} color="#fff" style={styles.icon} />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen name="examMode" options={{ headerShown: true, title: "" }} />

        <Stack.Screen name="examPage" options={{ headerShown: true, title: "" }} />

        <Stack.Screen name="questionPage" options={{ headerShown: true, title: "" }} />

        <Stack.Screen name="examResult" options={{ headerShown: true, title: "" }} />


      </Stack>

      {/* Footer Navigation Bar */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push("/(studentScreens)/studentDashboard")} style={styles.footerButton}>
          <Ionicons name="home-outline" size={28} color="#fff" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E2A38",
  },
  logo: {
    width: 300,
    height: 30,
    resizeMode: "contain",
  },
  icon: {
    marginRight: 15,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#1E2A38",
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#4B5D6B",
  },
  footerButton: {
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 14,
  },
});
