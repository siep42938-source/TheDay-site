import javax.swing.*;
import javax.swing.Timer;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.awt.image.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.Base64;
import javax.imageio.ImageIO;
import javax.swing.text.JTextComponent;
// ── GlassField ──────────────────────────────────────────────────────────────
// Стеклянное поле ввода в стиле сайта TheDay
class GlassField extends JPanel {
    private final JTextField  tf;
    private final JPasswordField pf;
    private final boolean isPw;
    private boolean focused = false;
    private float   focusAnim = 0f;
    private final Timer animTimer;

    GlassField(String placeholder, boolean password) {
        setLayout(null); setOpaque(false); isPw = password;
        animTimer = new Timer(16, e -> {
            float target = focused ? 1f : 0f;
            focusAnim += (target - focusAnim) * 0.15f;
            repaint();
        });
        animTimer.start();

        if (password) {
            pf = new JPasswordField();
            tf = null;
            pf.setBounds(16, 13, 290, 22);
            styleField(pf);
            add(pf);
            // Иконка глаза (SVG-like через текст)
            JLabel eye = new JLabel("◉");
            eye.setForeground(TheDayLauncher.GREY);
            eye.setFont(new Font("Segoe UI", Font.PLAIN, 14));
            eye.setBounds(320, 13, 24, 22);
            eye.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            boolean[] show = {false};
            eye.addMouseListener(new MouseAdapter() {
                public void mouseClicked(MouseEvent e) {
                    show[0] = !show[0];
                    pf.setEchoChar(show[0] ? (char) 0 : '●');
                    eye.setForeground(show[0] ? TheDayLauncher.ACCENT3 : TheDayLauncher.GREY);
                }
                public void mouseEntered(MouseEvent e) { eye.setForeground(TheDayLauncher.ACCENT3); }
                public void mouseExited(MouseEvent e)  { eye.setForeground(show[0] ? TheDayLauncher.ACCENT3 : TheDayLauncher.GREY); }
            });
            add(eye);
            pf.setEchoChar('●');
            pf.addFocusListener(new FocusAdapter() {
                public void focusGained(FocusEvent e) { focused = true; }
                public void focusLost(FocusEvent e)   { focused = false; }
            });
        } else {
            tf = new JTextField();
            pf = null;
            tf.setBounds(16, 13, 330, 22);
            styleField(tf);
            tf.setText(placeholder);
            tf.setForeground(TheDayLauncher.GREY);
            tf.addFocusListener(new FocusAdapter() {
                public void focusGained(FocusEvent e) {
                    focused = true;
                    if (tf.getText().equals(placeholder)) { tf.setText(""); tf.setForeground(TheDayLauncher.WHITE); }
                }
                public void focusLost(FocusEvent e) {
                    focused = false;
                    if (tf.getText().isEmpty()) { tf.setText(placeholder); tf.setForeground(TheDayLauncher.GREY); }
                }
            });
            add(tf);
        }
    }

    private void styleField(JTextComponent c) {
        c.setBackground(new Color(0, 0, 0, 0));
        c.setForeground(TheDayLauncher.WHITE);
        c.setCaretColor(TheDayLauncher.ACCENT3);
        c.setBorder(null);
        c.setOpaque(false);
        c.setFont(new Font("Segoe UI", Font.PLAIN, 13));
    }

    String val() {
        if (isPw) return new String(pf.getPassword());
        String t = tf.getText();
        if (t.equals("Email или логин") || t.equals("Пароль")) return "";
        return t;
    }

    void addAL(java.awt.event.ActionListener l) {
        if (isPw) pf.addActionListener(l); else tf.addActionListener(l);
    }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        int w = getWidth(), h = getHeight();
        // Фон поля
        g2.setColor(TheDayLauncher.FIELD_BG);
        g2.fillRoundRect(0, 0, w, h, 12, 12);
        // Граница — анимированная при фокусе
        int ba = (int)(60 + focusAnim * 160);
        int br = (int)(TheDayLauncher.BORDER.getRed()   + focusAnim * (TheDayLauncher.BORDER_FOCUS.getRed()   - TheDayLauncher.BORDER.getRed()));
        int bg = (int)(TheDayLauncher.BORDER.getGreen() + focusAnim * (TheDayLauncher.BORDER_FOCUS.getGreen() - TheDayLauncher.BORDER.getGreen()));
        int bb = (int)(TheDayLauncher.BORDER.getBlue()  + focusAnim * (TheDayLauncher.BORDER_FOCUS.getBlue()  - TheDayLauncher.BORDER.getBlue()));
        g2.setColor(new Color(Math.min(255,br), Math.min(255,bg), Math.min(255,bb), Math.min(255,ba)));
        g2.setStroke(new BasicStroke(1.2f));
        g2.drawRoundRect(0, 0, w - 1, h - 1, 12, 12);
        // Нижняя акцентная линия при фокусе
        if (focusAnim > 0.01f) {
            int lw = (int)(w * focusAnim * 0.7f);
            int lx = (w - lw) / 2;
            GradientPaint lp = new GradientPaint(lx, h-1, new Color(0,0,0,0),
                lx + lw/2, h-1, new Color(120,100,255,(int)(focusAnim*200)));
            g2.setPaint(lp);
            g2.setStroke(new BasicStroke(1.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g2.drawLine(lx, h-1, lx+lw/2, h-1);
            GradientPaint lp2 = new GradientPaint(lx+lw/2, h-1, new Color(120,100,255,(int)(focusAnim*200)),
                lx+lw, h-1, new Color(0,0,0,0));
            g2.setPaint(lp2);
            g2.drawLine(lx+lw/2, h-1, lx+lw, h-1);
        }
        super.paintComponent(g);
    }
}

// ── GlowBtn ──────────────────────────────────────────────────────────────────
// Кнопка с градиентом и glow-эффектом
class GlowBtn extends JButton {
    private float hoverAnim = 0f;
    private final Timer hoverTimer;

