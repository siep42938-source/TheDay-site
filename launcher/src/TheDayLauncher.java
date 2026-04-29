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

public class TheDayLauncher {

    // ── Константы ─────────────────────────────────────────────────────────────
    static final String API        = "https://the-day-site-ovk7.vercel.app/api";
    static final String SECRET     = "theday_launcher_secret_2026";
    // Путь к jar клиента (Fabric мод)
    static final String CLIENT_JAR     = "rich-1.0.01.jar";
    // Путь к папке mods Minecraft (стандартный .minecraft)
    static final String MINECRAFT_MODS = System.getProperty("user.home") + "/AppData/Roaming/.minecraft/mods";
    // Путь к Minecraft launcher
    static final String MINECRAFT_EXE  = System.getProperty("user.home") + "/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Minecraft Launcher/Minecraft Launcher.exe";
    static final String TOKEN_FILE = System.getProperty("user.home") + "/.theday/session.dat";

    // Цвета — тёмная тема как на скриншоте
    static final Color BG       = new Color(18, 18, 20);
    static final Color CARD     = new Color(24, 24, 28);
    static final Color CARD2    = new Color(28, 28, 34);
    static final Color BORDER   = new Color(45, 45, 52);
    static final Color ACCENT   = new Color(80, 180, 120);
    static final Color ACCENT2  = new Color(60, 160, 100);
    static final Color WHITE    = Color.WHITE;
    static final Color GREY     = new Color(160, 160, 170);
    static final Color GREY2    = new Color(100, 100, 110);
    static final Color ERR      = new Color(255, 80, 80);
    static final Color PURPLE   = new Color(90, 80, 210);
    static final Color PURPLE2  = new Color(120, 100, 255);

    static String token = "", username = "", role = "Пользователь", sub = "", avatarB64 = null;
    static JFrame frame;
    static String cachedHWID = null;
    static float  fadeIn = 0f;
    static long   fadeStart = 0L;

    // ── main ──────────────────────────────────────────────────────────────────
    public static void main(String[] args) {
        System.setProperty("awt.useSystemAAFontSettings", "on");
        System.setProperty("swing.aatext", "true");
        SwingUtilities.invokeLater(() -> {
            frame = new JFrame("TheDay Launcher");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setUndecorated(true);
            frame.setBackground(new Color(0, 0, 0, 0));
            frame.getRootPane().setOpaque(false);
            frame.setResizable(false);
            // Превью режим — сразу главный экран
            boolean preview = args.length > 0 && args[0].equals("--preview");
            if (preview) {
                username = "Dem4chik"; role = "Beta"; sub = "30 дней";
                showMain();
            } else {
                String saved = loadToken();
                if (saved != null) verifyAndShow(saved);
                else showLogin();
            }
            frame.setVisible(true);
            try { frame.setShape(new RoundRectangle2D.Double(0,0,frame.getWidth(),frame.getHeight(),28,28)); } catch(Exception ignored){}
        });
    }

