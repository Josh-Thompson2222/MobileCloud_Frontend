import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import api from '../api/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ALERT_CONDITIONS = [
  { label: '🌧️ Rain', value: 'rain' },
  { label: '❄️ Snow', value: 'snow' },
  { label: '⛈️ Thunderstorm', value: 'thunderstorm' },
  { label: '🌡️ Temp above 30°C', value: 'temp_above_30' },
  { label: '🥶 Temp below 0°C', value: 'temp_below_0' },
];

export default function AlertsScreen() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCities();
    }, [])
  );

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(status === 'granted');
    if (status === 'granted') {
      const token = await Notifications.getExpoPushTokenAsync();
      // Save push token to backend
      try {
        await api.put('/auth/push-token', { pushToken: token.data });
      } catch (_) {}
    }
  };

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cities');
      setCities(res.data);
    } catch (_) {
      Alert.alert('Error', 'Could not load cities');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (city, enabled) => {
    try {
      await api.put(`/cities/${city._id}/alert`, {
        alertEnabled: enabled,
        alertCondition: city.alertCondition,
      });
      setCities((prev) =>
        prev.map((c) => (c._id === city._id ? { ...c, alertEnabled: enabled } : c))
      );
      if (enabled) {
        await sendTestNotification(city.cityName);
      }
    } catch (_) {
      Alert.alert('Error', 'Could not update alert');
    }
  };

  const setCondition = async (city, condition) => {
    try {
      await api.put(`/cities/${city._id}/alert`, {
        alertEnabled: city.alertEnabled,
        alertCondition: condition,
      });
      setCities((prev) =>
        prev.map((c) => (c._id === city._id ? { ...c, alertCondition: condition } : c))
      );
    } catch (_) {
      Alert.alert('Error', 'Could not update condition');
    }
  };

  const sendTestNotification = async (cityName) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Alert Enabled',
        body: `You'll be notified about weather changes in ${cityName}`,
      },
      trigger: { seconds: 1 },
    });
  };

  const renderCity = ({ item }) => (
    <View style={styles.cityCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cityName} numberOfLines={1}>
          {item.cityName.charAt(0).toUpperCase() + item.cityName.slice(1)}
          {item.country ? `, ${item.country}` : ''}
        </Text>
        <Switch
          value={item.alertEnabled}
          onValueChange={(val) => toggleAlert(item, val)}
          trackColor={{ false: '#1e1e3f', true: '#00d4ff' }}
          thumbColor={item.alertEnabled ? '#fff' : '#555577'}
        />
      </View>

      {item.alertEnabled && (
        <View style={styles.conditionsContainer}>
          <Text style={styles.conditionLabel}>Alert when:</Text>
          <View style={styles.conditionBtns}>
            {ALERT_CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond.value}
                style={[
                  styles.conditionBtn,
                  item.alertCondition === cond.value && styles.conditionBtnActive,
                ]}
                onPress={() => setCondition(item, cond.value)}
              >
                <Text
                  style={[
                    styles.conditionBtnText,
                    item.alertCondition === cond.value && styles.conditionBtnTextActive,
                  ]}
                >
                  {cond.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather Alerts</Text>

      {!permissionGranted && (
        <TouchableOpacity style={styles.permissionBanner} onPress={requestNotificationPermission}>
          <Text style={styles.permissionText}>
            🔔 Tap here to enable push notifications
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.subtitle}>
        Toggle alerts for your saved cities. You'll get a notification when the weather condition is met.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#00d4ff" style={{ marginTop: 40 }} />
      ) : cities.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔕</Text>
          <Text style={styles.emptyText}>
            No saved cities yet.{'\n'}Add cities in Favourites first.
          </Text>
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
  title: { fontSize: 26, color: '#fff', fontWeight: 'bold', paddingTop: 60, paddingBottom: 12 },
  subtitle: { color: '#555577', fontSize: 13, marginBottom: 20, lineHeight: 18 },
  permissionBanner: {
    backgroundColor: '#1a2a1a', borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a4a2a',
  },
  permissionText: { color: '#4caf50', textAlign: 'center', fontSize: 14 },
  cityCard: {
    backgroundColor: '#1a1a35', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#1e1e3f',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cityName: { color: '#fff', fontSize: 17, fontWeight: '600', flex: 1, textTransform: 'capitalize' },
  conditionsContainer: { marginTop: 14 },
  conditionLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
  conditionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionBtn: {
    backgroundColor: '#0f0f23', borderRadius: 20, paddingVertical: 8,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#1e1e3f',
  },
  conditionBtnActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  conditionBtnText: { color: '#888', fontSize: 13 },
  conditionBtnTextActive: { color: '#0f0f23', fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#555577', fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
