import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/apiClient';

export default function ForecastScreen() {
  const [city, setCity] = useState('');
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const searchForecast = async () => {
    if (!city.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/weather/forecast/${city.trim()}`);
      setForecast(res.data);
      const firstDay = Object.keys(res.data.forecast)[0];
      setSelectedDay(firstDay);
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert('Not Found', 'City not found.');
      } else {
        Alert.alert('Error', 'Could not fetch forecast. Check your connection.');
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDayAvgTemp = (dayData) => {
    const avg = dayData.reduce((sum, h) => sum + h.temp, 0) / dayData.length;
    return Math.round(avg);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>5-Day Forecast</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search city..."
          placeholderTextColor="#555577"
          value={city}
          onChangeText={setCity}
          onSubmitEditing={searchForecast}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchForecast}>
          <Ionicons name="search" size={22} color="#0f0f23" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#00d4ff" style={{ marginTop: 40 }} />}

      {forecast && !loading && (
        <>
          <Text style={styles.cityName}>
            {forecast.city}, {forecast.country}
          </Text>

          {/* Day Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {Object.entries(forecast.forecast).map(([date, dayData]) => (
              <TouchableOpacity
                key={date}
                style={[styles.dayChip, selectedDay === date && styles.dayChipActive]}
                onPress={() => setSelectedDay(date)}
              >
                <Text style={[styles.dayChipText, selectedDay === date && styles.dayChipTextActive]}>
                  {formatDate(date)}
                </Text>
                <Text style={styles.dayEmoji}>{getWeatherEmoji(dayData[0].description)}</Text>
                <Text style={[styles.dayTemp, selectedDay === date && styles.dayChipTextActive]}>
                  {getDayAvgTemp(dayData)}°C
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Hourly breakdown for selected day */}
          {selectedDay && forecast.forecast[selectedDay] && (
            <View style={styles.hourlyContainer}>
              <Text style={styles.sectionTitle}>
                {formatDate(selectedDay)} — Hourly
              </Text>
              {forecast.forecast[selectedDay].map((hour, idx) => (
                <View key={idx} style={styles.hourRow}>
                  <Text style={styles.hourTime}>{hour.time.slice(0, 5)}</Text>
                  <Text style={styles.hourEmoji}>{getWeatherEmoji(hour.description)}</Text>
                  <Text style={styles.hourTemp}>{hour.temp}°C</Text>
                  <Text style={styles.hourDesc}>{hour.description}</Text>
                  <View style={styles.hourExtra}>
                    <Text style={styles.hourExtraText}>💧 {hour.humidity}%</Text>
                    <Text style={styles.hourExtraText}>💨 {hour.wind_speed}m/s</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {!forecast && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>Search a city to see the 5-day forecast</Text>
        </View>
      )}
    </ScrollView>
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
  searchBtn: {
    backgroundColor: '#00d4ff', borderRadius: 12,
    paddingHorizontal: 16, marginLeft: 10, justifyContent: 'center',
  },
  cityName: { fontSize: 20, color: '#aaa', marginBottom: 16, textAlign: 'center' },
  daySelector: { marginBottom: 20 },
  dayChip: {
    backgroundColor: '#1a1a35', borderRadius: 14, padding: 14,
    marginRight: 10, alignItems: 'center', minWidth: 90,
    borderWidth: 1, borderColor: '#1e1e3f',
  },
  dayChipActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  dayChipText: { color: '#888', fontSize: 12, marginBottom: 4 },
  dayChipTextActive: { color: '#0f0f23', fontWeight: 'bold' },
  dayEmoji: { fontSize: 24, marginVertical: 4 },
  dayTemp: { color: '#fff', fontSize: 14, fontWeight: '600' },
  hourlyContainer: {
    backgroundColor: '#1a1a35', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#1e1e3f', marginBottom: 30,
  },
  sectionTitle: { color: '#888', fontSize: 14, marginBottom: 12 },
  hourRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e3f',
    gap: 8,
  },
  hourTime: { color: '#00d4ff', fontSize: 14, width: 45 },
  hourEmoji: { fontSize: 20 },
  hourTemp: { color: '#fff', fontSize: 16, fontWeight: '600', width: 50 },
  hourDesc: { color: '#888', fontSize: 13, flex: 1, textTransform: 'capitalize' },
  hourExtra: { alignItems: 'flex-end' },
  hourExtraText: { color: '#555577', fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#555577', fontSize: 16, textAlign: 'center' },
});