    // ── Проверка токена ───────────────────────────────────────────────────────
    static void verifyAndShow(String t) {
        frame.setSize(700, 420);
        frame.setLocationRelativeTo(null);
        JPanel p = makeBase(700, 420);
        TDSpinner sp = new TDSpinner("Проверка сессии");
        sp.setBounds(250, 170, 200, 80);
        p.add(sp);
        frame.setContentPane(p);
        frame.revalidate();
        new Thread(() -> {
            String hwid = getHWID();
            AuthResult r = apiPost("/launcher/verify",
                "{\"token\":\"" + esc(t) + "\",\"hwid\":\"" + esc(hwid) + "\"}");
            SwingUtilities.invokeLater(() -> {
                if (r.ok) { token = t; username = r.username; role = r.role; sub = r.sub; loadAvatar(); showMain(); }
                else { deleteToken(); showLogin(); }
            });
        }).start();
    }
    // ── Экран входа ───────────────────────────────────────────────────────────
    static void showLogin() {
        frame.setSize(460, 480);
        frame.setLocationRelativeTo(null);
        fadeIn = 0f; fadeStart = System.currentTimeMillis();
        JPanel p = makeBase(460, 480);

        // X кнопка
        JLabel x = new JLabel("\u00d7");
        x.setForeground(GREY2); x.setFont(new Font("Segoe UI", Font.PLAIN, 22));
        x.setBounds(420, 14, 28, 28); x.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        x.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent e) { System.exit(0); }
            public void mouseEntered(MouseEvent e) { x.setForeground(WHITE); }
            public void mouseExited(MouseEvent e)  { x.setForeground(GREY2); }
        });
        p.add(x);

        int cx = 40, cw = 380;

        // Заголовок
        JLabel title = new JLabel("Авторизация");
        title.setForeground(new Color(255, 255, 255));
        title.setFont(new Font("Segoe UI", Font.BOLD, 30));
        title.setBounds(cx, 80, cw, 40);
        p.add(title);

        JLabel sub2 = new JLabel("Войдите, чтобы попасть в свой профиль");
        sub2.setForeground(new Color(185, 178, 220));
        sub2.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        sub2.setBounds(cx, 124, cw, 20);
        p.add(sub2);

        // Поля
        TDField email = new TDField("Введите ваш логин или почту", false);
        email.setBounds(cx, 158, cw, 52); p.add(email);

        TDField pass = new TDField("Введите пароль", true);
        pass.setBounds(cx, 222, cw, 52); p.add(pass);

        JLabel err = new JLabel("");
        err.setForeground(ERR);
        err.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        err.setBounds(cx, 282, cw, 16); p.add(err);

        TDBtn btn = new TDBtn("Войти", PURPLE, PURPLE2);
        btn.setBounds(cx, 300, cw, 52); p.add(btn);

        JLabel forgot = new JLabel("Забыли пароль");
        forgot.setForeground(GREY2);
        forgot.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        forgot.setBounds(cx, 364, cw, 20);
        forgot.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        forgot.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent e) { openBrowser("https://the-day-site.pages.dev/login.html"); }
            public void mouseEntered(MouseEvent e) { forgot.setForeground(PURPLE2); }
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
                    "{\"email\":\"" + esc(em) + "\",\"password\":\"" + esc(pw) + "\",\"hwid\":\"" + esc(hwid) + "\"}");
                SwingUtilities.invokeLater(() -> {
                    btn.setEnabled(true); btn.setText("Войти");
                    if (r.ok) {
                        saveToken(r.token); token = r.token; username = r.username;
                        role = r.role; sub = r.sub; loadAvatar(); showMain();
                    } else {
                        err.setText(r.error != null ? r.error : "Ошибка входа");
                    }
                });
            }).start();
        };
        btn.addActionListener(doLogin);
        email.addAL(doLogin); pass.addAL(doLogin);
        frame.setContentPane(p); frame.revalidate(); frame.repaint();
        SwingUtilities.invokeLater(() -> {
            try { frame.setShape(new RoundRectangle2D.Double(0,0,frame.getWidth(),frame.getHeight(),28,28)); } catch(Exception ignored){}
        });
    }

    // ── Главный экран ─────────────────────────────────────────────────────────
    static void showMain() {
        frame.setSize(780, 440);
        frame.setLocationRelativeTo(null);
        JPanel p = makeMainBase(780, 440);
        int W = 780, lx = 28, lw = 330;

        // ── X кнопка ──────────────────────────────────────────────────────────
        JLabel x = new JLabel("\u00d7");
        x.setForeground(new Color(100,120,140)); x.setFont(new Font("Segoe UI",Font.PLAIN,20));
        x.setBounds(W-36,10,26,26); x.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        x.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){System.exit(0);}
            public void mouseEntered(MouseEvent e){x.setForeground(new Color(226,232,240));}
            public void mouseExited(MouseEvent e){x.setForeground(new Color(100,120,140));}
        }); p.add(x);

        // ── Заголовок ─────────────────────────────────────────────────────────
        JLabel title = new JLabel("TheDay Client");
        title.setForeground(new Color(226,232,240));
        title.setFont(new Font("Segoe UI",Font.BOLD,15));
        title.setBounds(lx,13,200,20); p.add(title);

        JLabel ver = new JLabel("1.21.11");
        ver.setForeground(new Color(135,206,235,180));
        ver.setFont(new Font("Segoe UI",Font.PLAIN,11));
        ver.setBounds(lx+130,15,60,16); p.add(ver);

        // ── Разделитель ───────────────────────────────────────────────────────
        JSeparator sep0 = new JSeparator();
        sep0.setForeground(new Color(135,206,235,15));
        sep0.setBounds(0,42,390,1); p.add(sep0);

        // ── Карточка описания (рисуется в makeMainBase) ───────────────────────
        // Текст описания
        JLabel d1 = new JLabel("Приватный клиент с мощной Combat");
        d1.setForeground(new Color(203,213,225)); d1.setFont(new Font("Segoe UI",Font.PLAIN,12));
        d1.setBounds(lx+12,60,lw-16,18); p.add(d1);

        JLabel d2 = new JLabel("и Movement составляющей.");
        d2.setForeground(new Color(203,213,225)); d2.setFont(new Font("Segoe UI",Font.PLAIN,12));
        d2.setBounds(lx+12,78,lw-16,18); p.add(d2);

        JLabel d3 = new JLabel("Поможет вам насладиться вашей сессией.");
        d3.setForeground(new Color(203,213,225)); d3.setFont(new Font("Segoe UI",Font.PLAIN,12));
        d3.setBounds(lx+12,96,lw-16,18); p.add(d3);

        JLabel d4 = new JLabel("Поддерживает актуальные версии игры.");
        d4.setForeground(new Color(148,163,184)); d4.setFont(new Font("Segoe UI",Font.PLAIN,11));
        d4.setBounds(lx+12,122,lw-16,16); p.add(d4);

        JLabel d5 = new JLabel("Регулярные обновления и облачные конфиги.");
        d5.setForeground(new Color(148,163,184)); d5.setFont(new Font("Segoe UI",Font.PLAIN,11));
        d5.setBounds(lx+12,138,lw-16,16); p.add(d5);

        // ── Кнопка запуска ────────────────────────────────────────────────────
        TDBtn launch = new TDBtn("Запустить  \u25ba", new Color(135,206,235), new Color(79,195,247));
        launch.setBounds(lx,172,lw,44); p.add(launch);

        TDProgress pb = new TDProgress();
        pb.setBounds(lx,172,lw,44); pb.setVisible(false); p.add(pb);

        // ── Статус ────────────────────────────────────────────────────────────
        // Точка-индикатор рисуется кастомно
        JPanel statusDot = new JPanel(){
            protected void paintComponent(Graphics g){
                Graphics2D g2=(Graphics2D)g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(new Color(135,206,235));
                g2.fillOval(2,5,7,7);
            }
        };
        statusDot.setOpaque(false); statusDot.setBounds(lx,228,12,18); p.add(statusDot);

        JLabel statusTxt = new JLabel("Готов к запуску");
        statusTxt.setForeground(new Color(100,116,139));
        statusTxt.setFont(new Font("Segoe UI",Font.PLAIN,11));
        statusTxt.setBounds(lx+16,226,220,18); p.add(statusTxt);

        // ── Разделитель перед профилем ────────────────────────────────────────
        JSeparator sep2 = new JSeparator();
        sep2.setForeground(new Color(135,206,235,15));
        sep2.setBounds(lx,258,lw+12,1); p.add(sep2);

        // ── Аватар ────────────────────────────────────────────────────────────
        TDAvatar av = new TDAvatar(avatarB64,40);
        av.setBounds(lx+12,270,40,40); p.add(av);

        // ── Имя пользователя ──────────────────────────────────────────────────
        JLabel uname = new JLabel(username);
        uname.setForeground(new Color(226,232,240));
        uname.setFont(new Font("Segoe UI",Font.BOLD,13));
        uname.setBounds(lx+62,272,200,18); p.add(uname);

        // ── Роль ──────────────────────────────────────────────────────────────
        Color rc;
        switch(role){
            case "Администратор":case "Admin":rc=new Color(248,113,113);break;
            case "Developer":case "Dev":rc=new Color(56,189,248);break;
            case "Media":case "Медиа":rc=new Color(192,132,252);break;
            case "Beta":case "Бета":rc=new Color(251,191,36);break;
            case "Sponsor":case "Спонсор":rc=new Color(250,204,21);break;
            case "Модератор":case "Moder":rc=new Color(74,222,128);break;
            default:rc=new Color(135,206,235);break;
        }
        JLabel roleL = new JLabel(role);
        roleL.setForeground(rc);
        roleL.setFont(new Font("Segoe UI",Font.PLAIN,11));
        roleL.setBounds(lx+62,292,200,15); p.add(roleL);

        // ── Подписка ──────────────────────────────────────────────────────────
        String subTxt=(sub!=null&&!sub.isEmpty())?sub:"Нет подписки";
        Color subC=(sub!=null&&!sub.isEmpty())?new Color(135,206,235,180):new Color(71,85,105);
        JLabel subL=new JLabel(subTxt);
        subL.setForeground(subC);
        subL.setFont(new Font("Segoe UI",Font.PLAIN,10));
        subL.setBounds(lx+62,308,200,14); p.add(subL);

        // ── Выйти ─────────────────────────────────────────────────────────────
        JLabel logout=new JLabel("Выйти");
        logout.setForeground(new Color(71,85,105));
        logout.setFont(new Font("Segoe UI",Font.PLAIN,11));
        logout.setBounds(lx+12,398,50,16);
        logout.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        logout.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){deleteToken();token=null;avatarB64=null;showLogin();}
            public void mouseEntered(MouseEvent e){logout.setForeground(new Color(248,113,113));}
            public void mouseExited(MouseEvent e){logout.setForeground(new Color(71,85,105));}
        }); p.add(logout);

        // ── Превью справа ─────────────────────────────────────────────────────
        PreviewPanel preview = new PreviewPanel();
        preview.setBounds(385,0,395,440); p.add(preview);

        launch.addActionListener(e->{
            launch.setVisible(false);pb.setVisible(true);
            statusTxt.setText("Загрузка...");
            statusDot.repaint();
            new Thread(()->launchClient(pb,statusTxt,statusDot,launch)).start();
        });

        frame.setContentPane(p); frame.revalidate(); frame.repaint();
        SwingUtilities.invokeLater(()->{
            try{frame.setShape(new RoundRectangle2D.Double(0,0,frame.getWidth(),frame.getHeight(),24,24));}catch(Exception ignored){}
        });
    }

    // ── Утилиты ───────────────────────────────────────────────────────────────
    static void launchClient(TDProgress pb, JLabel statusTxt, JPanel statusDot, TDBtn launch) {
        try {
            // Ищем jar мода рядом с лаунчером
            File jar = new File(CLIENT_JAR);
            if (!jar.exists()) {
                try {
                    File launcherDir = new File(TheDayLauncher.class.getProtectionDomain()
                        .getCodeSource().getLocation().toURI()).getParentFile();
                    jar = new File(launcherDir, CLIENT_JAR);
                } catch (Exception ignored) {}
            }
            if (!jar.exists()) {
                final String missing = CLIENT_JAR;
                SwingUtilities.invokeLater(() -> {
                    pb.setVisible(false); launch.setVisible(true);
                    statusTxt.setText("Файл " + missing + " не найден рядом с лаунчером");
                });
                return;
            }

            // Копируем мод в папку mods Minecraft
            SwingUtilities.invokeLater(() -> statusTxt.setText("Установка мода..."));
            File modsDir = new File(MINECRAFT_MODS);
            if (!modsDir.exists()) modsDir.mkdirs();

            // Удаляем старую версию мода если есть
            File[] oldMods = modsDir.listFiles((d, n) -> n.startsWith("rich-") && n.endsWith(".jar"));
            if (oldMods != null) for (File old : oldMods) old.delete();

            // Копируем новый мод
            Files.copy(jar.toPath(), new File(modsDir, CLIENT_JAR).toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            SwingUtilities.invokeLater(() -> { statusTxt.setText("Запуск Minecraft..."); pb.setProgress(-1f); });
            Thread.sleep(600);

            // Запускаем Minecraft Launcher
            File mcExe = new File(MINECRAFT_EXE);
            if (mcExe.exists()) {
                new ProcessBuilder(mcExe.getAbsolutePath()).inheritIO().start();
            } else {
                // Fallback — ищем через реестр или стандартные пути
                String[] fallbacks = {
                    System.getProperty("user.home") + "/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Minecraft Launcher/Minecraft Launcher.exe",
                    "C:/Program Files (x86)/Minecraft Launcher/MinecraftLauncher.exe",
                    "C:/Program Files/Minecraft Launcher/MinecraftLauncher.exe",
                    "C:/XboxGames/Minecraft Launcher/Content/Minecraft.exe"
                };
                boolean started = false;
                for (String path : fallbacks) {
                    File f = new File(path);
                    if (f.exists()) {
                        new ProcessBuilder(f.getAbsolutePath()).inheritIO().start();
                        started = true;
                        break;
                    }
                }
                if (!started) {
                    // Последний вариант — открыть через shell
                    Runtime.getRuntime().exec("cmd /c start minecraft://");
                }
            }
            SwingUtilities.invokeLater(() -> System.exit(0));
        } catch (Exception ex) {
            SwingUtilities.invokeLater(() -> {
                pb.setVisible(false); launch.setVisible(true);
                statusTxt.setText("Ошибка: " + ex.getMessage());
            });
        }
    }

    interface ProgressCallback { void update(int pct, String name); }

    static void downloadWithProgress(String url, String dest, ProgressCallback cb) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000); con.setReadTimeout(60000);
        int total = con.getContentLength();
        try (InputStream in = con.getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192]; int read; long done = 0;
            while ((read = in.read(buf)) != -1) { out.write(buf, 0, read); done += read; if (total > 0) cb.update((int)(done*100/total), dest); }
        }
    }

    static void loadAvatar() {
        new Thread(() -> {
            try {
                AuthResult r = apiPost("/launcher/profile", "{\"token\":\"" + esc(token) + "\"}");
                if (r.ok && r.avatarB64 != null) avatarB64 = r.avatarB64;
            } catch (Exception ignored) {}
        }).start();
    }

    static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    static AuthResult apiPost(String path, String body) {
        AuthResult r = new AuthResult();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(API + path))
                .header("Content-Type", "application/json")
                .header("x-launcher-secret", SECRET)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(10)).build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            String j = resp.body();
            r.ok = j.contains("\"ok\":true");
            if (r.ok) { r.token=ex(j,"token"); r.username=ex(j,"username"); r.role=ex(j,"role"); r.sub=ex(j,"sub"); r.avatarB64=ex(j,"avatar"); }
            else { r.error = ex(j, "error"); if (r.error == null) r.error = "Ошибка сервера"; }
        } catch (Exception e) { r.ok = false; r.error = "Сервер недоступен"; }
        return r;
    }

    static class AuthResult { boolean ok; String token, username, role, sub, error, avatarB64; }

    static String getHWID() {
        if (cachedHWID != null) return cachedHWID;
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"wmic","csproduct","get","UUID"});
            String out = new String(p.getInputStream().readAllBytes()).trim();
            for (String l : out.split("\\r?\\n")) { l = l.trim(); if (!l.isEmpty() && !l.equalsIgnoreCase("UUID")) { cachedHWID = "WIN-" + l.replaceAll("[^A-Za-z0-9-]",""); return cachedHWID; } }
        } catch (Exception ignored) {}
        cachedHWID = "PC-" + System.getenv("COMPUTERNAME") + "-" + System.getProperty("user.name");
        return cachedHWID;
    }

    static String loadToken() { try { Path f = Path.of(TOKEN_FILE); if (Files.exists(f)) return Files.readString(f).trim(); } catch (Exception e) {} return null; }
    static void saveToken(String t) { try { Path d = Path.of(System.getProperty("user.home"), ".theday"); Files.createDirectories(d); Files.writeString(d.resolve("session.dat"), t); } catch (Exception e) {} }
    static void deleteToken() { try { Files.deleteIfExists(Path.of(TOKEN_FILE)); } catch (Exception e) {} }
    static void openBrowser(String u) { try { Desktop.getDesktop().browse(URI.create(u)); } catch (Exception e) {} }

    static String ex(String j, String k) { String bl = exBlock(j,"user"); String v = exStr(bl!=null?bl:j,k); if (v==null) v=exStr(j,k); return v; }
    static String exStr(String j, String k) { String s="\""+k+"\":\""; int i=j.indexOf(s); if(i<0)return null; i+=s.length(); StringBuilder sb=new StringBuilder(); while(i<j.length()){char c=j.charAt(i);if(c=='\\'&&i+1<j.length()){i++;sb.append(j.charAt(i++));continue;}if(c=='"')break;sb.append(c);i++;} return sb.toString(); }
    static String exBlock(String j, String k) { String s="\""+k+"\":{"; int i=j.indexOf(s); if(i<0)return null; i+=s.length()-1; int d=0; StringBuilder sb=new StringBuilder(); while(i<j.length()){char c=j.charAt(i);if(c=='{')d++;else if(c=='}'){d--;if(d==0){sb.append(c);break;}}sb.append(c);i++;} return sb.toString(); }
    static String esc(String s) { if(s==null)return""; return s.replace("\\","\\\\").replace("\"","\\\""); }

    // ── Базовая панель (экран входа) ──────────────────────────────────────────
    static float[] px = null, py, pAlpha, pSpeed;
    static final int PC = 50;
    static Random rng = new Random();
    static BufferedImage bgImg = null;

    static void initParticles(int w, int h) {
        px = new float[PC]; py = new float[PC]; pAlpha = new float[PC]; pSpeed = new float[PC];
        for (int i = 0; i < PC; i++) {
            px[i] = rng.nextFloat() * w; py[i] = rng.nextFloat() * h;
            pAlpha[i] = rng.nextFloat(); pSpeed[i] = 0.003f + rng.nextFloat() * 0.008f;
        }
    }

    static void loadBg() {
        if (bgImg != null) return;
        try {
            java.io.InputStream is = TheDayLauncher.class.getResourceAsStream("/bg.jpg");
            if (is != null) { bgImg = ImageIO.read(is); is.close(); }
        } catch (Exception ignored) {}
    }

    static JPanel makeBase(int W, int H) {
        if (px == null) initParticles(W, H);
        loadBg();
        fadeIn = 0f; fadeStart = System.currentTimeMillis();
        JPanel p = new JPanel(null) {
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                int w = getWidth(), h = getHeight();

                // Clip для скруглённых углов окна
                g2.setClip(new RoundRectangle2D.Float(0, 0, w, h, 28, 28));

                // Фон — глубокий тёмный
                g2.setColor(new Color(10, 10, 18));
                g2.fillRect(0, 0, w, h);

                long msTime = System.currentTimeMillis();
                float ft = msTime / 1000f;

                // Анимированные blob-ы (плавающие цветные пятна)
                float[][] blobs = {
                    {w*0.15f, h*0.25f, 180, 0.06f, 0.5f},
                    {w*0.80f, h*0.20f, 150, 0.04f, 1.2f},
                    {w*0.50f, h*0.75f, 200, 0.05f, 2.1f},
                    {w*0.85f, h*0.70f, 130, 0.07f, 0.8f},
                };
                for (float[] b : blobs) {
                    float bx = b[0] + (float)(Math.sin(ft * b[3] + b[4]) * 30);
                    float by = b[1] + (float)(Math.cos(ft * b[3] * 0.7 + b[4]) * 20);
                    float br = b[2];
                    RadialGradientPaint rp = new RadialGradientPaint(
                        new Point2D.Float(bx, by), br,
                        new float[]{0f, 1f},
                        new Color[]{new Color(80, 60, 200, 35), new Color(10, 10, 18, 0)});
                    g2.setPaint(rp);
                    g2.fillOval((int)(bx-br), (int)(by-br), (int)(br*2), (int)(br*2));
                }

                // Звёзды мерцающие
                for (int i = 0; i < PC; i++) {
                    float a = (float)(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(msTime * pSpeed[i] + i * 1.3)));
                    g2.setColor(new Color(230, 225, 255, (int)(a * 220)));
                    float s = 1f + (float)(Math.sin(msTime * pSpeed[i] * 0.7 + i) * 0.6);
                    g2.fillOval((int)px[i], (int)py[i], Math.max(1,(int)(s+0.5f)), Math.max(1,(int)(s+0.5f)));
                }

                // Декоративные + крестики
                g2.setFont(new Font("Segoe UI", Font.PLAIN, 10));
                int[][] crosses = {{55,75},{370,55},{415,195},{45,315},{345,375},{195,415},{305,145},{125,445},{395,315},{165,195},{280,80},{80,240}};
                for (int[] cr : crosses) {
                    float a = (float)(0.12 + 0.10 * Math.sin(ft * 0.8 + cr[0] * 0.04));
                    g2.setColor(new Color(180, 170, 255, (int)(a * 255)));
                    g2.drawString("+", cr[0], cr[1]);
                }

                // Тонкая граница
                g2.setClip(null);
                g2.setColor(new Color(70, 60, 100, 140));
                g2.setStroke(new BasicStroke(1f));
                g2.drawRoundRect(0, 0, w-1, h-1, 28, 28);
            }
        };
        p.setBackground(new Color(0, 0, 0, 0));
        p.setOpaque(false);
        Timer t = new Timer(16, e -> p.repaint()); t.start();
        addDrag(p); return p;
    }

    // ── Базовая панель (главный экран) ────────────────────────────────────────
    // Акцент сайта: #87CEEB (135,206,235), фон: #0a0a0f (10,10,15)
    static final Color SITE_BG      = new Color(10, 10, 15);
    static final Color SITE_BG2     = new Color(13, 13, 20);
    static final Color SITE_ACCENT  = new Color(135, 206, 235);   // #87CEEB
    static final Color SITE_ACCENT2 = new Color(79, 195, 247);    // #4fc3f7
    static final Color SITE_BORDER  = new Color(135, 206, 235, 26); // rgba(135,206,235,0.10)
    static final Color SITE_CARD    = new Color(13, 13, 20, 200);

    static JPanel makeMainBase(int W, int H) {
        fadeIn = 0f; fadeStart = System.currentTimeMillis();
        JPanel p = new JPanel(null) {
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                int w = getWidth(), h = getHeight();

                // Clip для скруглённых углов
                g2.setClip(new RoundRectangle2D.Float(0, 0, w, h, 24, 24));

                // Фон — глубокий тёмный как на сайте
                g2.setColor(SITE_BG);
                g2.fillRect(0, 0, w, h);

                // Левая панель чуть темнее
                g2.setColor(SITE_BG2);
                g2.fillRect(0, 0, 385, h);

                // Тонкий разделитель
                g2.setColor(new Color(135, 206, 235, 18));
                g2.setStroke(new BasicStroke(1f));
                g2.drawLine(385, 0, 385, h);

                // Карточка описания
                drawSiteCard(g2, 16, 50, 354, 112);

                // Карточка пользователя
                drawSiteCard(g2, 16, 260, 354, 110);

                // Граница окна
                g2.setClip(null);
                g2.setColor(new Color(135, 206, 235, 22));
                g2.setStroke(new BasicStroke(1f));
                g2.drawRoundRect(0, 0, w - 1, h - 1, 24, 24);
            }

            private void drawSiteCard(Graphics2D g2, int x, int y, int cw, int ch) {
                int arc = 14;
                // Фон карточки — glass-bg стиль сайта
                g2.setColor(new Color(13, 13, 20, 180));
                g2.fillRoundRect(x, y, cw, ch, arc, arc);

                // Тонкий блик сверху (как ::before на сайте)
                GradientPaint shine = new GradientPaint(
                    x, y, new Color(135, 206, 235, 10),
                    x + cw, y + ch, new Color(79, 195, 247, 5)
                );
                g2.setPaint(shine);
                g2.fillRoundRect(x, y, cw, ch, arc, arc);

                // Рамка — тонкая, акцентная, как на сайте
                g2.setColor(new Color(135, 206, 235, 26));
                g2.setStroke(new BasicStroke(1f));
                g2.drawRoundRect(x, y, cw, ch, arc, arc);
            }
        };
        p.setBackground(new Color(0, 0, 0, 0));
        p.setOpaque(false);
        Timer t = new Timer(16, e -> p.repaint()); t.start();
        addDrag(p); return p;
    }

    static void addDrag(JPanel p) {
        MouseAdapter drag = new MouseAdapter() {
            Point st;
            public void mousePressed(MouseEvent e)  { st = e.getPoint(); }
            public void mouseDragged(MouseEvent e)  { Point l = frame.getLocation(); frame.setLocation(l.x+e.getX()-st.x, l.y+e.getY()-st.y); }
        };
        p.addMouseListener(drag); p.addMouseMotionListener(drag);
    }
}