    GlowBtn(String text) {
        super(text);
        setOpaque(false); setContentAreaFilled(false); setBorderPainted(false);
        setForeground(TheDayLauncher.WHITE);
        setFont(new Font("Segoe UI", Font.BOLD, 14));
        setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        setFocusPainted(false);
        hoverTimer = new Timer(16, e -> repaint());
        hoverTimer.start();
        addMouseListener(new MouseAdapter() {
            public void mouseEntered(MouseEvent e) { hoverAnim = Math.min(1f, hoverAnim + 0.1f); }
            public void mouseExited(MouseEvent e)  { hoverAnim = Math.max(0f, hoverAnim - 0.1f); }
        });
    }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        int w = getWidth(), h = getHeight();
        if (!isEnabled()) {
            g2.setColor(new Color(50, 50, 70));
            g2.fillRoundRect(0, 0, w, h, 14, 14);
            super.paintComponent(g); return;
        }
        // Glow под кнопкой
        if (hoverAnim > 0.01f) {
            for (int i = 6; i > 0; i--) {
                int ga = (int)(hoverAnim * 18 * (7-i)/6f);
                g2.setColor(new Color(90, 80, 210, ga));
                g2.fillRoundRect(-i, -i+2, w+i*2, h+i*2, 18+i, 18+i);
            }
        }
        // Градиент кнопки
        Color c1 = new Color(
            (int)(TheDayLauncher.ACCENT.getRed()   + hoverAnim * 20),
            (int)(TheDayLauncher.ACCENT.getGreen() + hoverAnim * 10),
            (int)(TheDayLauncher.ACCENT.getBlue()  + hoverAnim * 30));
        Color c2 = new Color(
            (int)(TheDayLauncher.ACCENT2.getRed()   + hoverAnim * 20),
            (int)(TheDayLauncher.ACCENT2.getGreen() + hoverAnim * 10),
            (int)(TheDayLauncher.ACCENT2.getBlue()  + hoverAnim * 20));
        g2.setPaint(new GradientPaint(0, 0, c1, w, 0, c2));
        g2.fillRoundRect(0, 0, w, h, 14, 14);
        // Верхний блик
        g2.setPaint(new GradientPaint(0, 0, new Color(255,255,255,30), 0, h/2, new Color(255,255,255,0)));
        g2.fillRoundRect(0, 0, w, h/2, 14, 14);
        super.paintComponent(g);
    }
}

// ── SpinnerPanel ─────────────────────────────────────────────────────────────
// Панель загрузки со спиннером и текстом
class SpinnerPanel extends JPanel {
    private float angle = 0f;
    private float dotAnim = 0f;
    private final String msg;
    private final Timer timer;

    SpinnerPanel(String message) {
        msg = message;
        setOpaque(false);
        timer = new Timer(16, e -> {
            angle = (angle + 4f) % 360f;
            dotAnim += 0.05f;
            repaint();
        });
        timer.start();
    }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        int cx = getWidth() / 2, cy = getHeight() / 2 - 10;
        int r = 18;
        // Трек спиннера
        g2.setStroke(new BasicStroke(2.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g2.setColor(new Color(55, 55, 90, 80));
        g2.drawOval(cx - r, cy - r, r * 2, r * 2);
        // Дуга спиннера с градиентом
        g2.setColor(TheDayLauncher.ACCENT2);
        g2.drawArc(cx - r, cy - r, r * 2, r * 2, (int) angle, 100);
        g2.setColor(TheDayLauncher.ACCENT3);
        g2.drawArc(cx - r, cy - r, r * 2, r * 2, (int) angle + 100, 60);
        // Текст с анимированными точками
        int dots = (int)(dotAnim % 4);
        String txt = msg + ".".repeat(dots);
        g2.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        g2.setColor(TheDayLauncher.GREY);
        FontMetrics fm = g2.getFontMetrics();
        g2.drawString(txt, cx - fm.stringWidth(txt) / 2, cy + r + 22);
    }
}

// ── LogoLabel ─────────────────────────────────────────────────────────────────
// Звезда-логотип TheDay (как на сайте — SVG-стиль через Java2D)
class LogoLabel extends JPanel {
    private float glowAnim = 0f;
    private float glowDir  = 1f;
    private final Timer timer;

    LogoLabel() {
        setOpaque(false);
        timer = new Timer(30, e -> {
            glowAnim += glowDir * 0.03f;
            if (glowAnim >= 1f) { glowAnim = 1f; glowDir = -1f; }
            if (glowAnim <= 0f) { glowAnim = 0f; glowDir =  1f; }
            repaint();
        });
        timer.start();
    }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        int cx = getWidth() / 2, cy = getHeight() / 2;
        int r = Math.min(cx, cy) - 2;
        // Glow
        int ga = (int)(40 + glowAnim * 60);
        for (int i = 4; i > 0; i--) {
            g2.setColor(new Color(135, 206, 235, ga / i));
            g2.fillOval(cx - r - i*2, cy - r - i*2, (r+i*2)*2, (r+i*2)*2);
        }
        // Звезда (9 точек — как на сайте)
        int pts = 9;
        double[] xs = new double[pts * 2], ys = new double[pts * 2];
        for (int i = 0; i < pts * 2; i++) {
            double ang = Math.PI * i / pts - Math.PI / 2;
            double rad = (i % 2 == 0) ? r : r * 0.45;
            xs[i] = cx + rad * Math.cos(ang);
            ys[i] = cy + rad * Math.sin(ang);
        }
        int[] px = new int[pts * 2], py = new int[pts * 2];
        for (int i = 0; i < pts * 2; i++) { px[i] = (int) xs[i]; py[i] = (int) ys[i]; }
        // Заливка звезды
        GradientPaint gp = new GradientPaint(cx - r, cy - r, new Color(135, 206, 235, 220),
            cx + r, cy + r, new Color(90, 80, 210, 180));
        g2.setPaint(gp);
        g2.fillPolygon(px, py, pts * 2);
        // Контур
        g2.setColor(new Color(135, 206, 235, (int)(100 + glowAnim * 100)));
        g2.setStroke(new BasicStroke(0.8f));
        g2.drawPolygon(px, py, pts * 2);
    }
}

