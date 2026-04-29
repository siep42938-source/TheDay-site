import javax.swing.*;
import javax.swing.Timer;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.awt.image.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.List;
import java.util.ArrayList;
import javax.imageio.ImageIO;
import javax.swing.text.JTextComponent;

public class TheDayLauncher {

    // ── Константы ─────────────────────────────────────────────────────────────
    static final String MOD_JAR    = "TheDay-1.0.01.jar";
    static final String MOD_URL    = "https://theday-site.pages.dev/TheDay-1.0.01.jar";
    static final String MC_VERSION = "1.21.11";
    static final String FABRIC_VER = "0.18.4";

    // Папка клиента на диске C
    static final String CLIENT_DIR         = "C:\\TheDay";
    static final String CLIENT_MODS        = CLIENT_DIR + "\\mods";
    static final String CLIENT_CONFIGS     = CLIENT_DIR + "\\configs";
    static final String CLIENT_LOGS        = CLIENT_DIR + "\\logs";
    static final String CLIENT_SAVES       = CLIENT_DIR + "\\saves";
    static final String CLIENT_SCREENSHOTS = CLIENT_DIR + "\\screenshots";
    static final String CLIENT_LIBS        = CLIENT_DIR + "\\libraries";
    static final String CLIENT_VERSIONS    = CLIENT_DIR + "\\versions";
    static final String CLIENT_ASSETS      = CLIENT_DIR + "\\assets";
    static final String CLIENT_NATIVES     = CLIENT_DIR + "\\natives";

    // Mojang API
    static final String MC_MANIFEST_URL =
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
    // Fabric meta
    static final String FABRIC_LOADER_URL =
        "https://meta.fabricmc.net/v2/versions/loader/" + MC_VERSION + "/" + FABRIC_VER + "/profile/json";

    // Цвета
    static final Color WHITE  = Color.WHITE;
    static final Color GREY   = new Color(160, 160, 170);
    static final Color GREY2  = new Color(100, 100, 110);
    static final Color ERR    = new Color(255, 80, 80);
    static final Color ACCENT  = new Color(135, 206, 235);
    static final Color ACCENT2 = new Color(79, 195, 247);
    static final Color PURPLE  = new Color(90, 80, 210);
    static final Color PURPLE2 = new Color(120, 100, 255);