// ── Поле ввода с анимацией букв ───────────────────────────────────────────────
class TDField extends JPanel {
    private JTextField tf = null;
    private JPasswordField pf = null;
    private final boolean isPw;
    private final String ph;
    private boolean focused = false;
    private float fa = 0f;
    private final Timer anim;

    // Анимация букв — каждая буква появляется с fade+slide
    private String lastText = "";
    private float[] charAlpha = new float[0];
    private float[] charOffY  = new float[0];

    TDField(String placeholder, boolean pw) {
        ph = placeholder; isPw = pw;
        setLayout(null); setOpaque(false);

        anim = new Timer(16, e -> {
            fa += ((focused ? 1f : 0f) - fa) * 0.15f;
            // Обновляем анимацию букв
            if (!isPw) {
                String cur = tf != null ? tf.getText() : "";
                if (!cur.equals(ph) && !cur.isEmpty()) {
                    if (cur.length() > charAlpha.length) {
                        // Добавились буквы
                        float[] na = new float[cur.length()];
                        float[] no = new float[cur.length()];
                        System.arraycopy(charAlpha, 0, na, 0, charAlpha.length);
                        System.arraycopy(charOffY,  0, no, 0, charOffY.length);
                        for (int i = charAlpha.length; i < cur.length(); i++) {
                            na[i] = 0f; no[i] = 8f; // новая буква — прозрачная снизу
                        }
                        charAlpha = na; charOffY = no;
                    } else if (cur.length() < charAlpha.length) {
                        charAlpha = Arrays.copyOf(charAlpha, cur.length());
                        charOffY  = Arrays.copyOf(charOffY,  cur.length());
                    }
                    // Анимируем каждую букву
                    for (int i = 0; i < charAlpha.length; i++) {
                        charAlpha[i] = Math.min(1f, charAlpha[i] + 0.12f);
                        charOffY[i]  = Math.max(0f, charOffY[i]  - 0.8f);
                    }
                } else {
                    charAlpha = new float[0]; charOffY = new float[0];
                }
            }
            repaint();
        });
        anim.start();

        if (pw) {
            pf = new JPasswordField();
            pf.setBounds(16, 15, 300, 22); style(pf); pf.setEchoChar('\u25cf'); add(pf);
            pf.addFocusListener(new FocusAdapter() {
                public void focusGained(FocusEvent e) { focused = true; }
                public void focusLost(FocusEvent e)   { focused = false; }
            });
            JPanel eye = new JPanel(null) {
                boolean show = false;
                { setOpaque(false); setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
                  addMouseListener(new MouseAdapter() {
                    public void mouseClicked(MouseEvent e) { show=!show; pf.setEchoChar(show?(char)0:'\u25cf'); repaint(); }
                  });
                }
                protected void paintComponent(Graphics g) {
                    Graphics2D g2 = (Graphics2D)g;
                    g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    int cx = getWidth()/2, cy = getHeight()/2;
                    g2.setColor(show ? new Color(130,110,255) : new Color(100,100,130));
                    g2.setStroke(new BasicStroke(1.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                    g2.drawArc(cx-6, cy-4, 13, 9, 0, 180);
                    g2.drawArc(cx-6, cy-4, 13, 9, 180, 180);
                    g2.fillOval(cx-2, cy-2, 5, 5);
                    if (!show) { g2.drawLine(cx-7, cy+5, cx+7, cy-5); }
                }
            };
            eye.setBounds(322, 10, 26, 26); add(eye);
        } else {
            tf = new JTextField();
            // Делаем поле прозрачным — рисуем текст сами
            tf.setBounds(16, 15, 340, 22); style(tf);
            tf.setForeground(new Color(0,0,0,0)); // прозрачный — рисуем сами
            tf.setCaretColor(new Color(130,110,255));
            tf.setForeground(new Color(100,100,125));
            tf.setText(ph);
            tf.addFocusListener(new FocusAdapter() {
                public void focusGained(FocusEvent e) {
                    focused = true;
                    if (tf.getText().equals(ph)) {
                        tf.setText(""); tf.setForeground(Color.WHITE);
                        charAlpha = new float[0]; charOffY = new float[0];
                    }
                }
                public void focusLost(FocusEvent e) {
                    focused = false;
                    if (tf.getText().isEmpty()) {
                        tf.setText(ph); tf.setForeground(new Color(100,100,125));
                        charAlpha = new float[0]; charOffY = new float[0];
                    }
                }
            });
            add(tf);
        }
    }

    private void style(JTextComponent c) {
        c.setBackground(new Color(0,0,0,0)); c.setForeground(Color.WHITE);
        c.setCaretColor(new Color(130,110,255)); c.setBorder(null); c.setOpaque(false);
        c.setFont(new Font("Segoe UI", Font.PLAIN, 13));
    }

    String val() {
        if (isPw) return new String(pf.getPassword());
        String t = tf.getText();
        return t.equals(ph) ? "" : t;
    }

    void addAL(ActionListener l) { if (isPw) pf.addActionListener(l); else tf.addActionListener(l); }

    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D)g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        int w = getWidth(), h = getHeight();

        // Фон
        g2.setColor(new Color(24, 24, 36));
        g2.fillRoundRect(0, 0, w, h, 18, 18);

        // Граница
        Color bc = fa > 0.05f
            ? new Color(90, 80, 200, (int)(140 + fa * 115))
            : new Color(50, 50, 70, 160);
        g2.setColor(bc); g2.setStroke(new BasicStroke(1.2f));
        g2.drawRoundRect(0, 0, w-1, h-1, 18, 18);

        // Анимированный текст для текстового поля
        if (!isPw && tf != null) {
            String cur = tf.getText();
            if (cur.equals(ph) || cur.isEmpty()) {
                // Placeholder
                g2.setColor(new Color(100, 100, 125));
                g2.setFont(new Font("Segoe UI", Font.PLAIN, 13));
                g2.drawString(ph, 16, h/2 + 5);
                tf.setForeground(new Color(0,0,0,0)); // скрываем нативный текст
            } else {
                // Рисуем каждую букву с анимацией
                tf.setForeground(new Color(0,0,0,0)); // скрываем нативный
                Font f = new Font("Segoe UI", Font.PLAIN, 13);
                g2.setFont(f);
                FontMetrics fm = g2.getFontMetrics();
                int x = 16;
                for (int i = 0; i < cur.length(); i++) {
                    float alpha = i < charAlpha.length ? charAlpha[i] : 1f;
                    float offY  = i < charOffY.length  ? charOffY[i]  : 0f;
                    int a = (int)(alpha * 255);
                    g2.setColor(new Color(255, 255, 255, Math.min(255, a)));
                    g2.drawString(String.valueOf(cur.charAt(i)), x, (int)(h/2 + 5 + offY));
                    x += fm.charWidth(cur.charAt(i));
                }
            }
        }

        // Placeholder для пароля
        if (isPw && pf != null && pf.getPassword().length == 0 && !focused) {
            g2.setColor(new Color(100, 100, 125));
            g2.setFont(new Font("Segoe UI", Font.PLAIN, 13));
            g2.drawString(ph, 16, h/2 + 5);
        }

        super.paintComponent(g);
    }
}

