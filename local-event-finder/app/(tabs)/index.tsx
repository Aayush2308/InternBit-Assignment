import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, TextInput, ScrollView, Platform, TouchableOpacity, KeyboardAvoidingView, Image, Dimensions } from 'react-native';

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type Venue = {
  latitude?: string;
  longitude?: string;
  address?: {
    localized_address_display?: string;
  };
};

type Event = {
  id: string;
  name: { text: string };
  start: { local: string };
  venue?: Venue;
  logo?: { url: string };
};

// Web-only map component (dynamic import for web)
let WebMap: React.FC<any> = () => null;
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  const { MapContainer, TileLayer, Marker, Popup, useMap } = require('react-leaflet');
  require('leaflet/dist/leaflet.css');

  function SetView({ center }: { center: [number, number] }) {
    const map = useMap();
    React.useEffect(() => {
      map.setView(center);
    }, [center, map]);
    return null;
  }

  WebMap = ({ location, events }: { location: { latitude: number; longitude: number }, events: any[] }) => (
    <div style={{ height: 300, width: '100%', marginBottom: 16, borderRadius: 10, overflow: 'hidden' }}>
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <SetView center={[location.latitude, location.longitude]} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[location.latitude, location.longitude]}>
          <Popup>Your Location</Popup>
        </Marker>
        {events.map(event =>
          event.venue?.latitude && event.venue?.longitude && (
            <Marker
              key={event.id}
              position={[parseFloat(event.venue.latitude), parseFloat(event.venue.longitude)]}
            >
              <Popup>{event.name.text}</Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}

export default function App() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const Location = await import('expo-location');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  const fetchEvents = async () => {
    if (!location) return;
    setSearching(true);
    setEvents([]);
    const params: any = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    if (category) params.q = category;
    if (date) params.date = date;

    try {
      const response = await fetch(
        `http://localhost:3001/events?latitude=${params.latitude}&longitude=${params.longitude}${category ? `&q=${encodeURIComponent(category)}` : ''}${date ? `&date=${encodeURIComponent(date)}` : ''}`
      );
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      alert('Failed to fetch events from backend.');
    }
    setSearching(false);
  };

  if (loading || !location) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>🎉 Local Event Finder</Text>
        <Text style={styles.subHeader}>Find events happening near you!</Text>

        <View style={styles.filters}>
          <TextInput
            placeholder="Category (e.g. music, tech)"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Start Date (YYYY-MM-DD)"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={fetchEvents} disabled={searching}>
            <Text style={styles.buttonText}>{searching ? 'Searching...' : 'SEARCH EVENTS'}</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' && location && (
          <WebMap location={location} events={events} />
        )}

        <Text style={styles.resultsHeader}></Text>
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              {item.logo?.url && (
                <View style={styles.imageContainer}>
                  {Platform.OS === 'web' ? (
                    // @ts-ignore
                    <img src={item.logo.url} alt="event" style={styles.eventImage} />
                  ) : (
                    <Image source={{ uri: item.logo.url }} style={styles.eventImage} />
                  )}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{item.name.text}</Text>
                <Text style={styles.eventDate}>{new Date(item.start.local).toLocaleString()}</Text>
                <Text style={styles.eventAddress}>{item.venue?.address?.localized_address_display}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !searching ? (
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No events found. Try another search.</Text>
            ) : null
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#111',
    minHeight: Dimensions.get('window').height,
    flexGrow: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F8EF7',
    marginBottom: 4,
    textAlign: 'center',
    marginTop: 16,
  },
  subHeader: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 18,
    textAlign: 'center',
  },
  filters: {
    marginBottom: 18,
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    padding: 10,
    borderColor: '#4F8EF7',
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 6,
    color: '#fff',
    backgroundColor: '#181818',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4F8EF7',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  map: {
    height: 200,
    marginBottom: 14,
    borderRadius: 10,
    overflow: 'hidden',
  },
  resultsHeader: {
    color: '#4F8EF7',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  imageContainer: {
    marginRight: 14,
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventImage: {
    width: 70,
    height: 70,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  eventTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  eventDate: {
    color: '#4F8EF7',
    fontSize: 14,
    marginBottom: 2,
  },
  eventAddress: {
    color: '#ccc',
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    minHeight: Dimensions.get('window').height,
  },
});
