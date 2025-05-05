import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Button, TextInput, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';

export default function App() {
  const [location, setLocation] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  const API_TOKEN = 'IPJJIBBTJNCCOF2TJY' 
    

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const fetchEvents = async () => {
    if (!location) return;

    setLoading(true);
    const baseUrl = 'https://www.eventbriteapi.com/v3/events/search/';
    const params = {
      'location.latitude': location.latitude,
      'location.longitude': location.longitude,
      expand: 'venue',
      token: API_TOKEN,
    };

    if (category) params.q = category;
    if (date) params['start_date.range_start'] = new Date(date).toISOString();

    try {
      const res = await axios.get(baseUrl, { params });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      alert('Failed to fetch events. Check your API token.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (location) fetchEvents();
  }, [location]);

  if (!location) return <ActivityIndicator style={styles.centered} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Local Event Finder</Text>

      <View style={styles.filters}>
        <TextInput
          placeholder="Category (e.g. music, tech)"
          style={styles.input}
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          placeholder="Start Date (YYYY-MM-DD)"
          style={styles.input}
          value={date}
          onChangeText={setDate}
        />
        <Button title="Search Events" onPress={fetchEvents} />
      </View>

      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {events.map(event => {
          const venue = event.venue;
          if (venue && venue.latitude && venue.longitude) {
            return (
              <Marker
                key={event.id}
                coordinate={{
                  latitude: parseFloat(venue.latitude),
                  longitude: parseFloat(venue.longitude),
                }}
                title={event.name.text}
              />
            );
          }
          return null;
        })}
      </MapView>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{item.name.text}</Text>
            <Text>{item.start.local}</Text>
            <Text>{item.venue?.address?.localized_address_display}</Text>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  filters: {
    marginBottom: 10,
  },
  input: {
    padding: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 5,
    borderRadius: 5,
  },
  map: {
    height: 250,
    marginBottom: 10,
  },
  eventCard: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  eventTitle: {
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
});