public class TheDayLauncher {
    static final String API    = "https://the-day-site-ovk7.vercel.app/api";
    static final String SECRET = "launcher_theday_2026";
    static final String CLIENT_JAR = "TheDay-Client-v1.2.jar";
    static final String CLIENT_URL = "https://github.com/siep42938-source/TheDay-site/releases/download/v1.2/TheDay-Client-v1.2.jar";
    static final String TOKEN_FILE = System.getProperty("user.home") + "/.theday/session.dat";

    static final Color BG        = new Color(8,8,14);
    static final Color BG2       = new Color(13,13,22);
    static final Color CARD_BG   = new Color(16,16,28,220);
    static final Color FIELD_BG  = new Color(22,22,38,200);
    static final Color BORDER    = new Color(55,55,90);
    static final Color BORDER_FOCUS = new Color(100,90,220,200);
    static final Color ACCENT    = new Color(90,80,210);
    static final Color ACCENT2   = new Color(120,100,255);
    static final Color ACCENT3   = new Color(150,130,255);
    static final Color WHITE     = new Color(255,255,255);
    static final Color GREY      = new Color(120,120,145);
    static final Color GREY2     = new Color(80,80,105);
    static final Color ORANGE    = new Color(255,165,60);
    static final Color ERR       = new Color(255,80,80);
    static final Color STAR_C    = new Color(135,206,235);

    // ── Звёзды ──────────────────────────────────────────────────────────────
    static final int   STAR_COUNT = 120;
    static float[]     starX, starY, starSize, starAlpha, starSpeed;
    static Random      rng = new Random();

    static void initStars(int w, int h) {
        starX     = new float[STAR_COUNT];
        starY     = new float[STAR_COUNT];
        starSize  = new float[STAR_COUNT];
        starAlpha = new float[STAR_COUNT];
        starSpeed = new float[STAR_COUNT];
        for (int i = 0; i < STAR_COUNT; i++) resetStar(i, w, h, true);
    }

    static void resetStar(int i, int w, int h, boolean randomY) {
        starX[i]     = rng.nextFloat() * w;
        starY[i]     = randomY ? rng.nextFloat() * h : -5f;
        starSize[i]  = 0.5f + rng.nextFloat() * 2.0f;
        starAlpha[i] = 0.2f + rng.nextFloat() * 0.8f;
        starSpeed[i] = 0.1f + rng.nextFloat() * 0.3f;
    }

    static void updateStars(int w, int h) {
        for (int i = 0; i < STAR_COUNT; i++) {
            starY[i] += starSpeed[i];
            starAlpha[i] += (float)(Math.sin(System.currentTimeMillis() / 1000.0 + i) * 0.01);
            starAlpha[i] = Math.max(0.1f, Math.min(1.0f, starAlpha[i]));
            if (starY[i] > h + 5) resetStar(i, w, h, false);
        }
    }

    static void drawStars(Graphics2D g2, int w, int h) {
        for (int i = 0; i < STAR_COUNT; i++) {
            int a = (int)(starAlpha[i] * 200);
            g2.setColor(new Color(STAR_C.getRed(), STAR_C.getGreen(), STAR_C.getBlue(), a));
            float s = starSize[i];
            g2.fill(new Ellipse2D.Float(starX[i] - s/2, starY[i] - s/2, s, s));
        }
    }

    // ── Анимация появления ───────────────────────────────────────────────────
    static float appearAnim = 0f;   // 0→1
    static long  animStart  = 0L;

    static String token="", username="", role="Пользователь", sub="", avatarB64=null;
    static JFrame frame;
    static String cachedHWID = null;

    public static void main(String[] a) {
        System.setProperty("awt.useSystemAAFontSettings","on");
        System.setProperty("swing.aatext","true");
        SwingUtilities.invokeLater(() -> {
            frame = new JFrame("TheDay Launcher");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setSize(480,600);
            frame.setLocationRelativeTo(null);
            frame.setResizable(false);
            frame.setUndecorated(true);
            frame.setBackground(BG);
            String saved = loadToken();
            if (saved != null) verifyAndShow(saved);
            else showLogin();
            frame.setVisible(true);
        });
    }

    static void verifyAndShow(String t) {
        showStatus("Проверка сессии...");
        new Thread(() -> {
            String hwid = getHWID();
            AuthResult r = apiPost("/launcher/verify",
                "{\"token\":\""+esc(t)+"\",\"hwid\":\""+esc(hwid)+"\"}");
            SwingUtilities.invokeLater(() -> {
                if (r.ok) { token=t; username=r.username; role=r.role; sub=r.sub;
                    loadAvatar(); showMain(); }
                else { deleteToken(); showLogin(); }
            });
        }).start();
    }

