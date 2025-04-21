import React, { useEffect, useRef } from "react";
import { Text, View, Image, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useRouter } from "expo-router";
import 'react-native-url-polyfill/auto';
import { Platform } from "react-native";

const fontFamily = Platform.select({
  ios: "Helvetica Neue",
  android: "Roboto",
});

export default function Index() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={require('../assets/images/Logo.png')} />

      {/* Animated Pulse Under Logo */}
      <Animated.View
        style={[
          styles.pulseLine,
          {
            transform: [{ scaleX: pulseAnim }],
          },
        ]}
      />

      <Text style={styles.text1}>The Smart Way</Text>
      <Text style={styles.text}>to Improve Your Exams Quality</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push("/screens/login")}
        >
          <Text style={styles.buttonText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => router.push("/screens/register")}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#335ACF',
  },
  logo: {
    width: 550,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  pulseLine: {
    height: 4,
    width: 200,
    backgroundColor: '#F6C36B',
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 30,
  },
  text1: {
    color: 'white',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 20,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily,
  },
  text: {
    color: 'white',
    alignSelf: 'flex-start',
    marginLeft: 20,
    fontSize: 24,
    fontWeight: '300',
    fontFamily,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 50,
  },
  button: {
    width: 200,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: '#D9D9D9',
  },
  registerButton: {
    backgroundColor: '#E27C48',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    fontFamily,
  },
});
