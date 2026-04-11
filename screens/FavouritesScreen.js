import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/apiClient';

export default function FavouritesScreen() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [liveWeather, setLiveWeather] = useState({});

  // Reload whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchSavedCities();
    }, [])
  );

  const fetchSavedCities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cities');
      setCities(res.data);
      // Fetch live weather for each saved city
      res.data.forEach((city) => fetchLiveWeather(city.cityName));
    } catch (err) {
      Alert.alert('Error', 'Could not load saved cities');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveWeather = async (cityName) => {
    try {
      const res = await api.get(`/weather/current/${cityName}`);
      setLiveWeather((prev) => ({ ...prev, [cityName]: res.data }));
    } catch (_) {}
  };

  const saveCity = async () => {
    if (!cityInput.trim()) return;
    setSaving(true);
    try {
      // First validate city exists by fetching weather
      const weatherRes = await api.get(`/weather/current/${cityInput.trim()}`);
      const { city, country, lat, lon } = weatherRes.data;

      await api.post('/cities', { cityName: city, country, lat, lon });
      setCityInput('');
      fetchSavedCities();
    } catch (err) {
      if (err.response?.status === 400) {
        Alert.alert('Already Saved', 'This city is already in your favourites');
      } else if (err.response?.status === 404) {
        Alert.alert('Not Found', 'City not found. Check the name and try again.');
      } else {
        Alert.alert('Error', 'Could not save city');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCity = async (id) => {
    Alert.alert('Remove City', 'Remove this city from favourites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/cities/${id}`);
            setCities((prev) => prev.filter((c) => c._id !== id));
          } catch (_) {
            Alert.alert('Error', 'Could not remove city');
          }
        },
      },
    ]);
  };

  const getWeatherEmoji = (description) => {
    const d = description?.toLowerCase() || '';
    if (d.includes('clear')) return '☀️';
    if (d.includes('cloud')) return '☁️';
    if (d.includes('rain')) return '🌧️';
    if (d.includes('snow')) return '❄️';
    if (d.includes('thunder')) return '⛈️';
    if (d.includes('mist') || d.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const renderCity = ({ item }) => {
    const w = liveWeather[item.cityName];
    return (
      <View style={styles.cityCard}>
        <View style={styles.cityCardLeft}>
          <Text style={styles.cityCardName} numberOfLines={1}>
            {item.cityName.charAt(0).toUpperCase() + item.cityName.slice(1)}
            {item.country ? `, ${item.country}` : ''}
          </Text>
          {w ? (
            <Text style={styles.cityCardDesc}>{w.description}</Text>
          ) : (
            <ActivityIndicator size="small" color="#00d4ff" />
          )}
        </View>
        <View style={styles.cityCardRight}>
          {w && (
            <>
              <Text style={styles.cityEmoji}>{getWeatherEmoji(w.description)}</Text>
              <Text style={styles.cityTemp}>{w.temp}°C</Text>
            </>
          )}
          <TouchableOpacity onPress={() => deleteCity(item._id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favourites</Text>

      {/* Add city */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a city..."
          placeholderTextColor="#555577"
          value={cityInput}
          onChangeText={setCityInput}
          onSubmitEditing={saveCity}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={saveCity} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#0f0f23" />
          ) : (
            <Ionicons name="add" size={24} color="#0f0f23" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00d4ff" style={{ marginTop: 40 }} />
      ) : cities.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyText}>No favourite cities yet.{'\n'}Add one above!</Text>
        </View>
      ) : (
        <FlatList
          data={cities}
          keyExtractor={(item) => item._id}
          renderItem={renderCity}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', paddingHorizontal: 20 },
  title: { fontSize: 26, color: '#fff', fontWeight: 'bold', paddingTop: 60, paddingBottom: 20 },
  searchRow: { flexDirection: 'row', marginBottom: 20 },
  input: {
    flex: 1, backgroundColor: '#1a1a35', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: '#1e1e3f',
  },
  addBtn: {
    backgroundColor: '#00d4ff', borderRadius: 12,
    paddingHorizontal: 16, marginLeft: 10, justifyContent: 'center',
  },
  cityCard: {
    backgroundColor: '#1a1a35', borderRadius: 14, padding: 16,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#1e1e3f',
  },
  cityCardLeft: { flex: 1, marginRight: 10 },
  cityCardName: { color: '#fff', fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  cityCardDesc: { color: '#888', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  cityCardRight: { alignItems: 'center', gap: 4 },
  cityEmoji: { fontSize: 24 },
  cityTemp: { color: '#00d4ff', fontSize: 18, fontWeight: 'bold' },
  deleteBtn: { marginTop: 4, padding: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#555577', fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
