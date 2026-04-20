import * as SQLite from 'expo-sqlite';

let db;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('weatherapp.db');
  }
  return db;
};

// Create tables on first launch
export const initDB = async () => {
  const db = await getDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recent_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_name TEXT NOT NULL,
      country TEXT,
      searched_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_weather (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_name TEXT NOT NULL UNIQUE,
      weather_data TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
  `);
};

// ─── Recent Searches ─────────────────────────────────────────────

export const addRecentSearch = async (cityName, country) => {
  const db = await getDB();
  await db.runAsync(`DELETE FROM recent_searches WHERE city_name = ?;`, [cityName]);
  await db.runAsync(
    `INSERT INTO recent_searches (city_name, country, searched_at) VALUES (?, ?, ?);`,
    [cityName, country || '', new Date().toISOString()]
  );
};

export const getRecentSearches = async () => {
  const db = await getDB();
  return await db.getAllAsync(`SELECT * FROM recent_searches ORDER BY searched_at DESC LIMIT 10;`);
};

export const clearRecentSearches = async () => {
  const db = await getDB();
  await db.runAsync(`DELETE FROM recent_searches;`);
};

// ─── Cached Weather ──────────────────────────────────────────────

export const cacheWeatherData = async (cityName, weatherData) => {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_weather (city_name, weather_data, cached_at) VALUES (?, ?, ?);`,
    [cityName.toLowerCase(), JSON.stringify(weatherData), new Date().toISOString()]
  );
};

export const getCachedWeather = async (cityName) => {
  const db = await getDB();
  const row = await db.getFirstAsync(
    `SELECT * FROM cached_weather WHERE city_name = ?;`,
    [cityName.toLowerCase()]
  );
  if (!row) return null;
  return { ...JSON.parse(row.weather_data), cached_at: row.cached_at };
};

// ─── User Preferences ────────────────────────────────────────────

export const setPreference = async (key, value) => {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?);`,
    [key, String(value)]
  );
};

export const getPreference = async (key) => {
  const db = await getDB();
  const row = await db.getFirstAsync(
    `SELECT value FROM user_preferences WHERE key = ?;`,
    [key]
  );
  return row ? row.value : null;
};