import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function ExploreScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const dummyHazards = [
    { id: 1, lat: (location?.coords.latitude || 0) + 0.01, lng: (location?.coords.longitude || 0) + 0.01, title: 'Fire Hazard Zone' },
    { id: 2, lat: (location?.coords.latitude || 0) - 0.01, lng: (location?.coords.longitude || 0) - 0.01, title: 'Flooded Area' },
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Live Hazard Map</ThemedText>
      </ThemedView>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
        >
          {dummyHazards.map(hazard => (
            <Marker
              key={hazard.id}
              coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
              title={hazard.title}
              pinColor="red"
            />
          ))}
        </MapView>
      ) : (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Loading map data...</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1D3D47',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