    static void showStatus(String msg) {
        JPanel p = base();
        // Спиннер по центру
        SpinnerPanel sp = new SpinnerPanel(msg);
        sp.setBounds(140, 260, 200, 80);
        p.add(sp);
        frame.setContentPane(p); frame.revalidate();
    }

    static void showLogin() {
        JPanel p = base();
        addX(p);

        int cw = 380, ch = 360;
        int cx = (480 - cw) / 2;   // = 50
        int cy = (600 - ch) / 2;   // = 120

        // Логотип-звезда
        LogoLabel logo = new LogoLabel();
        logo.setBounds(cx + cw/2 - 22, cy + 20, 44, 44);
        p.add(logo);

        // Заголовок
        lbl(p, "TheDay", 0, cy + 68, 480, 28,
            new Font("Segoe UI", Font.BOLD, 22), WHITE)
            .setHorizontalAlignment(SwingConstants.CENTER);

        lbl(p, "Войдите в аккаунт", 0, cy + 96, 480, 18,
            new Font("Segoe UI", Font.PLAIN, 12), GREY)
            .setHorizontalAlignment(SwingConstants.CENTER);

        // Иконка email перед полем
        int fx = cx + 24, fw = cw - 48;

        // Иконка пользователя (inline SVG-like label)
        JLabel iconUser = makeIcon("👤", 13);
        iconUser.setBounds(fx, cy + 132, 20, 46);
        p.add(iconUser);

        GlassField email = new GlassField("Email или логин", false);
        email.setBounds(fx + 22, cy + 132, fw - 22, 46); p.add(email);

        JLabel iconLock = makeIcon("🔒", 13);
        iconLock.setBounds(fx, cy + 188, 20, 46);
        p.add(iconLock);

        GlassField pass = new GlassField("Пароль", true);
        pass.setBounds(fx + 22, cy + 188, fw - 22, 46); p.add(pass);

        // Ошибка
        JLabel err = new JLabel("");
        err.setForeground(ERR);
        err.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        err.setHorizontalAlignment(SwingConstants.CENTER);
        err.setBounds(cx, cy + 244, cw, 16); p.add(err);

        // Кнопка
        GlowBtn btn = new GlowBtn("Войти");
        btn.setBounds(fx, cy + 266, fw, 46); p.add(btn);

        // Забыли пароль
        JLabel forgot = new JLabel("Забыли пароль?");
        forgot.setForeground(GREY2);
        forgot.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        forgot.setBounds(fx, cy + 322, fw, 16);
        forgot.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        forgot.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent e) { openBrowser("https://the-day-site.pages.dev/login.html"); }
            public void mouseEntered(MouseEvent e) { forgot.setForeground(ACCENT3); }
            public void mouseExited(MouseEvent e)  { forgot.setForeground(GREY2); }
        });
        p.add(forgot);

        ActionListener doLogin = e -> {
            String em = email.val(), pw = pass.val();
            if (em.isEmpty() || pw.isEmpty()) { err.setText("Заполните все поля"); return; }
            btn.setEnabled(false); btn.setText("Входим..."); err.setText("");
            new Thread(() -> {
                String hwid = getHWID();
                AuthResult r = apiPost("/launcher/login",
                    "{\"email\":\""+esc(em)+"\",\"password\":\""+esc(pw)+"\",\"hwid\":\""+esc(hwid)+"\"}");
                SwingUtilities.invokeLater(() -> {
                    btn.setEnabled(true); btn.setText("Войти");
                    if (r.ok) {
                        saveToken(r.token); token=r.token; username=r.username;
                        role=r.role; sub=r.sub; loadAvatar(); showMain();
                    } else {
                        err.setText(r.error != null ? r.error : "Ошибка входа");
                    }
                });
            }).start();
        };
        btn.addActionListener(doLogin);
        email.addAL(doLogin); pass.addAL(doLogin);

        frame.setContentPane(p); frame.revalidate(); frame.repaint();
    }

    static void showMain() {
        JPanel p = base();
        addX(p);

        int cw = 380, ch = 440;
        int cx = (480 - cw) / 2;
        int cy = (600 - ch) / 2;

        // Логотип маленький
        LogoLabel logo = new LogoLabel();
        logo.setBounds(cx + cw/2 - 16, cy + 16, 32, 32);
        p.add(logo);

        // Заголовок
        lbl(p, "TheDay Client", 0, cy + 50, 480, 26,
            new Font("Segoe UI", Font.BOLD, 20), WHITE)
            .setHorizontalAlignment(SwingConstants.CENTER);

        lbl(p, "Minecraft 1.21.11  ·  v1.2", 0, cy + 76, 480, 16,
            new Font("Segoe UI", Font.PLAIN, 11), GREY)
            .setHorizontalAlignment(SwingConstants.CENTER);

        // Разделитель
        JSeparator sep1 = new JSeparator();
        sep1.setForeground(new Color(55,55,90,120));
        sep1.setBounds(cx+20, cy+100, cw-40, 1); p.add(sep1);

        // Описание
        JTextArea desc = new JTextArea(
            "Приватный клиент с мощной Combat и Movement составляющей. " +
            "Регулярные обновления, облачные конфиги и поддержка.");
        desc.setForeground(GREY); desc.setBackground(new Color(0,0,0,0));
        desc.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        desc.setLineWrap(true); desc.setWrapStyleWord(true);
        desc.setEditable(false); desc.setOpaque(false);
        desc.setBounds(cx+20, cy+112, cw-40, 48); p.add(desc);

        // Кнопка запуска
        GlowBtn launch = new GlowBtn("▶   ЗАПУСТИТЬ");
        launch.setBounds(cx+20, cy+172, cw-40, 52); p.add(launch);

        // Прогресс-бар
        ProgressBar pb = new ProgressBar();
        pb.setBounds(cx+20, cy+172, cw-40, 52); pb.setVisible(false); p.add(pb);

        JLabel statusLbl = new JLabel("");
        statusLbl.setForeground(new Color(150,140,255));
        statusLbl.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        statusLbl.setHorizontalAlignment(SwingConstants.CENTER);
        statusLbl.setBounds(cx, cy+232, cw, 16); statusLbl.setVisible(false); p.add(statusLbl);

        launch.addActionListener(e -> {
            launch.setVisible(false); pb.setVisible(true); statusLbl.setVisible(true);
            new Thread(() -> launchClient(pb, statusLbl, launch)).start();
        });

        // Разделитель
        JSeparator sep2 = new JSeparator();
        sep2.setForeground(new Color(55,55,90,120));
        sep2.setBounds(cx+20, cy+258, cw-40, 1); p.add(sep2);

        // Аватар + инфо
        AvatarLabel av = new AvatarLabel(avatarB64, 46);
        av.setBounds(cx+20, cy+272, 46, 46); p.add(av);

        lbl(p, username, cx+78, cy+276, 200, 20,
            new Font("Segoe UI", Font.BOLD, 14), WHITE);

        // Роль с цветом
        Color roleColor;
        switch(role) {
            case "Администратор": case "Admin":   roleColor = new Color(255,80,80);   break;
            case "Developer":     case "Dev":     roleColor = new Color(41,182,246);  break;
            case "Media":         case "Медиа":   roleColor = new Color(206,147,216); break;
            case "Beta":          case "Бета":    roleColor = new Color(255,167,38);  break;
            case "Sponsor":       case "Спонсор": roleColor = new Color(255,215,0);   break;
            case "Модератор":     case "Moder":   roleColor = new Color(102,187,106); break;
            default:                              roleColor = new Color(150,140,255); break;
        }
        // Бейдж роли
        RoleBadge rb = new RoleBadge(role, roleColor);
        rb.setBounds(cx+78, cy+296, 120, 18); p.add(rb);

        // Подписка
        String subText = (sub != null && !sub.isEmpty()) ? "✦ " + sub : "Нет подписки";
        Color subColor = (sub != null && !sub.isEmpty()) ? new Color(52,211,153) : GREY2;
        lbl(p, subText, cx+78, cy+316, 200, 14,
            new Font("Segoe UI", Font.PLAIN, 10), subColor);

        // Кнопка выхода
        JLabel logout = new JLabel("⎋");
        logout.setForeground(GREY2);
        logout.setFont(new Font("Segoe UI", Font.PLAIN, 18));
        logout.setBounds(cx+cw-40, cy+278, 30, 30);
        logout.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        logout.setToolTipText("Выйти");
        logout.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent e) { deleteToken(); token=null; avatarB64=null; showLogin(); }
            public void mouseEntered(MouseEvent e) { logout.setForeground(ERR); }
            public void mouseExited(MouseEvent e)  { logout.setForeground(GREY2); }
        });
        p.add(logout);

        // Разделитель
        JSeparator sep3 = new JSeparator();
        sep3.setForeground(new Color(55,55,90,120));
        sep3.setBounds(cx+20, cy+342, cw-40, 1); p.add(sep3);

        // Ссылки внизу с иконками
        String[] links  = {"🌐  Сайт", "💬  Discord", "❓  Поддержка"};
        String[] urls   = {
            "https://the-day-site.pages.dev",
            "https://discord.gg/theday",
            "https://the-day-site.pages.dev/support.html"
        };
        for (int i = 0; i < links.length; i++) {
            final int idx = i;
            JLabel lnk = new JLabel(links[i]);
            lnk.setForeground(GREY2);
            lnk.setFont(new Font("Segoe UI", Font.PLAIN, 11));
            lnk.setBounds(cx+20 + i*120, cy+354, 110, 18);
            lnk.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            lnk.addMouseListener(new MouseAdapter() {
                public void mouseClicked(MouseEvent e) { openBrowser(urls[idx]); }
                public void mouseEntered(MouseEvent e) { lnk.setForeground(ACCENT3); }
                public void mouseExited(MouseEvent e)  { lnk.setForeground(GREY2); }
            });
            p.add(lnk);
        }

        // Версия внизу
        lbl(p, "v1.2  ·  TheDay © 2026", 0, cy+ch-20, 480, 14,
            new Font("Segoe UI", Font.PLAIN, 10), GREY2)
            .setHorizontalAlignment(SwingConstants.CENTER);

        frame.setContentPane(p); frame.revalidate(); frame.repaint();
    }

    static void launchClient(ProgressBar pb, JLabel statusLbl, GlowBtn launch) {
        try {
            File jar = new File(CLIENT_JAR);
            if (!jar.exists()) {
                SwingUtilities.invokeLater(()->statusLbl.setText("\u24D8  Загружаем: "+CLIENT_JAR+" 0%"));
                downloadWithProgress(CLIENT_URL, CLIENT_JAR, (pct, name) ->
                    SwingUtilities.invokeLater(()->{
                        statusLbl.setText("\u24D8  Загружаем: "+name+" "+pct+"%");
                        pb.setProgress(pct/100f);
                    })
                );
            }
            SwingUtilities.invokeLater(()->{
                statusLbl.setText("\u24D8  Проверка файлов...");
                pb.setProgress(-1f); // спиннер
            });
            Thread.sleep(800);
            ProcessBuilder proc = new ProcessBuilder(
                "java","-jar",CLIENT_JAR,"--token",token,"--username",username);
            proc.inheritIO(); proc.start();
            SwingUtilities.invokeLater(()->System.exit(0));
        } catch(Exception ex) {
            SwingUtilities.invokeLater(()->{
                pb.setVisible(false); launch.setVisible(true);
                statusLbl.setVisible(false);
                JOptionPane.showMessageDialog(frame,"Ошибка: "+ex.getMessage(),"Ошибка",JOptionPane.ERROR_MESSAGE);
            });
        }
    }

    interface ProgressCallback { void update(int pct, String name); }

    static void downloadWithProgress(String url, String dest, ProgressCallback cb) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000); con.setReadTimeout(60000);
        int total = con.getContentLength();
        String name = dest;
        try(InputStream in = con.getInputStream();
            FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192]; int read; long done=0;
            while((read=in.read(buf))!=-1){
                out.write(buf,0,read); done+=read;
                if(total>0) cb.update((int)(done*100/total),name);
            }
        }
    }

    static void loadAvatar() {
        new Thread(()->{
            try {
                AuthResult r = apiPost("/launcher/profile","{\"token\":\""+esc(token)+"\"}");
                if(r.ok&&r.avatarB64!=null) avatarB64=r.avatarB64;
            } catch(Exception ignored){}
        }).start();
    }

    static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    static AuthResult apiPost(String path, String body) {
        AuthResult r = new AuthResult();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(API+path))
                .header("Content-Type","application/json")
                .header("x-launcher-secret",SECRET)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(10)).build();
            HttpResponse<String> resp = HTTP.send(req,HttpResponse.BodyHandlers.ofString());
            String j = resp.body();
            r.ok = j.contains("\"ok\":true");
            if(r.ok){r.token=ex(j,"token");r.username=ex(j,"username");
                r.role=ex(j,"role");r.sub=ex(j,"sub");r.avatarB64=ex(j,"avatar");}
            else{r.error=ex(j,"error");if(r.error==null)r.error="Ошибка сервера";}
        } catch(Exception e){r.ok=false;r.error="Сервер недоступен";}
        return r;
    }

    static class AuthResult{boolean ok;String token,username,role,sub,error,avatarB64;}

    static String getHWID() {
        if(cachedHWID!=null)return cachedHWID;
        try {
            Process p=Runtime.getRuntime().exec(new String[]{"wmic","csproduct","get","UUID"});
            String out=new String(p.getInputStream().readAllBytes()).trim();
            for(String l:out.split("\\r?\\n")){l=l.trim();
                if(!l.isEmpty()&&!l.equalsIgnoreCase("UUID")){
                    cachedHWID="WIN-"+l.replaceAll("[^A-Za-z0-9-]","");return cachedHWID;}}
        } catch(Exception ignored){}
        cachedHWID="PC-"+System.getenv("COMPUTERNAME")+"-"+System.getProperty("user.name");
        return cachedHWID;
    }

    static String loadToken(){try{Path f=Path.of(TOKEN_FILE);if(Files.exists(f))return Files.readString(f).trim();}catch(Exception e){}return null;}
    static void saveToken(String t){try{Path d=Path.of(System.getProperty("user.home"),".theday");Files.createDirectories(d);Files.writeString(d.resolve("session.dat"),t);}catch(Exception e){}}
    static void deleteToken(){try{Files.deleteIfExists(Path.of(TOKEN_FILE));}catch(Exception e){}}
    static void openBrowser(String u){try{Desktop.getDesktop().browse(URI.create(u));}catch(Exception e){}}

    static String ex(String j,String k){
        String bl=exBlock(j,"user");String v=exStr(bl!=null?bl:j,k);if(v==null)v=exStr(j,k);return v;}
    static String exStr(String j,String k){
        String s="\""+k+"\":\"";int i=j.indexOf(s);if(i<0)return null;i+=s.length();
        StringBuilder sb=new StringBuilder();
        while(i<j.length()){char c=j.charAt(i);
            if(c=='\\'&&i+1<j.length()){i++;sb.append(j.charAt(i++));continue;}
            if(c=='"')break;sb.append(c);i++;}return sb.toString();}
    static String exBlock(String j,String k){
        String s="\""+k+"\":{";int i=j.indexOf(s);if(i<0)return null;i+=s.length()-1;
        int d=0;StringBuilder sb=new StringBuilder();
        while(i<j.length()){char c=j.charAt(i);
            if(c=='{')d++;else if(c=='}'){d--;if(d==0){sb.append(c);break;}}
            sb.append(c);i++;}return sb.toString();}
    static String esc(String s){if(s==null)return"";return s.replace("\\","\\\\").replace("\"","\\\"");}

    static JPanel base(){
        if (starX == null) initStars(480, 600);
        appearAnim = 0f;
        animStart  = System.currentTimeMillis();

        JPanel p = new JPanel(null) {
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D)g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,   RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_RENDERING,      RenderingHints.VALUE_RENDER_QUALITY);
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                int w = getWidth(), h = getHeight();

                // Фон — радиальный градиент
                g2.setPaint(new GradientPaint(0,0, BG2, w, h, BG));
                g2.fillRect(0,0,w,h);

                // Тонкий акцентный glow сверху
                GradientPaint topGlow = new GradientPaint(
                    w/2f, 0, new Color(90,80,210,40),
                    w/2f, 120, new Color(90,80,210,0));
                g2.setPaint(topGlow);
                g2.fillRect(0,0,w,120);

                // Звёзды
                updateStars(w, h);
                drawStars(g2, w, h);

                // Анимация появления (easeOutCubic)
                long elapsed = System.currentTimeMillis() - animStart;
                appearAnim = Math.min(1f, elapsed / 500f);
                float ease = 1f - (float)Math.pow(1f - appearAnim, 3);

                // Стеклянная карточка — высота подбирается под контент
                // Ищем самый нижний компонент чтобы определить нужную высоту
                int maxBottom = 0;
                for (Component c : getComponents()) {
                    int b = c.getY() + c.getHeight();
                    if (b > maxBottom) maxBottom = b;
                }
                int cw = 380;
                int cx = (w - cw) / 2;
                // Вычисляем ch и cy из позиций компонентов
                int minTop = h;
                for (Component c : getComponents()) {
                    if (c.getX() >= cx - 10 && c.getX() <= cx + 30 && c.getY() > 0) {
                        if (c.getY() < minTop) minTop = c.getY();
                    }
                }
                if (minTop == h) minTop = 80;
                int cardTop = minTop - 20;
                int cardH   = maxBottom - cardTop + 24;
                if (cardH < 300) cardH = 360;
                int cy = (int)(cardTop + (1f - ease) * 30f);
                int alpha = (int)(ease * 255);

                // Тень карточки
                for (int i = 8; i > 0; i--) {
                    int sa = (int)(ease * 15 * (9-i)/8f);
                    g2.setColor(new Color(ACCENT.getRed(), ACCENT.getGreen(), ACCENT.getBlue(), sa));
                    g2.fillRoundRect(cx-i, cy-i+4, cw+i*2, cardH+i*2, 20+i, 20+i);
                }

                // Фон карточки
                g2.setColor(new Color(16,16,28, (int)(ease*210)));
                g2.fillRoundRect(cx, cy, cw, cardH, 18, 18);

                // Граница карточки — градиент
                g2.setStroke(new BasicStroke(1f));
                GradientPaint border = new GradientPaint(
                    cx, cy, new Color(100,90,220,(int)(ease*120)),
                    cx+cw, cy+cardH, new Color(60,60,100,(int)(ease*60)));
                g2.setPaint(border);
                g2.drawRoundRect(cx, cy, cw, cardH, 18, 18);

                // Верхняя полоска акцента
                GradientPaint topLine = new GradientPaint(
                    cx+40, cy, new Color(120,100,255,(int)(ease*200)),
                    cx+cw-40, cy, new Color(90,80,210,(int)(ease*80)));
                g2.setPaint(topLine);
                g2.setStroke(new BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                g2.drawLine(cx+40, cy+1, cx+cw-40, cy+1);
            }
        };
        p.setBackground(BG);
        p.setOpaque(true);

        // Таймер анимации
        Timer t = new Timer(16, e -> p.repaint());
        t.start();

        MouseAdapter drag = new MouseAdapter() {
            Point st;
            public void mousePressed(MouseEvent e)  { st = e.getPoint(); }
            public void mouseDragged(MouseEvent e)  {
                Point l = frame.getLocation();
                frame.setLocation(l.x + e.getX() - st.x, l.y + e.getY() - st.y);
            }
        };
        p.addMouseListener(drag);
        p.addMouseMotionListener(drag);
        return p;
    }

    static void addX(JPanel p){
        JLabel x=new JLabel("\u2715");x.setForeground(GREY);x.setFont(new Font("Segoe UI",Font.PLAIN,18));
        x.setBounds(440,18,25,25);x.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        x.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){System.exit(0);}
            public void mouseEntered(MouseEvent e){x.setForeground(WHITE);}
            public void mouseExited(MouseEvent e){x.setForeground(GREY);}});p.add(x);}

    static JLabel makeIcon(String emoji, int size) {
        JLabel l = new JLabel(emoji);
        l.setFont(new Font("Segoe UI Emoji", Font.PLAIN, size));
        l.setHorizontalAlignment(SwingConstants.CENTER);
        return l;
    }

    static JLabel lbl(JPanel p,String t,int x,int y,int w,int h,Font f,Color c){
        JLabel l=new JLabel(t);l.setForeground(c);l.setFont(f);l.setBounds(x,y,w,h);p.add(l);return l;}
}