    static JFrame frame;
    static float  fadeIn  = 0f;
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
            showMain();
            frame.setVisible(true);
            try { frame.setShape(new RoundRectangle2D.Double(0,0,frame.getWidth(),frame.getHeight(),24,24)); } catch(Exception ignored){}
        });
    }

    // ── Главный экран ─────────────────────────────────────────────────────────
    static void showMain() {
        frame.setSize(780, 440);
        frame.setLocationRelativeTo(null);
        JPanel p = makeMainBase(780, 440);
        int W = 780, lx = 28, lw = 330;

        // X кнопка
        JLabel x = new JLabel("\u00d7");
        x.setForeground(new Color(100,120,140)); x.setFont(new Font("Segoe UI",Font.PLAIN,20));
        x.setBounds(W-36,10,26,26); x.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        x.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){System.exit(0);}
            public void mouseEntered(MouseEvent e){x.setForeground(new Color(226,232,240));}
            public void mouseExited(MouseEvent e){x.setForeground(new Color(100,120,140));}
        }); p.add(x);

        // Заголовок
        JLabel title = new JLabel("TheDay Client");
        title.setForeground(new Color(226,232,240));
        title.setFont(new Font("Segoe UI",Font.BOLD,15));
        title.setBounds(lx,13,200,20); p.add(title);

        JLabel ver = new JLabel("1.21.11");
        ver.setForeground(new Color(135,206,235,180));
        ver.setFont(new Font("Segoe UI",Font.PLAIN,11));
        ver.setBounds(lx+130,15,60,16); p.add(ver);

        JSeparator sep0 = new JSeparator();
        sep0.setForeground(new Color(135,206,235,15));
        sep0.setBounds(0,42,390,1); p.add(sep0);

        // Описание
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

        // Кнопка запуска
        TDBtn launch = new TDBtn("Запустить  \u25ba", new Color(135,206,235), new Color(79,195,247));
        launch.setBounds(lx,172,lw,44); p.add(launch);

        TDProgress pb = new TDProgress();
        pb.setBounds(lx,172,lw,44); pb.setVisible(false); p.add(pb);

        // Статус
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
        statusTxt.setBounds(lx+16,226,280,18); p.add(statusTxt);

        // Превью справа
        PreviewPanel preview = new PreviewPanel();
        preview.setBounds(385,0,395,440); p.add(preview);

        launch.addActionListener(e -> {
            launch.setVisible(false); pb.setVisible(true);
            statusTxt.setText("Подготовка...");
            new Thread(() -> launchClient(pb, statusTxt, launch)).start();
        });

        frame.setContentPane(p); frame.revalidate(); frame.repaint();
        SwingUtilities.invokeLater(() -> {
            try { frame.setShape(new RoundRectangle2D.Double(0,0,frame.getWidth(),frame.getHeight(),24,24)); } catch(Exception ignored){}
        });
    }

    // ── Запуск клиента ────────────────────────────────────────────────────────
    static void launchClient(TDProgress pb, JLabel statusTxt, TDBtn launch) {
        try {
            // ── Шаг 1: Создаём C:\TheDay\ ─────────────────────────────────
            status(statusTxt, "Создание папки клиента...");
            pb.setProgress(0.02f);
            for (String d : new String[]{
                CLIENT_DIR, CLIENT_MODS, CLIENT_CONFIGS, CLIENT_LOGS,
                CLIENT_SAVES, CLIENT_SCREENSHOTS, CLIENT_LIBS,
                CLIENT_VERSIONS, CLIENT_ASSETS, CLIENT_NATIVES
            }) new File(d).mkdirs();

            File opts = new File(CLIENT_DIR, "options.txt");
            if (!opts.exists()) {
                try (PrintWriter pw = new PrintWriter(opts)) {
                    pw.println("version:3953");
                    pw.println("autoJump:false");
                    pw.println("fov:0.0");
                    pw.println("renderDistance:12");
                    pw.println("guiScale:3");
                    pw.println("lang:ru_ru");
                    pw.println("tutorialStep:none");
                }
            }

            // ── Шаг 2: Мод ────────────────────────────────────────────────
            status(statusTxt, "Проверка мода...");
            pb.setProgress(0.05f);
            File modFile = new File(CLIENT_MODS, MOD_JAR);
            if (!modFile.exists()) {
                File local = null;
                try {
                    File dir = new File(TheDayLauncher.class
                        .getProtectionDomain().getCodeSource().getLocation().toURI()).getParentFile();
                    File f = new File(dir, MOD_JAR);
                    if (f.exists()) local = f;
                } catch (Exception ignored) {}
                if (local != null) {
                    Files.copy(local.toPath(), modFile.toPath(),
                        java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                } else {
                    download(MOD_URL, modFile, pct ->
                        SwingUtilities.invokeLater(() -> {
                            statusTxt.setText("Скачиваем мод... " + pct + "%");
                            pb.setProgress(0.05f + pct / 100f * 0.05f);
                        }));
                }
            }

            // ── Шаг 3: Fabric profile JSON ────────────────────────────────
            status(statusTxt, "Получаем Fabric профиль...");
            pb.setProgress(0.10f);
            File fabricJsonFile = new File(CLIENT_VERSIONS, "fabric-" + MC_VERSION + ".json");
            // Удаляем старые JSON от других версий
            File[] oldJsons = new File(CLIENT_VERSIONS).listFiles(
                (d, n) -> n.endsWith(".json") && !n.equals("fabric-" + MC_VERSION + ".json") && !n.equals(MC_VERSION + ".json"));
            if (oldJsons != null) for (File f : oldJsons) f.delete();
            if (!fabricJsonFile.exists()) {
                download(FABRIC_LOADER_URL, fabricJsonFile, null);
            }
            String fabricJson = new String(Files.readAllBytes(fabricJsonFile.toPath()));

            // ── Шаг 4: Minecraft version JSON ─────────────────────────────
            status(statusTxt, "Получаем версию Minecraft...");
            pb.setProgress(0.13f);
            File mcJsonFile = new File(CLIENT_VERSIONS, MC_VERSION + ".json");
            if (!mcJsonFile.exists()) {
                File manifest = new File(CLIENT_DIR, "version_manifest.json");
                download(MC_MANIFEST_URL, manifest, null);
                String mf = new String(Files.readAllBytes(manifest.toPath()));
                String vUrl = extractVersionUrl(mf, MC_VERSION);
                if (vUrl == null) throw new Exception("Версия " + MC_VERSION + " не найдена");
                download(vUrl, mcJsonFile, null);
            }
            String mcJson = new String(Files.readAllBytes(mcJsonFile.toPath()));

            // ── Шаг 5: Minecraft client.jar ───────────────────────────────
            status(statusTxt, "Скачиваем Minecraft...");
            pb.setProgress(0.15f);
            File mcJar = new File(CLIENT_VERSIONS, MC_VERSION + ".jar");
            if (!mcJar.exists()) {
                String cUrl = extractClientUrl(mcJson);
                if (cUrl == null) throw new Exception("Не найден client jar URL");
                download(cUrl, mcJar, pct ->
                    SwingUtilities.invokeLater(() -> {
                        statusTxt.setText("Скачиваем Minecraft... " + pct + "%");
                        pb.setProgress(0.15f + pct / 100f * 0.20f);
                    }));
            }

            // ── Шаг 6: Библиотеки ─────────────────────────────────────────
            status(statusTxt, "Скачиваем библиотеки...");
            pb.setProgress(0.35f);
            List<String> classpath = new ArrayList<>();
            classpath.add(mcJar.getAbsolutePath());
            downloadLibraries(mcJson, CLIENT_LIBS, classpath,
                (done, total) -> SwingUtilities.invokeLater(() -> {
                    statusTxt.setText("Библиотеки: " + done + "/" + total);
                    pb.setProgress(0.35f + (float) done / Math.max(total,1) * 0.15f);
                }));
            downloadLibraries(fabricJson, CLIENT_LIBS, classpath,
                (done, total) -> SwingUtilities.invokeLater(() -> {
                    statusTxt.setText("Fabric libs: " + done + "/" + total);
                    pb.setProgress(0.50f + (float) done / Math.max(total,1) * 0.10f);
                }));
            // Добавляем мод в classpath
            classpath.add(modFile.getAbsolutePath());

            // ── Шаг 7: Assets ─────────────────────────────────────────────
            status(statusTxt, "Скачиваем ресурсы...");
            pb.setProgress(0.60f);
            String assetIndex = extractAssetIndex(mcJson);
            String assetIndexUrl = extractAssetIndexUrl(mcJson);
            File assetIndexDir = new File(CLIENT_ASSETS, "indexes");
            assetIndexDir.mkdirs();
            File assetIndexFile = new File(assetIndexDir, assetIndex + ".json");
            if (!assetIndexFile.exists() && assetIndexUrl != null) {
                download(assetIndexUrl, assetIndexFile, null);
            }
            if (assetIndexFile.exists()) {
                downloadAssets(assetIndexFile, CLIENT_ASSETS,
                    (done, total) -> SwingUtilities.invokeLater(() -> {
                        statusTxt.setText("Ресурсы: " + done + "/" + total);
                        pb.setProgress(0.60f + (float) done / Math.max(total,1) * 0.25f);
                    }));
            }

            // ── Шаг 8: Запуск ─────────────────────────────────────────────
            status(statusTxt, "Запуск...");
            pb.setProgress(0.90f);
            Thread.sleep(300);

            String mainClass = extractMainClass(fabricJson);
            if (mainClass == null) mainClass = "net.minecraft.client.main.Main";
            String cp = String.join(File.pathSeparator, classpath);

            List<String> cmd = new ArrayList<>();
            cmd.add(findJava());
            cmd.add("-Xmx2G"); cmd.add("-Xms512M");
            cmd.add("-XX:+UseG1GC");
            cmd.add("-Djava.library.path=" + CLIENT_NATIVES);
            cmd.add("-cp"); cmd.add(cp);
            cmd.add(mainClass);
            cmd.add("--gameDir");    cmd.add(CLIENT_DIR);
            cmd.add("--assetsDir");  cmd.add(CLIENT_ASSETS);
            cmd.add("--assetIndex"); cmd.add(assetIndex);
            cmd.add("--version");    cmd.add("fabric-" + MC_VERSION);
            cmd.add("--accessToken"); cmd.add("0");
            cmd.add("--userType");   cmd.add("legacy");
            cmd.add("--username");   cmd.add("Player");

            Process proc = new ProcessBuilder(cmd)
                .directory(new File(CLIENT_DIR))
                .redirectErrorStream(true)
                .start();
            new Thread(() -> {
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(proc.getInputStream()))) {
                    String line;
                    while ((line = br.readLine()) != null)
                        System.out.println("[MC] " + line);
                } catch (Exception ignored) {}
            }).start();

            pb.setProgress(1f);
            Thread.sleep(1500);
            SwingUtilities.invokeLater(() -> System.exit(0));

        } catch (Exception ex) {
            ex.printStackTrace();
            SwingUtilities.invokeLater(() -> {
                pb.setVisible(false);
                launch.setVisible(true);
                statusTxt.setText("Ошибка: " + ex.getMessage());
            });
        }
    }

    // ── Вспомогательные методы ────────────────────────────────────────────────
    interface ProgressCallback2 { void update(int done, int total); }

    static void downloadLibraries(String json, String libDir,
            List<String> classpath, ProgressCallback2 cb) throws Exception {
        int libStart = json.indexOf("\"libraries\"");
        if (libStart < 0) return;
        int arrStart = json.indexOf('[', libStart);
        int arrEnd   = findArrayEnd(json, arrStart);
        String libArr = json.substring(arrStart + 1, arrEnd);
        List<String[]> libs = parseLibraries(libArr);
        int total = libs.size(), done = 0;
        for (String[] lib : libs) {
            String url = lib[0], path = lib[1];
            if (url == null || url.isEmpty()) { done++; continue; }
            File dest = new File(libDir, path.replace('/', File.separatorChar));
            dest.getParentFile().mkdirs();
            if (!dest.exists()) {
                try { download(url, dest, null); }
                catch (Exception e) { System.out.println("[WARN] skip: " + url); }
            }
            if (dest.exists()) classpath.add(dest.getAbsolutePath());
            done++;
            if (cb != null) cb.update(done, total);
        }
    }

    static List<String[]> parseLibraries(String arr) {
        List<String[]> result = new ArrayList<>();
        int i = 0;
        while (i < arr.length()) {
            int os = arr.indexOf('{', i);
            if (os < 0) break;
            int oe = findObjEnd(arr, os);
            String obj = arr.substring(os, oe + 1);
            if (!obj.contains("\"natives\"") && !obj.contains("\"rules\"")) {
                String url  = extractDeep(obj, "url");
                String path = extractDeep(obj, "path");
                if (url != null && path != null) result.add(new String[]{url, path});
            }
            i = oe + 1;
        }
        return result;
    }

    static void downloadAssets(File indexFile, String assetsDir,
            ProgressCallback2 cb) throws Exception {
        String json = new String(Files.readAllBytes(indexFile.toPath()));
        File objDir = new File(assetsDir, "objects");
        objDir.mkdirs();
        List<String> hashes = parseAssetHashes(json);
        int total = hashes.size(), done = 0;
        for (String hash : hashes) {
            String prefix = hash.substring(0, 2);
            File dest = new File(objDir, prefix + File.separator + hash);
            dest.getParentFile().mkdirs();
            if (!dest.exists()) {
                try { download("https://resources.download.minecraft.net/" + prefix + "/" + hash, dest, null); }
                catch (Exception ignored) {}
            }
            done++;
            if (cb != null && done % 100 == 0) cb.update(done, total);
        }
        if (cb != null) cb.update(total, total);
    }

    static List<String> parseAssetHashes(String json) {
        List<String> result = new ArrayList<>();
        int i = 0;
        while (true) {
            int h = json.indexOf("\"hash\"", i);
            if (h < 0) break;
            int q1 = json.indexOf('"', h + 7);
            int q2 = json.indexOf('"', q1 + 1);
            if (q1 < 0 || q2 < 0) break;
            result.add(json.substring(q1 + 1, q2));
            i = q2 + 1;
        }
        return result;
    }

    static String extractVersionUrl(String json, String version) {
        String search = "\"id\":\"" + version + "\"";
        int idx = json.indexOf(search);
        if (idx < 0) return null;
        int urlIdx = json.indexOf("\"url\"", idx);
        if (urlIdx < 0) return null;
        int q1 = json.indexOf('"', urlIdx + 6);
        int q2 = json.indexOf('"', q1 + 1);
        return json.substring(q1 + 1, q2);
    }

    static String extractClientUrl(String json) {
        int idx = json.indexOf("\"client\"");
        if (idx < 0) return null;
        int urlIdx = json.indexOf("\"url\"", idx);
        if (urlIdx < 0) return null;
        int q1 = json.indexOf('"', urlIdx + 6);
        int q2 = json.indexOf('"', q1 + 1);
        return json.substring(q1 + 1, q2);
    }

    static String extractMainClass(String json) {
        String key = "\"mainClass\"";
        int idx = json.indexOf(key);
        if (idx < 0) return null;
        int q1 = json.indexOf('"', idx + key.length() + 1);
        int q2 = json.indexOf('"', q1 + 1);
        return json.substring(q1 + 1, q2);
    }

    static String extractAssetIndex(String json) {
        int idx = json.indexOf("\"assetIndex\"");
        if (idx < 0) return "1.21";
        int idIdx = json.indexOf("\"id\"", idx);
        if (idIdx < 0) return "1.21";
        int q1 = json.indexOf('"', idIdx + 5);
        int q2 = json.indexOf('"', q1 + 1);
        return json.substring(q1 + 1, q2);
    }

    static String extractAssetIndexUrl(String json) {
        int idx = json.indexOf("\"assetIndex\"");
        if (idx < 0) return null;
        int urlIdx = json.indexOf("\"url\"", idx);
        if (urlIdx < 0) return null;
        int q1 = json.indexOf('"', urlIdx + 6);
        int q2 = json.indexOf('"', q1 + 1);
        return json.substring(q1 + 1, q2);
    }

    static String extractDeep(String json, String key) {
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx + search.length());
        if (colon < 0) return null;
        int q1 = json.indexOf('"', colon + 1);
        if (q1 < 0) return null;
        int q2 = json.indexOf('"', q1 + 1);
        if (q2 < 0) return null;
        return json.substring(q1 + 1, q2);
    }

    static int findArrayEnd(String s, int start) {
        int depth = 0;
        for (int i = start; i < s.length(); i++) {
            if (s.charAt(i) == '[') depth++;
            else if (s.charAt(i) == ']') { depth--; if (depth == 0) return i; }
        }
        return s.length() - 1;
    }

    static int findObjEnd(String s, int start) {
        int depth = 0;
        for (int i = start; i < s.length(); i++) {
            if (s.charAt(i) == '{') depth++;
            else if (s.charAt(i) == '}') { depth--; if (depth == 0) return i; }
        }
        return s.length() - 1;
    }

    static void status(JLabel lbl, String txt) {
        SwingUtilities.invokeLater(() -> lbl.setText(txt));
    }

    static String findJava() {
        String javaHome = System.getProperty("java.home");
        if (javaHome != null) {
            File java = new File(javaHome, "bin\\java.exe");
            if (java.exists()) return java.getAbsolutePath();
        }
        return "java";
    }

    interface DownloadCallback { void update(int pct); }

    static void download(String url, File dest, DownloadCallback cb) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(120000);
        con.setRequestProperty("User-Agent", "TheDay-Launcher/1.2");
        con.setInstanceFollowRedirects(true);
        int total = con.getContentLength();
        try (InputStream in = con.getInputStream();
             FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int read; long done = 0;
            while ((read = in.read(buf)) != -1) {
                out.write(buf, 0, read);
                done += read;
                if (total > 0 && cb != null) cb.update((int)(done * 100 / total));
            }
        }
    }

    static void openBrowser(String u) { try { Desktop.getDesktop().browse(URI.create(u)); } catch (Exception e) {} }

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
        else{g2.setColor(TheDayLauncher.PURPLE);g2.fillOval(0,0,sz,sz);g2.setColor(Color.WHITE);g2.setFont(new Font("Segoe UI",Font.BOLD,sz/2));FontMetrics fm=g2.getFontMetrics();String ini="T";g2.drawString(ini,(sz-fm.stringWidth(ini))/2,(sz-fm.getHeight())/2+fm.getAscent());}
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

