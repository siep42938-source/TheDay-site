package com.launcher.auth;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import javax.imageio.ImageIO;

/**
 * TheDay Client — Авторизация через API сайта
 * Подключи этот файл к лаунчеру KrakenVisual
 *
 * Использование:
 *   String hwid = TheDayAuth.getHWID();
 *
 *   // Первый запуск — вход по email/паролю
 *   TheDayAuth.AuthResult result = TheDayAuth.login("email", "password", hwid);
 *   if (result.ok) {
 *       TheDayAuth.saveToken(result.token);
 *       System.out.println("UID: " + result.uid);
 *       System.out.println("Ник: " + result.username);
 *       BufferedImage avatar = TheDayAuth.downloadAvatar(result.token);
 *   } else {
 *       showError(result.error);
 *   }
 *
 *   // Повторный запуск — проверка сохранённого токена
 *   String saved = TheDayAuth.loadToken();
 *   if (saved != null) {
 *       TheDayAuth.AuthResult r = TheDayAuth.verify(saved, hwid);
 *       if (r.ok) { /* запускаем игру *\/ }
 *   }
 */
public class TheDayAuth {

    // ── Настройки ──────────────────────────────────────────
    // Продакшн сервер:
    private static final String SERVER = "https://the-day-site-ovk7.vercel.app/api";
    // Локальная разработка — раскомментируй:
    // private static final String SERVER = "http://localhost:3001/api";