class RField extends JPanel {
    private final JTextField tf;
    private final JPasswordField pf;
    private final boolean isPw;
    RField(String ph,boolean pw){
        setLayout(null);setOpaque(false);isPw=pw;
        if(pw){pf=new JPasswordField();tf=null;
            pf.setBounds(16,14,310,24);pf.setBackground(new Color(0,0,0,0));
            pf.setForeground(TheDayLauncher.WHITE);pf.setCaretColor(TheDayLauncher.WHITE);
            pf.setBorder(null);pf.setOpaque(false);pf.setFont(new Font("Segoe UI",Font.PLAIN,14));
            add(pf);
            JLabel eye=new JLabel("\uD83D\uDC41");eye.setBounds(340,14,24,24);
            eye.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            boolean[]show={false};
            eye.addMouseListener(new MouseAdapter(){public void mouseClicked(MouseEvent e){
                show[0]=!show[0];pf.setEchoChar(show[0]?(char)0:'*');}});add(eye);
        } else {tf=new JTextField();pf=null;
            tf.setBounds(16,14,348,24);tf.setBackground(new Color(0,0,0,0));
            tf.setForeground(TheDayLauncher.GREY);tf.setCaretColor(TheDayLauncher.WHITE);
            tf.setBorder(null);tf.setOpaque(false);tf.setFont(new Font("Segoe UI",Font.PLAIN,14));
            tf.setText(ph);
            tf.addFocusListener(new FocusAdapter(){
                public void focusGained(FocusEvent e){if(tf.getText().equals(ph)){tf.setText("");tf.setForeground(TheDayLauncher.WHITE);}}
                public void focusLost(FocusEvent e){if(tf.getText().isEmpty()){tf.setText(ph);tf.setForeground(TheDayLauncher.GREY);}}});
            add(tf);}
    }
    String val(){if(isPw)return new String(pf.getPassword());String t=tf.getText();return t.startsWith("Введите")||t.equals("Пароль")?"":t;}
    void addAL(java.awt.event.ActionListener l){if(isPw)pf.addActionListener(l);else tf.addActionListener(l);}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setColor(TheDayLauncher.FIELD_BG);g2.fillRoundRect(0,0,getWidth(),getHeight(),12,12);
        g2.setColor(TheDayLauncher.BORDER);g2.setStroke(new BasicStroke(1f));
        g2.drawRoundRect(0,0,getWidth()-1,getHeight()-1,12,12);super.paintComponent(g);}
}

