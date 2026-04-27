package com.launcher.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * TheDay Client — Авторизация через API сайта
 * Подключи этот файл к лаунчеру KrakenVisual
 *
 * Использование:
 *   TheDayAuth.AuthResult result = TheDayAuth.login("email", "password", hwid);
 *   if (result.ok) { String token = result.token; }
 *   else { showError(result.error); }
 */
public class TheDayAuth {

    // ── Настройки ──────────────────────────────────────────
    // Если сервер запущен локально:
    private static final String SERVER = "http://localhost:3001/api";
    // Если сайт на хостинге — замени на свой домен:
    // private static final String SERVER = "https://thedayclient.su/api";

    private static final String LAUNCHER_KEY = "launcher_theday_2026";
    private static final int TIMEOUT_SEC = 10;
    // ───────────────────────────────────────────────────────

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(TIMEOUT_SEC))
        .build();

    // ── Результат авторизации ──────────────────────────────
    public static class AuthResult {
        public boolean ok;
        public String token;
        public String error;
        public String username;
        public String role;
        public String sub;
        public String subExpires;
        public String userId;
    }

    // ── Вход (email + пароль + HWID) ──────────────────────
    public static AuthResult login(String email, String password, String hwid) {
        String body = String.format(
            "{\"email\":\"%s\",\"password\":\"%s\",\"hwid\":\"%s\"}",
            escape(email), escape(password), escape(hwid)
        );
        return post("/launcher/login", body);
    }

    // ── Проверка сохранённого токена ───────────────────────
    public static AuthResult verify(String token, String hwid) {
        String body = String.format(
            "{\"token\":\"%s\",\"hwid\":\"%s\"}",
            escape(token), escape(hwid)
        );
        return post("/launcher/verify", body);
    }

    // ── Получить HWID компьютера ───────────────────────────
    public static String getHWID() {
        try {
            String os = System.getProperty("os.name", "").toLowerCase();
            if (os.contains("win")) {
                Process p = Runtime.getRuntime().exec(
                    new String[]{"wmic", "csproduct", "get", "UUID"}
                );
                String out = new String(p.getInputStream().readAllBytes()).trim();
                String[] lines = out.split("\\r?\\n");
                for (String line : lines) {
                    line = line.trim();
                    if (!line.isEmpty() && !line.equalsIgnoreCase("UUID")) {
                        return "WIN-" + line.replaceAll("[^A-Za-z0-9-]", "");
                    }
                }
            }
        } catch (Exception ignored) {}
        // Fallback — имя компьютера + имя пользователя
        return "PC-" + System.getenv("COMPUTERNAME") + "-" + System.getProperty("user.name");
    }

    // ── Сохранить токен ────────────────────────────────────
    public static void saveToken(String token) {
        try {
            java.nio.file.Path dir = java.nio.file.Paths.get(
                System.getProperty("user.home"), ".theday"
            );
            java.nio.file.Files.createDirectories(dir);
            java.nio.file.Files.writeString(dir.resolve("session.dat"), token);
        } catch (Exception ignored) {}
    }

    // ── Загрузить сохранённый токен ────────────────────────
    public static String loadToken() {
        try {
            java.nio.file.Path file = java.nio.file.Paths.get(
                System.getProperty("user.home"), ".theday", "session.dat"
            );
            if (java.nio.file.Files.exists(file)) {
                return java.nio.file.Files.readString(file).trim();
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ── Удалить токен (выход) ──────────────────────────────
    public static void clearToken() {
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(
                System.getProperty("user.home"), ".theday", "session.dat"
            ));
        } catch (Exception ignored) {}
    }

    // ── Внутренний POST запрос ─────────────────────────────
    private static AuthResult post(String path, String body) {
        AuthResult result = new AuthResult();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(SERVER + path))
                .header("Content-Type", "application/json")
                .header("x-launcher-secret", LAUNCHER_KEY)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(TIMEOUT_SEC))
                .build();

            HttpResponse<String> response = HTTP.send(
                request, HttpResponse.BodyHandlers.ofString()
            );

            String json = response.body();
            result.ok = json.contains("\"ok\":true");

            if (result.ok) {
                result.token      = extractJson(json, "token");
                result.username   = extractJson(json, "username");
                result.role       = extractJson(json, "role");
                result.sub        = extractJson(json, "sub");
                result.subExpires = extractJson(json, "subExpires");
                result.userId     = extractJson(json, "id");
            } else {
                result.error = extractJson(json, "error");
                if (result.error == null || result.error.isEmpty()) {
                    result.error = "Ошибка сервера (код " + response.statusCode() + ")";
                }
            }
        } catch (java.net.ConnectException e) {
            result.ok = false;
            result.error = "Сервер недоступен. Проверьте интернет-соединение.";
        } catch (Exception e) {
            result.ok = false;
            result.error = "Ошибка: " + e.getMessage();
        }
        return result;
    }

    // Простой парсер JSON строк (без зависимостей)
    private static String extractJson(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = json.indexOf("\"", start);
        if (end == -1) return null;
        return json.substring(start, end);
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