    private static final String LAUNCHER_KEY = "launcher_theday_2026";
    private static final int TIMEOUT_SEC = 10;
    // ───────────────────────────────────────────────────────

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(TIMEOUT_SEC))
        .build();

    // ── Результат авторизации ──────────────────────────────
    public static class AuthResult {
        /** Успешно ли выполнен запрос */
        public boolean ok;
        /** JWT токен для последующих запросов */
        public String token;
        /** Текст ошибки (если ok=false) */
        public String error;
        /** Никнейм игрока */
        public String username;
        /** Роль: "Пользователь", "Модератор", "Администратор" и т.д. */
        public String role;
        /** Тип подписки: "7 дней", "30 дней", "90 дней", "Навсегда" */
        public String sub;
        /** Дата истечения подписки (ISO 8601) или null если Навсегда */
        public String subExpires;
        /** Уникальный ID пользователя на сайте (UID) */
        public String uid;
        /** HWID привязанный к аккаунту */
        public String hwid;
        /** Аватар в формате base64 data URL (может быть null) */
        public String avatarBase64;
    }

    // ── Вход (email + пароль + HWID) ──────────────────────
    /**
     * Авторизация по email и паролю.
     * HWID автоматически привязывается к аккаунту при первом входе.
     * При повторном входе HWID проверяется — если не совпадает, вернёт ошибку.
     */
    public static AuthResult login(String email, String password, String hwid) {
        String body = String.format(
            "{\"email\":\"%s\",\"password\":\"%s\",\"hwid\":\"%s\"}",
            escape(email), escape(password), escape(hwid)
        );
        return post("/launcher/login", body, null);
    }

    // ── Проверка сохранённого токена ───────────────────────
    /**
     * Проверяет сохранённый токен и HWID.
     * Используй при каждом запуске лаунчера вместо повторного ввода пароля.
     */
    public static AuthResult verify(String token, String hwid) {
        String body = String.format(
            "{\"token\":\"%s\",\"hwid\":\"%s\"}",
            escape(token), escape(hwid)
        );
        return post("/launcher/verify", body, null);
    }

    // ── Получить полный профиль с аватаром ─────────────────
    /**
     * Загружает полный профиль пользователя включая аватар (base64).
     * Вызывай после успешного login/verify чтобы получить аватар.
     */
    public static AuthResult getProfile(String token) {
        String body = String.format("{\"token\":\"%s\"}", escape(token));
        AuthResult result = post("/launcher/profile", body, null);
        if (result.ok && result.avatarBase64 != null) {
            // avatarBase64 уже заполнен из JSON
        }
        return result;
    }

    // ── Скачать аватар как BufferedImage ───────────────────
    /**
     * Возвращает аватар пользователя как BufferedImage для отображения в UI.
     * Поддерживает форматы: PNG, JPEG, GIF, WebP (через base64 data URL).
     * Возвращает null если аватар не установлен или произошла ошибка.
     *
     * Пример использования:
     *   BufferedImage avatar = TheDayAuth.downloadAvatar(token);
     *   if (avatar != null) {
     *       ImageIcon icon = new ImageIcon(avatar.getScaledInstance(64, 64, Image.SCALE_SMOOTH));
     *       avatarLabel.setIcon(icon);
     *   }
     */
    public static BufferedImage downloadAvatar(String token) {
        AuthResult profile = getProfile(token);
        if (!profile.ok || profile.avatarBase64 == null || profile.avatarBase64.isEmpty()) {
            return null;
        }
        try {
            // Формат: "data:image/png;base64,<данные>"
            String b64 = profile.avatarBase64;
            int comma = b64.indexOf(',');
            if (comma != -1) b64 = b64.substring(comma + 1);
            byte[] bytes = Base64.getDecoder().decode(b64);
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            System.err.println("[TheDayAuth] Ошибка декодирования аватара: " + e.getMessage());
            return null;
        }
    }

    // ── Получить HWID компьютера ───────────────────────────
    /**
     * Возвращает уникальный идентификатор компьютера.
     * Windows: использует UUID из WMI (wmic csproduct get UUID).
     * Fallback: имя компьютера + имя пользователя.
     */
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
            } else if (os.contains("mac")) {
                Process p = Runtime.getRuntime().exec(
                    new String[]{"system_profiler", "SPHardwareDataType"}
                );
                String out = new String(p.getInputStream().readAllBytes());
                for (String line : out.split("\\n")) {
                    if (line.contains("Hardware UUID") || line.contains("Serial Number")) {
                        String[] parts = line.split(":");
                        if (parts.length > 1) return "MAC-" + parts[1].trim().replaceAll("[^A-Za-z0-9-]", "");
                    }
                }
            } else {
                // Linux: читаем machine-id
                java.nio.file.Path machineId = java.nio.file.Paths.get("/etc/machine-id");
                if (java.nio.file.Files.exists(machineId)) {
                    return "LNX-" + java.nio.file.Files.readString(machineId).trim();
                }
            }
        } catch (Exception ignored) {}
        // Fallback — имя компьютера + имя пользователя
        String host = System.getenv("COMPUTERNAME");
        if (host == null) host = System.getenv("HOSTNAME");
        if (host == null) host = "UNKNOWN";
        return "PC-" + host + "-" + System.getProperty("user.name");
    }

    // ── Сохранить токен ────────────────────────────────────
    /** Сохраняет JWT токен в ~/.theday/session.dat */
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
    /** Загружает сохранённый JWT токен из ~/.theday/session.dat */
    public static String loadToken() {
        // Сначала проверяем токен переданный лаунчером через JVM свойство
        String launcherToken = System.getProperty("theday.token");
        if (launcherToken != null && !launcherToken.isEmpty()) {
            return launcherToken;
        }
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
    /** Удаляет сохранённый токен — выход из аккаунта */
    public static void clearToken() {
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(
                System.getProperty("user.home"), ".theday", "session.dat"
            ));
        } catch (Exception ignored) {}
    }

    // ── Внутренний POST запрос ─────────────────────────────
    private static AuthResult post(String path, String body, String bearerToken) {
        AuthResult result = new AuthResult();
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(SERVER + path))
                .header("Content-Type", "application/json")
                .header("x-launcher-secret", LAUNCHER_KEY)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(TIMEOUT_SEC));

            if (bearerToken != null) {
                builder.header("Authorization", "Bearer " + bearerToken);
            }

            HttpResponse<String> response = HTTP.send(
                builder.build(), HttpResponse.BodyHandlers.ofString()
            );

            String json = response.body();
            result.ok = json.contains("\"ok\":true");

            if (result.ok) {
                // Данные из /launcher/login и /launcher/verify
                result.token      = extractJson(json, "token");
                result.username   = extractJson(json, "username");
                result.role       = extractJson(json, "role");
                result.sub        = extractJson(json, "sub");
                result.subExpires = extractJson(json, "subExpires");
                result.hwid       = extractJson(json, "hwid");

                // UID — уникальный ID пользователя на сайте
                result.uid = extractJson(json, "id");

                // Аватар (base64 data URL) — приходит из /launcher/profile
                result.avatarBase64 = extractJsonLong(json, "avatar");
            } else {
                result.error = extractJson(json, "error");
                if (result.error == null || result.error.isEmpty()) {
                    result.error = "Ошибка сервера (код " + response.statusCode() + ")";
                }
            }
        } catch (java.net.ConnectException e) {
            result.ok = false;
            result.error = "Сервер недоступен. Проверьте интернет-соединение.";
        } catch (java.net.http.HttpTimeoutException e) {
            result.ok = false;
            result.error = "Превышено время ожидания. Попробуйте позже.";
        } catch (Exception e) {
            result.ok = false;
            result.error = "Ошибка: " + e.getMessage();
        }
        return result;
    }

    // ── JSON парсеры (без зависимостей) ───────────────────

    /** Извлекает короткое строковое значение из JSON */
    private static String extractJson(String json, String key) {
        // Ищем внутри вложенного объекта "user":{...} если есть
        String userBlock = extractBlock(json, "user");
        String val = extractJsonStr(userBlock != null ? userBlock : json, key);
        if (val == null) val = extractJsonStr(json, key);
        return val;
    }

    private static String extractJsonStr(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        // Ищем конец строки с учётом экранирования
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '\\' && i + 1 < json.length()) {
                char next = json.charAt(i + 1);
                if (next == '"') { sb.append('"'); i++; continue; }
                if (next == '\\') { sb.append('\\'); i++; continue; }
                if (next == 'n') { sb.append('\n'); i++; continue; }
            }
            if (c == '"') break;
            sb.append(c);
        }
        return sb.toString();
    }

    /**
     * Извлекает длинное значение (например base64 аватар).
     * Аватар может быть очень длинным — используем отдельный метод.
     */
    private static String extractJsonLong(String json, String key) {
        // Аватар может быть в "user":{"avatar":"..."} или напрямую
        String userBlock = extractBlock(json, "user");
        String val = extractJsonStr(userBlock != null ? userBlock : json, key);
        if (val == null) val = extractJsonStr(json, key);
        return val;
    }

    /** Извлекает содержимое JSON объекта по ключу: "key":{...} */
    private static String extractBlock(String json, String key) {
        String search = "\"" + key + "\":{";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length() - 1; // позиция '{'
        int depth = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') { depth--; if (depth == 0) { sb.append(c); break; } }
            sb.append(c);
        }
        return sb.toString();
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