class GBtn extends JButton {
    GBtn(String t){super(t);setOpaque(false);setContentAreaFilled(false);setBorderPainted(false);
        setForeground(TheDayLauncher.WHITE);setFont(new Font("Segoe UI",Font.BOLD,16));
        setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));setFocusPainted(false);}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        Color c1=isEnabled()?TheDayLauncher.ACCENT:new Color(60,60,80);
        Color c2=isEnabled()?TheDayLauncher.ACCENT2:new Color(50,50,70);
        g2.setPaint(new GradientPaint(0,0,c1,getWidth(),0,c2));
        g2.fillRoundRect(0,0,getWidth(),getHeight(),14,14);super.paintComponent(g);}
}

class ProgressBar extends JPanel {
    private float progress = -1f; // -1 = спиннер
    private float spinAngle = 0f;
    private final Timer timer;

    ProgressBar(){
        setOpaque(false);
        timer = new Timer(16, e -> {
            spinAngle = (spinAngle + 6f) % 360f;
            repaint();
        });
        timer.start();
    }

    void setProgress(float p){ this.progress=p; repaint(); }

    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        int w=getWidth(),h=getHeight();
        // Фон кнопки — градиент
        g2.setPaint(new GradientPaint(0,0,TheDayLauncher.ACCENT,w,0,TheDayLauncher.ACCENT2));
        g2.fillRoundRect(0,0,w,h,14,14);
        // Прогресс поверх (светлее)
        if(progress>0){
            g2.setColor(new Color(255,255,255,40));
            g2.fillRoundRect(0,0,(int)(w*progress),h,14,14);}
        // Спиннер по центру
        int cx=w/2,cy=h/2,r=12;
        g2.setStroke(new BasicStroke(2.5f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND));
        g2.setColor(new Color(255,255,255,60));
        g2.drawOval(cx-r,cy-r,r*2,r*2);
        g2.setColor(Color.WHITE);
        double rad=Math.toRadians(spinAngle);
        int x1=(int)(cx+r*Math.cos(rad)),y1=(int)(cy+r*Math.sin(rad));
        int x2=(int)(cx+r*Math.cos(rad+Math.PI*1.2)),y2=(int)(cy+r*Math.sin(rad+Math.PI*1.2));
        g2.drawArc(cx-r,cy-r,r*2,r*2,(int)spinAngle,120);
    }
}

