package com.launcher.auth;

import java.awt.Image;
import java.awt.image.BufferedImage;
import javax.swing.ImageIcon;
import javax.swing.JLabel;

/**
 * Пример интеграции TheDayAuth в Fabric мод / лаунчер.
 *
 * Скопируй нужные части в свой код.
 * TheDayAuth.java не требует никаких зависимостей — только JDK 11+.
 */
public class TheDayAuthExample {

    // Хранит данные текущей сессии
    private static TheDayAuth.AuthResult currentSession = null;

    /**
     * Вызывай при запуске лаунчера.
     * Сначала пробует восстановить сессию по сохранённому токену,
     * если не получилось — показывает форму входа.
     *
     * @return true если авторизован, false если нужен вход
     */
    public static boolean initAuth() {
        String hwid = TheDayAuth.getHWID();
        System.out.println("[TheDay] HWID: " + hwid);

        // Пробуем восстановить сохранённую сессию
        String savedToken = TheDayAuth.loadToken();
        if (savedToken != null) {
            System.out.println("[TheDay] Проверяем сохранённый токен...");
            TheDayAuth.AuthResult result = TheDayAuth.verify(savedToken, hwid);
            if (result.ok) {
                currentSession = result;
                currentSession.token = savedToken; // verify не возвращает новый токен
                System.out.println("[TheDay] Сессия восстановлена: " + result.username + " (UID: " + result.uid + ")");
                return true;
            } else {
                System.out.println("[TheDay] Токен устарел: " + result.error);
                TheDayAuth.clearToken();
            }
        }

        // Нет сохранённой сессии — нужен вход
        return false;
    }

    /**
     * Вход по email и паролю.
     * Вызывай из формы авторизации лаунчера.
     *
     * @param email    Email пользователя
     * @param password Пароль
     * @return AuthResult с данными или ошибкой
     */
    public static TheDayAuth.AuthResult doLogin(String email, String password) {
        String hwid = TheDayAuth.getHWID();
        TheDayAuth.AuthResult result = TheDayAuth.login(email, password, hwid);

        if (result.ok) {
            // Сохраняем токен для следующего запуска
            TheDayAuth.saveToken(result.token);
            currentSession = result;

            System.out.println("[TheDay] Вход выполнен!");
            System.out.println("  Ник:       " + result.username);
            System.out.println("  UID:       " + result.uid);
            System.out.println("  Роль:      " + result.role);
            System.out.println("  Подписка:  " + result.sub);
            System.out.println("  До:        " + (result.subExpires != null ? result.subExpires : "Навсегда"));
            System.out.println("  HWID:      " + result.hwid);
        }

        return result;
    }

    /**
     * Получить аватар пользователя для отображения в UI.
     * Возвращает масштабированный ImageIcon или null.
     *
     * @param size Размер аватара в пикселях (например 64)
     * @return ImageIcon или null если аватар не установлен
     */
    public static ImageIcon getAvatarIcon(int size) {
        if (currentSession == null || currentSession.token == null) return null;

        BufferedImage avatar = TheDayAuth.downloadAvatar(currentSession.token);
        if (avatar == null) return null;

        Image scaled = avatar.getScaledInstance(size, size, Image.SCALE_SMOOTH);
        return new ImageIcon(scaled);
    }

    /**
     * Пример: установить аватар на JLabel.
     *
     * JLabel avatarLabel = new JLabel();
     * TheDayAuthExample.applyAvatarToLabel(avatarLabel, 64);
     */
    public static void applyAvatarToLabel(JLabel label, int size) {
        ImageIcon icon = getAvatarIcon(size);
        if (icon != null) {
            label.setIcon(icon);
            label.setText(""); // убираем текст если был
        }
    }

    /** Текущий UID пользователя или null */
    public static String getCurrentUID() {
        return currentSession != null ? currentSession.uid : null;
    }

    /** Текущий никнейм или null */
    public static String getCurrentUsername() {
        return currentSession != null ? currentSession.username : null;
    }

    /** Текущая роль или null */
    public static String getCurrentRole() {
        return currentSession != null ? currentSession.role : null;
    }

    /** Есть ли активная подписка */
    public static boolean hasActiveSub() {
        if (currentSession == null || currentSession.sub == null) return false;
        if ("Навсегда".equals(currentSession.sub)) return true;
        if (currentSession.subExpires == null) return false;
        try {
            java.time.Instant expires = java.time.Instant.parse(currentSession.subExpires);
            return expires.isAfter(java.time.Instant.now());
        } catch (Exception e) {
            return false;
        }
    }

    /** Выход из аккаунта */
    public static void logout() {
        TheDayAuth.clearToken();
        currentSession = null;
        System.out.println("[TheDay] Выход выполнен.");
    }

    // ── Пример использования в main ───────────────────────
    public static void main(String[] args) {
        // 1. При запуске — пробуем восстановить сессию
        boolean restored = initAuth();

        if (!restored) {
            // 2. Нет сессии — показываем форму входа
            // В реальном коде здесь будет твой GUI
            TheDayAuth.AuthResult result = doLogin("test@example.com", "password123");

            if (!result.ok) {
                System.err.println("Ошибка входа: " + result.error);
                System.exit(1);
            }
        }

        // 3. Проверяем подписку
        if (!hasActiveSub()) {
            System.err.println("Нет активной подписки!");
            System.exit(1);
        }

        // 4. Всё ок — запускаем игру
        System.out.println("Запуск игры для: " + getCurrentUsername() + " (UID: " + getCurrentUID() + ")");

        // 5. Аватар — в Swing UI:
        // JLabel avatarLabel = new JLabel();
        // applyAvatarToLabel(avatarLabel, 64);
        // panel.add(avatarLabel);
    }
}