// ── Кнопка ────────────────────────────────────────────────────────────────────
class TDBtn extends JButton {
    private float hov=0f; private final Timer t; private final Color c1,c2;
    TDBtn(String txt, Color col1, Color col2){
        super(txt); c1=col1; c2=col2;
        setOpaque(false);setContentAreaFilled(false);setBorderPainted(false);
        setForeground(Color.WHITE);setFont(new Font("Segoe UI",Font.BOLD,14));
        setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));setFocusPainted(false);
        t=new Timer(16,e->repaint());t.start();
        addMouseListener(new MouseAdapter(){
            public void mouseEntered(MouseEvent e){hov=Math.min(1f,hov+0.12f);}
            public void mouseExited(MouseEvent e){hov=Math.max(0f,hov-0.12f);}
        });
    }
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g; g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        int w=getWidth(),h=getHeight();
        if(!isEnabled()){g2.setColor(new Color(50,50,70));g2.fillRoundRect(0,0,w,h,h,h);super.paintComponent(g);return;}
        if(hov>0.01f){for(int i=4;i>0;i--){g2.setColor(new Color(c1.getRed(),c1.getGreen(),c1.getBlue(),(int)(hov*10*(5-i)/4f)));g2.fillRoundRect(-i,-i+2,w+i*2,h+i*2,h+i*2,h+i*2);}}
        int r1=(int)(c1.getRed()+hov*15),g1=(int)(c1.getGreen()+hov*15),b1=(int)(c1.getBlue()+hov*15);
        int r2=(int)(c2.getRed()+hov*15),g2c=(int)(c2.getGreen()+hov*15),b2=(int)(c2.getBlue()+hov*15);
        g2.setPaint(new GradientPaint(0,0,new Color(Math.min(255,r1),Math.min(255,g1),Math.min(255,b1)),w,0,new Color(Math.min(255,r2),Math.min(255,g2c),Math.min(255,b2))));
        g2.fillRoundRect(0,0,w,h,h,h);
        g2.setPaint(new GradientPaint(0,0,new Color(255,255,255,20),0,h/2,new Color(255,255,255,0)));
        g2.fillRoundRect(0,0,w,h/2,h,h);
        super.paintComponent(g);
    }
}