class AvatarLabel extends JLabel {
    private BufferedImage img; private final int sz;
    AvatarLabel(String b64,int s){sz=s;
        if(b64!=null&&!b64.isEmpty()){try{
            String d=b64;int c=d.indexOf(',');if(c>=0)d=d.substring(c+1);
            img=ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(d)));
        }catch(Exception e){}}}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setClip(new Ellipse2D.Float(0,0,sz,sz));
        if(img!=null){g2.drawImage(img,0,0,sz,sz,null);}
        else{g2.setColor(TheDayLauncher.ACCENT);g2.fillOval(0,0,sz,sz);
            g2.setColor(TheDayLauncher.WHITE);g2.setFont(new Font("Segoe UI",Font.BOLD,sz/2));
            FontMetrics fm=g2.getFontMetrics();
            String ini=TheDayLauncher.username.isEmpty()?"?":String.valueOf(TheDayLauncher.username.charAt(0)).toUpperCase();
            g2.drawString(ini,(sz-fm.stringWidth(ini))/2,(sz-fm.getHeight())/2+fm.getAscent());}}
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
// Бейдж роли с цветным фоном и скруглёнными углами
class RoleBadge extends JPanel {
    private final String text;
    private final Color  color;

    RoleBadge(String text, Color color) {
        this.text  = text;
        this.color = color;
        setOpaque(false);
    }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        Font f = new Font("Segoe UI", Font.BOLD, 10);
        g2.setFont(f);
        FontMetrics fm = g2.getFontMetrics();
        int tw = fm.stringWidth(text);
        int bw = tw + 14, bh = 16;
        // Фон бейджа
        g2.setColor(new Color(color.getRed(), color.getGreen(), color.getBlue(), 30));
        g2.fillRoundRect(0, 0, bw, bh, 8, 8);
        // Граница
        g2.setColor(new Color(color.getRed(), color.getGreen(), color.getBlue(), 120));
        g2.setStroke(new BasicStroke(0.8f));
        g2.drawRoundRect(0, 0, bw-1, bh-1, 8, 8);
        // Текст
        g2.setColor(color);
        g2.drawString(text, 7, bh - (bh - fm.getAscent()) / 2 - 1);
    }
}
