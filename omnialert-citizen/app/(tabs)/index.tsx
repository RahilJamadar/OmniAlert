import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Alert, Platform, View, Text, Dimensions, Modal } from 'react-native';
import { useAudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as IntentLauncher from 'expo-intent-launcher';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, withSequence, FadeInDown, FadeInUp } from 'react-native-reanimated';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';
const API_BASE = 'http://10.229.72.183:5000'; // Make sure this matches your PC's IP

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Define background task for notifications when app is killed
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }
  if (data) {
    console.log('Received background push notification:', data);
    const notificationData = (data as any)?.notification?.data || (data as any)?.data || {};
    const type = notificationData?.type || (data as any)?.type;
    const isEmergency = type === 'EMERGENCY' || type === 'EVACUATION_OVERLAY';

    if (isEmergency) {
      // 1. Immediate Audio in Background
      try {
        const bgPlayer = createAudioPlayer(require('../../assets/audio/siren.mp3'));
        bgPlayer.loop = true;
        bgPlayer.play();
      } catch (err) {
        console.warn("Could not play background audio:", err);
      }

      // 2. Full-Screen Intent / High Priority Present
      try {
        // @ts-ignore
        if (Notifications.presentNotificationAsync) {
          await (Notifications as any).presentNotificationAsync({
            title: notificationData.title || "🚨 EMERGENCY ALERT 🚨",
            body: notificationData.message || "Immediate Action Required.",
            data: notificationData,
            fullScreenIntent: true
          });
        } else {
          // Fallback for newer expo-notifications
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notificationData.title || "🚨 EMERGENCY ALERT 🚨",
              body: notificationData.message || "Immediate Action Required. Open App Now.",
              data: notificationData,
              sound: 'default'
            },
            trigger: null
          });
        }
      } catch (err) {
        console.warn("Failed to present full-screen notification:", err);
      }
    }
  }
});

// Register the background task
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

const { width, height } = Dimensions.get('window');

// Register for Push Notifications
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency-siren', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'siren.mp3', // FCM payload handles sound
      bypassDnd: true,  // Allow overriding Do Not Disturb
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  token = (await Notifications.getDevicePushTokenAsync()).data;
  return token;
}