// ── Прогресс ──────────────────────────────────────────────────────────────────
class TDProgress extends JPanel {
    private float progress=-1f,spin=0f; private final Timer t;
    TDProgress(){setOpaque(false);t=new Timer(16,e->{spin=(spin+5f)%360f;repaint();});t.start();}
    void setProgress(float p){this.progress=p;repaint();}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g; g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        int w=getWidth(),h=getHeight();
        g2.setPaint(new GradientPaint(0,0,TheDayLauncher.ACCENT,w,0,TheDayLauncher.ACCENT2));
        g2.fillRoundRect(0,0,w,h,12,12);
        if(progress>0){g2.setColor(new Color(255,255,255,30));g2.fillRoundRect(0,0,(int)(w*progress),h,12,12);}
        int cx=w/2,cy=h/2,r=10;
        g2.setStroke(new BasicStroke(2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND));
        g2.setColor(new Color(255,255,255,50));g2.drawOval(cx-r,cy-r,r*2,r*2);
        g2.setColor(Color.WHITE);g2.drawArc(cx-r,cy-r,r*2,r*2,(int)spin,110);
    }
}

// ── Спиннер ───────────────────────────────────────────────────────────────────
class TDSpinner extends JPanel {
    private float angle=0f,dot=0f; private final String msg; private final Timer t;
    TDSpinner(String m){msg=m;setOpaque(false);t=new Timer(16,e->{angle=(angle+4f)%360f;dot+=0.05f;repaint();});t.start();}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g; g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        int cx=getWidth()/2,cy=getHeight()/2-10,r=16;
        g2.setStroke(new BasicStroke(2.5f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND));
        g2.setColor(new Color(55,55,80,80));g2.drawOval(cx-r,cy-r,r*2,r*2);
        g2.setColor(TheDayLauncher.PURPLE2);g2.drawArc(cx-r,cy-r,r*2,r*2,(int)angle,110);
        g2.setFont(new Font("Segoe UI",Font.PLAIN,12));g2.setColor(TheDayLauncher.GREY);
        String txt=msg+".".repeat((int)(dot%4));FontMetrics fm=g2.getFontMetrics();
        g2.drawString(txt,cx-fm.stringWidth(txt)/2,cy+r+20);
    }
}

