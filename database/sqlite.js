import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('weatherapp.db');

// Create tables on first launch
export const initDB = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // Store recent searches locally
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS recent_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_name TEXT NOT NULL,
          country TEXT,
          searched_at TEXT NOT NULL
        );`,
        [],
        () => {},
        (_, error) => {
          reject(error);
          return false;
        }
      );

      // Store cached weather data locally so app works offline
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS cached_weather (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_name TEXT NOT NULL UNIQUE,
          weather_data TEXT NOT NULL,
          cached_at TEXT NOT NULL
        );`,
        [],
        () => {},
        (_, error) => {
          reject(error);
          return false;
        }
      );

      // Store user preferences locally
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        );`,
        [],
        resolve,
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// ─── Recent Searches ──────────────────────────────────────────────────────────

export const addRecentSearch = (cityName, country) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // Remove duplicate if exists
      tx.executeSql(
        `DELETE FROM recent_searches WHERE city_name = ?;`,
        [cityName],
        () => {},
        (_, error) => { reject(error); return false; }
      );
      // Insert fresh
      tx.executeSql(
        `INSERT INTO recent_searches (city_name, country, searched_at) VALUES (?, ?, ?);`,
        [cityName, country || '', new Date().toISOString()],
        (_, result) => resolve(result),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

export const getRecentSearches = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM recent_searches ORDER BY searched_at DESC LIMIT 10;`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

export const clearRecentSearches = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `DELETE FROM recent_searches;`,
        [],
        (_, result) => resolve(result),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

// ─── Cached Weather ───────────────────────────────────────────────────────────

export const cacheWeatherData = (cityName, weatherData) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO cached_weather (city_name, weather_data, cached_at) VALUES (?, ?, ?);`,
        [cityName.toLowerCase(), JSON.stringify(weatherData), new Date().toISOString()],
        (_, result) => resolve(result),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

export const getCachedWeather = (cityName) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM cached_weather WHERE city_name = ?;`,
        [cityName.toLowerCase()],
        (_, { rows }) => {
          if (rows._array.length > 0) {
            const row = rows._array[0];
            resolve({
              ...JSON.parse(row.weather_data),
              cached_at: row.cached_at,
            });
          } else {
            resolve(null);
          }
        },
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

// ─── User Preferences ─────────────────────────────────────────────────────────

export const setPreference = (key, value) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?);`,
        [key, String(value)],
        (_, result) => resolve(result),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

export const getPreference = (key) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT value FROM user_preferences WHERE key = ?;`,
        [key],
        (_, { rows }) => {
          resolve(rows._array.length > 0 ? rows._array[0].value : null);
        },
        (_, error) => { reject(error); return false; }
      );
    });
  });
};
