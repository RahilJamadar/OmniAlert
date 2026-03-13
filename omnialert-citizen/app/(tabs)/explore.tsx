import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, FlatList, TouchableOpacity, View, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

export default function ExploreScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [safeZones, setSafeZones] = useState<any[]>([]);

  const API_BASE = 'http://10.229.72.183:5000'; // Make sure this IP corresponds to the PC running the backend

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Fetch Safe Zones
      try {
        const res = await axios.get(`${API_BASE}/api/safezones`);
        if (res.data.success) {
          setSafeZones(res.data.data);
        }
      } catch (err) {
        console.warn("Could not fetch safe zones", err);
      }
    })();
  }, []);

  // Calculate distances and sort
  const safeZonesWithDistance = safeZones.map(zone => {
    let distance = 0;
    if (location) {
      distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        zone.location.coordinates[1],
        zone.location.coordinates[0]
      );
    }
    return { ...zone, distance };
  }).sort((a, b) => a.distance - b.distance);

  const openNavigation = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch(err => console.error('An error occurred opening map', err));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
        <View style={[styles.badge, item.status === 'OPEN' ? styles.badgeOpen : styles.badgeFull]}>
          <ThemedText style={[styles.badgeText, item.status === 'OPEN' ? styles.badgeTextOpen : styles.badgeTextFull]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardDetail}>Capacity: {item.capacity} max</ThemedText>
        {location && (
          <ThemedText style={styles.distanceText}>
            {item.distance.toFixed(1)} km away
          </ThemedText>
        )}
      </View>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => openNavigation(item.location.coordinates[1], item.location.coordinates[0], item.name)}
      >
        <ThemedText style={styles.navButtonText}>Open Navigation</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Nearest Safe Zones</ThemedText>
      </ThemedView>
      {location ? (
        <FlatList
          data={safeZonesWithDistance}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <ThemedView style={styles.loadingContainer}>
              <ThemedText>Searching for nearby safe zones...</ThemedText>
            </ThemedView>
          }
        />
      ) : (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Acquiring current location...</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeTextOpen: {
    color: '#4ade80',
  },
  badgeTextFull: {
    color: '#f87171',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardDetail: {
    color: '#94a3b8',
    fontSize: 14,
  },
  distanceText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  }
});