// ── Аватар ────────────────────────────────────────────────────────────────────
class TDAvatar extends JLabel {
    private BufferedImage img; private final int sz;
    TDAvatar(String b64,int s){sz=s;if(b64!=null&&!b64.isEmpty()){try{String d=b64;int c=d.indexOf(',');if(c>=0)d=d.substring(c+1);img=ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(d)));}catch(Exception e){}}}
    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setClip(new Ellipse2D.Float(0,0,sz,sz));
        if(img!=null){g2.drawImage(img,0,0,sz,sz,null);}
        else{g2.setColor(TheDayLauncher.PURPLE);g2.fillOval(0,0,sz,sz);g2.setColor(Color.WHITE);g2.setFont(new Font("Segoe UI",Font.BOLD,sz/2));FontMetrics fm=g2.getFontMetrics();String ini=TheDayLauncher.username.isEmpty()?"?":String.valueOf(TheDayLauncher.username.charAt(0)).toUpperCase();g2.drawString(ini,(sz-fm.stringWidth(ini))/2,(sz-fm.getHeight())/2+fm.getAscent());}
    }
}

// ── Превью клиента — Minecraft пейзаж с шейдерами ───────────────────────────
class PreviewPanel extends JPanel {
    private float t2=0f; private final Timer timer;
    private BufferedImage photo = null;
    private static final Color ACC = new Color(135,206,235);

    PreviewPanel(){
        setOpaque(false);
        try {
            java.io.InputStream is = getClass().getResourceAsStream("/preview.jpg");
            if (is == null) is = getClass().getResourceAsStream("preview.jpg");
            if (is == null) { java.io.File f = new java.io.File("src/preview.jpg"); if(f.exists()) is = new java.io.FileInputStream(f); }
            if (is == null) { java.io.File f = new java.io.File("preview.jpg"); if(f.exists()) is = new java.io.FileInputStream(f); }
            if (is != null) { photo = ImageIO.read(is); is.close(); }
        } catch(Exception ignored){}
        timer=new Timer(16,e->{t2+=0.016f;repaint();});timer.start();
    }