// Helper: Calculate distance using Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HomeScreen() {
  const [isSosBroadcasting, setIsSosBroadcasting] = useState(false);
  const [isReceivingAlert, setIsReceivingAlert] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearestShelter, setNearestShelter] = useState<any>(null);
  const [emergencyMessage, setEmergencyMessage] = useState("EMERGENCY SIGNAL BROADCASTING");

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // We are using the correct URL explicitly as requested:
  // 1. Correct way to reference a local asset
  const sirenSoundUrl = require('../../assets/audio/siren.mp3');
  const player = useAudioPlayer(sirenSoundUrl);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const redFlashOpacity = useSharedValue(0);

  const startPulse = (isEmergency: boolean = false) => {
    pulseScale.value = withRepeat(withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }), -1, true);
    pulseOpacity.value = withRepeat(withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }), -1, true);

    // Aggressive red screen strobe only for incoming emergencies
    if (isEmergency) {
      redFlashOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 400 }),
          withTiming(0.2, { duration: 400 })
        ),
        -1,
        true
      );
    }
  };

  const stopPulseAnimation = () => {
    pulseScale.value = withTiming(1);
    pulseOpacity.value = withTiming(0);
    redFlashOpacity.value = withTiming(0);
  };

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    };
  });

  const animatedRedFlashStyle = useAnimatedStyle(() => {
    return {
      opacity: redFlashOpacity.value,
      display: redFlashOpacity.value > 0.05 ? 'flex' : 'none'
    };
  });

  // Keep player loops active
  useEffect(() => {
    if (player) {
      player.loop = true;
    }
  }, [player]);

  // Helper: Autopilot permission requests
  const requestAllPermissions = async () => {
    try {
      const hasInitialized = await AsyncStorage.getItem('HAS_INITIALIZED_PERMISSIONS');
      if (hasInitialized === 'true') {
        return;
      }

      // 1. Notifications
      const { status: notifStatus, canAskAgain: canAskNotif } = await Notifications.getPermissionsAsync();
      if (notifStatus !== 'granted' && canAskNotif) {
        await Notifications.requestPermissionsAsync();
      }

      // 2. Location
      const { status: locStatus, canAskAgain: canAskLoc } = await Location.getForegroundPermissionsAsync();
      if (locStatus !== 'granted' && canAskLoc) {
        await Location.requestForegroundPermissionsAsync();
      }

      // 3. Overlay (Android Only)
      if (Platform.OS === 'android') {
        const hasPrompted = await AsyncStorage.getItem('OVERLAY_PROMPT_SHOWN');
        if (!hasPrompted) {
          Alert.alert(
            'CRITICAL PERMISSIONS REQUIRED',
            'OmniAlert requires the "Display over other apps" and Full Screen Intent permissions. This allows life-saving emergency sirens and red strobe alerts to instantly wake your phone even if the app is closed.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  await AsyncStorage.setItem('OVERLAY_PROMPT_SHOWN', 'true');
                }
              },
              {
                text: 'Grant Permission',
                onPress: async () => {
                  try {
                    await AsyncStorage.setItem('OVERLAY_PROMPT_SHOWN', 'true');
                    await IntentLauncher.startActivityAsync(
                      IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION
                    );
                  } catch (err) {
                    console.warn('Could not launch intent', err);
                  }
                }
              }
            ]
          );
        }
      }

      await AsyncStorage.setItem('HAS_INITIALIZED_PERMISSIONS', 'true');
    } catch (e) {
      console.warn("Permission autopilot error:", e);
    }
  };

  // Initial Boot Logic
  useEffect(() => {
    (async () => {
      await requestAllPermissions();

      let loc: Location.LocationObject | null = null;
      try {
        let { status: locStatus } = await Location.getForegroundPermissionsAsync();
        if (locStatus === 'granted') {
          loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }
      } catch (e) {
        console.warn("Location fetch error:", e);
      }

      // Calculate nearest shelter from backend API
      if (loc) {
        try {
          const szRes = await axios.get(`${API_BASE}/api/safezones`);
          if (szRes.data.success && szRes.data.data.length > 0) {
            let minDistance = Infinity;
            let nearest = null;
            for (const shelter of szRes.data.data) {
              const shelLng = shelter.location.coordinates[0];
              const shelLat = shelter.location.coordinates[1];
              const d = getDistanceFromLatLonInKm(loc.coords.latitude, loc.coords.longitude, shelLat, shelLng);
              if (d < minDistance) {
                minDistance = d;
                nearest = { name: shelter.name, distance: d, status: shelter.status };
              }
            }
            if (nearest) {
              setNearestShelter(nearest);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch nearest safe zones:", err);
        }
      }

      const token = await registerForPushNotificationsAsync();
      const pushToken = token || 'mock-fcm-token-c1234';

      try {
        await axios.post(`${API_BASE}/api/users/register`, {
          userId: 'citizen-1234',
          fcmToken: pushToken,
          lat: loc ? loc.coords.latitude : 0,
          lng: loc ? loc.coords.longitude : 0,
          name: 'Demo Citizen'
        });
        console.log("Registered token successfully:", pushToken);
      } catch (err: any) {
        console.warn('Backend registration failed.', err.message);
      }
    })();

    // Check if we launched via an intent
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && response.notification) {
        const data = response.notification.request.content.data;
        const type = data?.type;
        if (type === 'EMERGENCY' || type === 'EVACUATION_OVERLAY' || type === 'MANUAL_BROADCAST' || type === 'CYCLONE' || type === 'FLOOD') {
          setEmergencyMessage(typeof data?.message === 'string' ? data.message : "EMERGENCY ALERT RECEIVED");
          activateEmergencySequence();
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Foreground Notification Received:", notification);
      const data = notification.request.content.data;
      setEmergencyMessage(typeof data?.message === 'string' ? data.message : (notification.request.content.body || "EMERGENCY ALERT RECEIVED"));
      activateEmergencySequence();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification Response:", response);
      const data = response.notification.request.content.data;
      setEmergencyMessage(typeof data?.message === 'string' ? data.message : "EMERGENCY ALERT RECEIVED");
      activateEmergencySequence();
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [player]);

  const activateEmergencySequence = () => {
    setIsReceivingAlert(true);
    if (player) player.play();
    startPulse(true);
  };

  const playSiren = () => {
    if (player) player.play();
  };

  const stopEmergencyAlert = () => {
    if (player) {
      player.pause();
      player.seekTo(0);
    }
    setIsReceivingAlert(false);
    stopPulseAnimation();
    setEmergencyMessage("EMERGENCY ALERT DISMISSED");
  };

  const triggerSOS = async () => {
    if (isSosBroadcasting) {
      setIsSosBroadcasting(false);
      stopPulseAnimation();
      return;
    }

    setIsSosBroadcasting(true);
    startPulse(false); // pulse UI but no red strobe

    try {
      const payload = {
        userId: 'citizen-1234',
        lat: location?.coords.latitude,
        lng: location?.coords.longitude,
        timestamp: new Date().toISOString()
      };

      await axios.post(`${API_BASE}/api/sos`, payload);
    } catch (error) {
      console.warn('Failed to send SOS to backend');
      setIsSosBroadcasting(false);
      stopPulseAnimation();
    }
  };

  return (
    <LinearGradient colors={['#000000', '#0a0f1c', '#0f1b29']} style={styles.container}>

      {/* FULL SCREEN RED STROBE OVERLAY */}
      <Animated.View style={[styles.redFlashOverlay, animatedRedFlashStyle]} pointerEvents="none" />

      {/* EMERGENCY MODAL FOR FULL SCREEN TAKEOVER */}
      <Modal visible={isReceivingAlert} transparent={true} animationType="fade">
        <Animated.View style={[styles.modalBackground, animatedRedFlashStyle]} />
        <View style={styles.modalContent}>
          <Text style={styles.emergencyHeadline}>🚨 CATASTROPHIC ALERT 🚨</Text>
          <Text style={styles.emergencySubText}>{emergencyMessage}</Text>

          {nearestShelter && (
            <View style={styles.shelterBox}>
              <Text style={styles.shelterBoxTitle}>NEAREST SAFE ZONE / SHELTER</Text>
              <Text style={styles.shelterBoxName}>{nearestShelter.name}</Text>
              <Text style={styles.shelterBoxDistance}>{nearestShelter.distance.toFixed(1)} km away</Text>
              <Text style={styles.shelterBoxInstructions}>Evacuate to this location immediately if advised.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.stopEmergencyButton} onPress={stopEmergencyAlert}>
            <Text style={styles.stopEmergencyText}>I AM SAFE (DISMISS ALARM)</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(800).delay(100)} style={styles.header}>
        <Text style={styles.headerTitle}>OmniAlert <Text style={styles.headerSubtitle}>Citizen</Text></Text>
        <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']} style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Connected</Text>
        </LinearGradient>
      </Animated.View>

      {/* Main SOS Button Area */}
      <Animated.View entering={FadeInUp.duration(1000).delay(200)} style={styles.sosWrapper}>
        <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.sosButton, isSosBroadcasting ? styles.sosButtonActive : null]}
          onPress={triggerSOS}
        >
          <LinearGradient
            colors={isSosBroadcasting ? ['#ef4444', '#991b1b'] : ['#dc2626', '#7f1d1d']}
            style={styles.sosGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.sosText}>{isSosBroadcasting ? 'STOP' : 'S O S'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.sosHelperText}>
          {isSosBroadcasting ? 'Broadcasting Emergency Signal...' : 'Tap for Emergency Broadcast'}
        </Text>
      </Animated.View>

      {/* Glassmorphic Info Cards */}
      <View style={styles.cardsContainer}>
        {/* Risk Level Card */}
        <Animated.View entering={FadeInDown.duration(800).delay(400)}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.glassCard}>
            <Text style={styles.cardLabel}>LIVE RISK LEVEL</Text>
            <View style={styles.cardRow}>
              <View style={[styles.riskIndicator, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.cardValue}>MODERATE</Text>
            </View>
            <Text style={styles.cardSubtext}>Area monitoring active</Text>
          </LinearGradient>
        </Animated.View>

        {/* Shelter Card */}
        <Animated.View entering={FadeInDown.duration(800).delay(600)}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.glassCard}>
            <Text style={styles.cardLabel}>NEAREST SHELTER</Text>
            <Text style={styles.cardValue}>{nearestShelter ? nearestShelter.name : "Locating..."}</Text>
            <Text style={styles.cardSubtext}>{nearestShelter ? `${nearestShelter.distance.toFixed(2)} km away • ${nearestShelter.status}` : "Calculating..."}</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  redFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'red',
    zIndex: 9999,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'red',
    zIndex: 0,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1,
  },
  emergencyHeadline: {
    color: '#ff4444',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
    textShadowColor: 'red',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  emergencySubText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  shelterBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#34d399',
    alignItems: 'center',
    marginBottom: 50,
  },
  shelterBoxTitle: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  shelterBoxName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  shelterBoxDistance: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  shelterBoxInstructions: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  stopEmergencyButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 100,
    shadowColor: '#ffffff',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  stopEmergencyText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontWeight: '300',
    color: '#f87171',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    marginRight: 6,
    shadowColor: '#34d399',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  sosWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 350,
  },
  pulseRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  sosButtonActive: {
    shadowColor: '#f87171',
    shadowOpacity: 0.9,
    shadowRadius: 30,
  },
  sosGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,160,160,0.3)',
  },
  sosText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
  },
  sosHelperText: {
    marginTop: 40,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 16,
  },
  glassCard: {
    width: '100%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  riskIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  cardSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  }
});
