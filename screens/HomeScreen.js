import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  addRecentSearch,
  getRecentSearches,
  cacheWeatherData,
  getCachedWeather,
} from '../database/sqlite';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  };

  const searchWeather = async (cityName) => {
    const target = cityName || city.trim();
    if (!target) return;

    setLoading(true);
    setIsOffline(false);

    try {
      const res = await api.get(`/weather/current/${target}`);
      setWeather(res.data);
      await cacheWeatherData(target, res.data);
      await addRecentSearch(res.data.city, res.data.country);
      loadRecentSearches();
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert('Not Found', 'City not found. Please check the name and try again.');
      } else {
        // Try to load from cache if offline
        const cached = await getCachedWeather(target);
        if (cached) {
          setWeather(cached);
          setIsOffline(true);
        } else {
          Alert.alert('Error', 'Could not fetch weather. Check your connection.');
        }
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#555577" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search city..."
          placeholderTextColor="#555577"
          value={city}
          onChangeText={setCity}
          onSubmitEditing={() => searchWeather()}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => searchWeather()}>
          <Ionicons name="search" size={22} color="#0f0f23" />
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Showing cached data (offline)</Text>
        </View>
      )}

      {/* Loading */}
      {loading && <ActivityIndicator size="large" color="#00d4ff" style={{ marginTop: 40 }} />}

      {/* Weather Card */}
      {weather && !loading && (
        <View style={styles.weatherCard}>
          <Text style={styles.cityName}>
            {weather.city}, {weather.country}
          </Text>
          <Text style={styles.weatherEmoji}>{getWeatherEmoji(weather.description)}</Text>
          <Text style={styles.temp}>{weather.temp}°C</Text>
          <Text style={styles.description}>{weather.description}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Ionicons name="thermometer-outline" size={18} color="#00d4ff" />
              <Text style={styles.detailLabel}>Feels like</Text>
              <Text style={styles.detailValue}>{weather.feels_like}°C</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="water-outline" size={18} color="#00d4ff" />
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{weather.humidity}%</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="speedometer-outline" size={18} color="#00d4ff" />
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{weather.wind_speed} m/s</Text>
            </View>
          </View>

          <View style={styles.minMaxRow}>
            <Text style={styles.minMax}>↓ {weather.temp_min}°C</Text>
            <Text style={styles.minMax}>↑ {weather.temp_max}°C</Text>
          </View>
        </View>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentItem}
              onPress={() => searchWeather(item.city_name)}
            >
              <Ionicons name="time-outline" size={16} color="#555577" />
              <Text style={styles.recentText}>
                {item.city_name}{item.country ? `, ${item.country}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 60, paddingBottom: 20,
  },
  greeting: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  searchRow: { flexDirection: 'row', marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#1a1a35', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: '#1e1e3f',
  },
  searchBtn: {
    backgroundColor: '#00d4ff', borderRadius: 12,
    paddingHorizontal: 16, marginLeft: 10, justifyContent: 'center',
  },
  offlineBanner: {
    backgroundColor: '#2a1a1a', borderRadius: 8,
    padding: 10, marginBottom: 12, alignItems: 'center',
  },
  offlineText: { color: '#ff6b6b', fontSize: 13 },
  weatherCard: {
    backgroundColor: '#1a1a35', borderRadius: 20,
    padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e1e3f', marginBottom: 24,
  },
  cityName: { fontSize: 20, color: '#aaa', marginBottom: 8 },
  weatherEmoji: { fontSize: 64, marginVertical: 8 },
  temp: { fontSize: 64, color: '#fff', fontWeight: 'bold' },
  description: {
    fontSize: 18, color: '#00d4ff',
    textTransform: 'capitalize', marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', marginBottom: 16,
  },
  detail: { alignItems: 'center', gap: 4 },
  detailLabel: { color: '#555577', fontSize: 12 },
  detailValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  minMaxRow: {
    flexDirection: 'row', gap: 24,
  },
  minMax: { color: '#888', fontSize: 16 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#888', fontSize: 14, marginBottom: 10 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e3f',
  },
  recentText: { color: '#ccc', fontSize: 15, textTransform: 'capitalize' },
});
