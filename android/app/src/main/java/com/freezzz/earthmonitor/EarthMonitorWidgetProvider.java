package com.freezzz.earthmonitor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class EarthMonitorWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_REFRESH = "com.freezzz.earthmonitor.WIDGET_REFRESH";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id, null);
        fetchAndRender(context);
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName component = new ComponentName(context, EarthMonitorWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(component);
            for (int id : ids) render(context, manager, id, "REFRESHING PUBLIC DATA…");
            fetchAndRender(context);
        }
    }

    private static void render(Context context, AppWidgetManager manager, int id, String status) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_earth_monitor);
        String utc = new SimpleDateFormat("HH:mm 'UTC'", Locale.US) {{ setTimeZone(TimeZone.getTimeZone("UTC")); }}.format(new Date());
        views.setTextViewText(R.id.widget_utc, utc);
        if (status != null) views.setTextViewText(R.id.widget_updated, status);
        Intent refresh = new Intent(context, EarthMonitorWidgetProvider.class).setAction(ACTION_REFRESH);
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, 2001, refresh, flags()));
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_open, PendingIntent.getActivity(context, 2002, open, flags()));
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 2003, open, flags()));
        manager.updateAppWidget(id, views);
    }

    private static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
    }

    private static void fetchAndRender(Context context) {
        EXECUTOR.execute(() -> {
            String alt = "ALTITUDE -- KM", coords = "LAT -- / LON --", temp = "--.- °C", wind = "WIND -- KM/H", kp = "Kp INDEX --", quakes = "QUAKES M2.5+ --";
            try {
                JSONObject iss = getJson("https://api.wheretheiss.at/v1/satellites/25544");
                alt = "ALTITUDE " + Math.round(iss.optDouble("altitude", Double.NaN)) + " KM";
                coords = String.format(Locale.US, "LAT %.2f / LON %.2f", iss.optDouble("latitude", Double.NaN), iss.optDouble("longitude", Double.NaN));
            } catch (Exception ignored) { }
            try {
                JSONObject weather = getJson("https://api.open-meteo.com/v1/forecast?latitude=48.8922&longitude=8.6946&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh&timezone=UTC");
                JSONObject current = weather.optJSONObject("current");
                if (current != null) {
                    temp = String.format(Locale.US, "%.1f °C", current.optDouble("temperature_2m", Double.NaN));
                    wind = String.format(Locale.US, "WIND %.0f KM/H", current.optDouble("wind_speed_10m", Double.NaN));
                }
            } catch (Exception ignored) { }
            try {
                JSONArray rows = getJsonArray("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
                if (rows.length() > 1) {
                    JSONArray latest = rows.getJSONArray(rows.length() - 1);
                    kp = "Kp INDEX " + latest.optString(1, "--");
                }
            } catch (Exception ignored) { }
            try {
                JSONObject quakesJson = getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
                JSONArray features = quakesJson.optJSONArray("features");
                quakes = "QUAKES M2.5+ " + (features == null ? "--" : features.length());
            } catch (Exception ignored) { }
            String finalAlt = alt, finalCoords = coords, finalTemp = temp, finalWind = wind, finalKp = kp, finalQuakes = quakes;
            String updated = "PUBLIC FEEDS · " + new SimpleDateFormat("HH:mm 'UTC'", Locale.US) {{ setTimeZone(TimeZone.getTimeZone("UTC")); }}.format(new Date());
            Context app = context.getApplicationContext();
            AppWidgetManager manager = AppWidgetManager.getInstance(app);
            int[] ids = manager.getAppWidgetIds(new ComponentName(app, EarthMonitorWidgetProvider.class));
            for (int id : ids) {
                RemoteViews views = new RemoteViews(app.getPackageName(), R.layout.widget_earth_monitor);
                views.setTextViewText(R.id.widget_utc, updated.substring("PUBLIC FEEDS · ".length()));
                views.setTextViewText(R.id.widget_iss_alt, finalAlt);
                views.setTextViewText(R.id.widget_iss_coords, finalCoords);
                views.setTextViewText(R.id.widget_weather_temp, finalTemp);
                views.setTextViewText(R.id.widget_weather_wind, finalWind);
                views.setTextViewText(R.id.widget_kp, finalKp);
                views.setTextViewText(R.id.widget_quakes, finalQuakes);
                views.setTextViewText(R.id.widget_updated, updated);
                Intent refresh = new Intent(app, EarthMonitorWidgetProvider.class).setAction(ACTION_REFRESH);
                views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(app, 2001, refresh, flags()));
                Intent open = new Intent(app, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                views.setOnClickPendingIntent(R.id.widget_open, PendingIntent.getActivity(app, 2002, open, flags()));
                views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(app, 2003, open, flags()));
                manager.updateAppWidget(id, views);
            }
        });
    }

    private static JSONObject getJson(String url) throws Exception {
        Object value = requestJson(url);
        if (!(value instanceof JSONObject)) throw new IllegalStateException("Expected JSON object");
        return (JSONObject) value;
    }

    private static JSONArray getJsonArray(String url) throws Exception {
        Object value = requestJson(url);
        if (!(value instanceof JSONArray)) throw new IllegalStateException("Expected JSON array");
        return (JSONArray) value;
    }

    private static Object requestJson(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(7000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "EarthMonitor-Android-Widget/1.0");
        try (InputStream stream = connection.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            String json = body.toString().trim();
            return json.startsWith("[") ? new JSONArray(json) : new JSONObject(json);
        } finally {
            connection.disconnect();
        }
    }
}