    protected void paintComponent(Graphics g){
        Graphics2D g2=(Graphics2D)g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY);
        int w=getWidth(),h=getHeight();

        java.awt.Shape clip = new RoundRectangle2D.Float(0,0,w,h,24,24);
        g2.setClip(clip);

        if (photo != null) {
            double sw=(double)w/photo.getWidth(), sh=(double)h/photo.getHeight();
            double sc=Math.max(sw,sh);
            int dw=(int)(photo.getWidth()*sc), dh=(int)(photo.getHeight()*sc);
            g2.drawImage(photo,(w-dw)/2,(h-dh)/2,dw,dh,null);
            g2.setColor(new Color(0,0,0,70)); g2.fillRect(0,0,w,h);
            GradientPaint fade=new GradientPaint(0,h-80,new Color(0,0,0,0),0,h,new Color(10,10,15,220));
            g2.setPaint(fade); g2.fillRect(0,h-80,w,80);
        } else {
            drawMinecraftScene(g2,w,h);
        }
        drawHUD(g2,w,h);

        g2.setClip(null);
        g2.setColor(new Color(135,206,235,20));
        g2.setStroke(new BasicStroke(1f));
        g2.draw(clip);
    }

    private void drawMinecraftScene(Graphics2D g2, int w, int h) {
        GradientPaint sky=new GradientPaint(0,0,new Color(130,180,225),0,(int)(h*0.5f),new Color(190,215,240));
        g2.setPaint(sky); g2.fillRect(0,0,w,h);

        GradientPaint haze=new GradientPaint(0,(int)(h*0.35f),new Color(220,210,195,0),0,(int)(h*0.55f),new Color(200,190,175,70));
        g2.setPaint(haze); g2.fillRect(0,(int)(h*0.35f),w,(int)(h*0.2f));

        drawCloud(g2,(int)(w*0.05f),(int)(h*0.06f),90,28,215);
        drawCloud(g2,(int)(w*0.38f),(int)(h*0.04f),120,32,200);
        drawCloud(g2,(int)(w*0.72f),(int)(h*0.08f),80,24,205);
        drawCloud(g2,(int)(w*0.85f),(int)(h*0.02f),60,20,185);

        g2.setColor(new Color(125,158,88,190));
        int[]fhx={0,(int)(w*0.1f),(int)(w*0.25f),(int)(w*0.4f),(int)(w*0.55f),(int)(w*0.7f),(int)(w*0.85f),w,w,0};
        int[]fhy={(int)(h*0.52f),(int)(h*0.38f),(int)(h*0.46f),(int)(h*0.34f),(int)(h*0.42f),(int)(h*0.36f),(int)(h*0.44f),(int)(h*0.50f),h,h};
        g2.fillPolygon(fhx,fhy,10);

        GradientPaint mh=new GradientPaint(0,(int)(h*0.42f),new Color(95,138,62),0,(int)(h*0.62f),new Color(72,112,42));
        g2.setPaint(mh);
        int[]mhx={0,(int)(w*0.15f),(int)(w*0.3f),(int)(w*0.48f),(int)(w*0.62f),(int)(w*0.78f),(int)(w*0.9f),w,w,0};
        int[]mhy={(int)(h*0.60f),(int)(h*0.46f),(int)(h*0.54f),(int)(h*0.42f),(int)(h*0.50f),(int)(h*0.44f),(int)(h*0.52f),(int)(h*0.58f),h,h};
        g2.fillPolygon(mhx,mhy,10);

        GradientPaint nh=new GradientPaint(0,(int)(h*0.55f),new Color(82,122,48),0,h,new Color(58,92,32));
        g2.setPaint(nh);
        int[]nhx={0,(int)(w*0.2f),(int)(w*0.38f),(int)(w*0.55f),(int)(w*0.72f),(int)(w*0.88f),w,w,0};
        int[]nhy={(int)(h*0.72f),(int)(h*0.58f),(int)(h*0.65f),(int)(h*0.56f),(int)(h*0.62f),(int)(h*0.68f),(int)(h*0.74f),h,h};
        g2.fillPolygon(nhx,nhy,9);

        GradientPaint ground=new GradientPaint(0,(int)(h*0.72f),new Color(78,112,44),0,h,new Color(52,82,28));
        g2.setPaint(ground); g2.fillRect(0,(int)(h*0.72f),w,h);

        drawMCHouse(g2,(int)(w*0.08f),(int)(h*0.52f),70,58,t2);
        drawMCHouse(g2,(int)(w*0.28f),(int)(h*0.48f),85,65,t2+1.2f);
        drawMCHouse(g2,(int)(w*0.52f),(int)(h*0.50f),75,60,t2+0.6f);
        drawMCHouse(g2,(int)(w*0.72f),(int)(h*0.54f),65,52,t2+1.8f);
        drawMCHouse(g2,(int)(w*0.88f),(int)(h*0.56f),55,45,t2+0.9f);

        drawMCTree(g2,(int)(w*0.02f),(int)(h*0.60f),22);
        drawMCTree(g2,(int)(w*0.18f),(int)(h*0.62f),28);
        drawMCTree(g2,(int)(w*0.40f),(int)(h*0.64f),24);
        drawMCTree(g2,(int)(w*0.60f),(int)(h*0.63f),26);
        drawMCTree(g2,(int)(w*0.78f),(int)(h*0.61f),22);
        drawMCTree(g2,(int)(w*0.94f),(int)(h*0.62f),20);

        RadialGradientPaint sun=new RadialGradientPaint(
            new Point2D.Float(w*0.75f,h*0.1f),w*0.6f,
            new float[]{0f,0.5f,1f},
            new Color[]{new Color(255,220,150,38),new Color(255,200,100,12),new Color(0,0,0,0)});
        g2.setPaint(sun); g2.fillRect(0,0,w,h);

        GradientPaint dark=new GradientPaint(0,h-100,new Color(0,0,0,0),0,h,new Color(10,10,15,170));
        g2.setPaint(dark); g2.fillRect(0,h-100,w,100);
    }

    private void drawCloud(Graphics2D g2,int x,int y,int cw,int ch,int alpha){
        g2.setColor(new Color(255,255,255,alpha));
        g2.fillOval(x,y+ch/3,cw/2,ch*2/3);
        g2.fillOval(x+cw/4,y,cw/2,ch);
        g2.fillOval(x+cw/2,y+ch/4,cw/2,ch*3/4);
        g2.fillOval(x+cw/3,y+ch/5,cw*2/5,ch*4/5);
    }

    private void drawMCHouse(Graphics2D g2,int x,int y,int bw,int bh,float phase){
        g2.setColor(new Color(152,138,112));
        g2.fillRect(x,y+bh/3,bw,bh*2/3);
        g2.setColor(new Color(118,106,86,110));
        for(int i=1;i<3;i++) g2.drawLine(x,y+bh/3+i*(bh*2/3/3),x+bw,y+bh/3+i*(bh*2/3/3));
        for(int i=1;i<4;i++) g2.drawLine(x+i*(bw/4),y+bh/3,x+i*(bw/4),y+bh);
        g2.setColor(new Color(72,68,78));
        int[]rx={x-5,x+bw/2,x+bw+5};
        int[]ry={y+bh/3,y,y+bh/3};
        g2.fillPolygon(rx,ry,3);
        g2.setColor(new Color(52,50,58,140));
        g2.setStroke(new BasicStroke(0.7f));
        for(int i=1;i<4;i++){
            int lx2=x-5+(x+bw+5-(x-5))*i/4;
            int ly2=y+bh/3+(y-(y+bh/3))*i/4;
            g2.drawLine(lx2,ly2,x+bw/2,y);
        }
        g2.setStroke(new BasicStroke(1f));
        float glow=(float)(0.7+0.3*Math.sin(phase*0.5));
        g2.setColor(new Color(255,218,115,(int)(155*glow)));
        g2.fillRect(x+bw/5,y+bh/2,bw/4,bh/5);
        g2.setColor(new Color(98,72,42));
        g2.fillRect(x+bw*3/8,y+bh*3/4,bw/5,bh/4+1);
        g2.setColor(new Color(108,88,72));
        g2.fillRect(x+bw*3/5,y-bh/8,bw/8,bh/4);
        for(int j=0;j<5;j++){
            float off=(float)(Math.sin(phase*0.7+j)*3);
            int sa=(int)(52-j*10);
            if(sa>0){ g2.setColor(new Color(228,222,218,sa)); g2.fillOval(x+bw*3/5+(int)off-3,y-bh/8-j*7-3,9,9); }
        }
    }

    private void drawMCTree(Graphics2D g2,int x,int y,int r){
        g2.setColor(new Color(98,72,42));
        g2.fillRect(x-3,y,6,r/2+4);
        g2.setColor(new Color(42,108,38));
        g2.fillRect(x-r,y-r*2,r*2,r*2);
        g2.setColor(new Color(52,128,46));
        g2.fillRect(x-r+3,y-r*2-5,r*2-6,r*2-2);
        g2.setColor(new Color(62,142,54));
        g2.fillRect(x-r/2,y-r*2-10,r,r);
    }

    private void drawHUD(Graphics2D g2, int w, int h) {
        g2.setFont(new Font("Segoe UI",Font.BOLD,11));
        g2.setColor(new Color(135,206,235,230));
        g2.drawString("TheDay",8,17);
        g2.setFont(new Font("Segoe UI",Font.PLAIN,9));
        g2.setColor(new Color(135,206,235,140));
        g2.drawString("v1.2 | 1.21.11",8,28);

        String[]mods={"KillAura","Velocity","Criticals","Sprint","ESP","FullBright"};
        for(int i=0;i<mods.length;i++){
            g2.setFont(new Font("Segoe UI",Font.BOLD,8));
            FontMetrics fm=g2.getFontMetrics();
            int mw=fm.stringWidth(mods[i]);
            float pulse=(float)(0.88+0.12*Math.sin(t2*0.5+i*0.6));
            g2.setColor(new Color(135,206,235,(int)(210*pulse)));
            g2.fillRect(w-mw-9,4+i*12,2,9);
            g2.setColor(new Color(226,232,240,(int)(215*pulse)));
            g2.drawString(mods[i],w-mw-6,13+i*12);
        }

        int fps=(int)(248+Math.sin(t2*0.25)*8);
        g2.setFont(new Font("Segoe UI",Font.PLAIN,8));
        g2.setColor(new Color(135,206,235,190));
        g2.drawString(fps+" FPS",8,h-22);

        int cx=w/2,cy=(int)(h*0.40f);
        g2.setColor(new Color(255,255,255,210));
        g2.setStroke(new BasicStroke(1f));
        g2.drawLine(cx-5,cy,cx-2,cy); g2.drawLine(cx+2,cy,cx+5,cy);
        g2.drawLine(cx,cy-5,cx,cy-2); g2.drawLine(cx,cy+2,cx,cy+5);

        float[][]boxes={{0.30f,0.20f,0.12f,0.28f},{0.55f,0.28f,0.10f,0.24f},{0.72f,0.35f,0.09f,0.22f}};
        String[]names={"Player_1","xXx_Pro","Notch"};
        Color[]ec={new Color(135,206,235),new Color(79,195,247),new Color(203,213,225)};
        for(int i=0;i<boxes.length;i++){
            float bx=boxes[i][0]*w,by=boxes[i][1]*h,bw2=boxes[i][2]*w,bh2=boxes[i][3]*h;
            float pulse=(float)(0.75+0.25*Math.sin(t2*1.0+i*1.8));
            g2.setColor(new Color(ec[i].getRed(),ec[i].getGreen(),ec[i].getBlue(),(int)(160*pulse)));
            g2.setStroke(new BasicStroke(1.2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND));
            int cs=5;
            g2.drawLine((int)bx,(int)(by+cs),(int)bx,(int)by);g2.drawLine((int)bx,(int)by,(int)(bx+cs),(int)by);
            g2.drawLine((int)(bx+bw2-cs),(int)by,(int)(bx+bw2),(int)by);g2.drawLine((int)(bx+bw2),(int)by,(int)(bx+bw2),(int)(by+cs));
            g2.drawLine((int)bx,(int)(by+bh2-cs),(int)bx,(int)(by+bh2));g2.drawLine((int)bx,(int)(by+bh2),(int)(bx+cs),(int)(by+bh2));
            g2.drawLine((int)(bx+bw2-cs),(int)(by+bh2),(int)(bx+bw2),(int)(by+bh2));g2.drawLine((int)(bx+bw2),(int)(by+bh2-cs),(int)(bx+bw2),(int)(by+bh2));
            g2.setColor(new Color(0,0,0,110));g2.fillRect((int)bx-1,(int)(by-6),(int)bw2+2,4);
            float hp=(float)(0.65+0.3*Math.sin(t2*0.18+i));
            g2.setColor(new Color(135,206,235,(int)(200*pulse)));
            g2.fillRect((int)bx,(int)(by-5),(int)(bw2*hp),2);
            g2.setFont(new Font("Segoe UI",Font.BOLD,7));
            g2.setColor(new Color(226,232,240,(int)(195*pulse)));
            g2.drawString(names[i],(int)bx,(int)(by-8));
        }

        int hbW=9*20,hbX=(w-hbW)/2,hbY=h-20;
        for(int i=0;i<9;i++){
            boolean sel=i==3;
            g2.setColor(sel?new Color(135,206,235,45):new Color(0,0,0,65));
            g2.fillRoundRect(hbX+i*20,hbY,18,16,3,3);
            g2.setColor(sel?new Color(135,206,235,190):new Color(135,206,235,35));
            g2.setStroke(new BasicStroke(sel?1.3f:0.6f));
            g2.drawRoundRect(hbX+i*20,hbY,18,16,3,3);
        }
    }
}

