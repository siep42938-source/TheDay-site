import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.awt.image.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.Base64;
import javax.imageio.ImageIO;

public class TheDayLauncher {
    static final String API    = "https://the-day-site-ovk7.vercel.app/api";
    static final String SECRET = "launcher_theday_2026";
    static final String CLIENT_JAR = "TheDay-Client-v1.1.jar";
    static final String CLIENT_URL = "https://github.com/siep42938-source/TheDay-site/releases/download/v1.1/TheDay-Client-v1.1.jar";
    static final String TOKEN_FILE = System.getProperty("user.home") + "/.theday/session.dat";

    static final Color BG       = new Color(13,13,20);
    static final Color FIELD_BG = new Color(28,28,42);
    static final Color BORDER   = new Color(50,50,75);
    static final Color ACCENT   = new Color(100,90,220);
    static final Color ACCENT2  = new Color(130,110,255);
    static final Color WHITE    = new Color(255,255,255);
    static final Color GREY     = new Color(140,140,160);
    static final Color ORANGE   = new Color(255,165,60);
    static final Color ERR      = new Color(255,80,80);

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
        JLabel l = new JLabel(msg, SwingConstants.CENTER);
        l.setForeground(GREY); l.setFont(new Font("Segoe UI",Font.PLAIN,14));
        l.setBounds(0,270,480,30); p.add(l);
        frame.setContentPane(p); frame.revalidate();
    }

    static void showLogin() {
        JPanel p = base();
        addX(p);
        lbl(p,"Авторизация",50,80,380,40,new Font("Segoe UI",Font.BOLD,28),WHITE);
        lbl(p,"Войдите, чтобы попасть в свой профиль",50,125,380,25,new Font("Segoe UI",Font.PLAIN,14),GREY);

        RField email = new RField("Введите ваш логин или почту",false);
        email.setBounds(50,185,380,52); p.add(email);
        RField pass = new RField("Пароль",true);
        pass.setBounds(50,250,380,52); p.add(pass);

        JLabel err = new JLabel(""); err.setForeground(ERR);
        err.setFont(new Font("Segoe UI",Font.PLAIN,12));
        err.setBounds(50,310,380,20); p.add(err);

        GBtn btn = new GBtn("Войти"); btn.setBounds(50,340,380,52); p.add(btn);

        JLabel forgot = new JLabel("Забыли пароль");
        forgot.setForeground(GREY); forgot.setFont(new Font("Segoe UI",Font.PLAIN,13));
        forgot.setBounds(50,410,200,25);
        forgot.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        forgot.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){openBrowser("https://the-day-site.pages.dev/login.html");}
            public void mouseEntered(MouseEvent e){forgot.setForeground(WHITE);}
            public void mouseExited(MouseEvent e){forgot.setForeground(GREY);}
        });
        p.add(forgot);

        ActionListener doLogin = e -> {
            String em = email.val(), pw = pass.val();
            if(em.isEmpty()||pw.isEmpty()){err.setText("Заполните все поля");return;}
            btn.setEnabled(false); btn.setText("Входим..."); err.setText("");
            new Thread(()->{
                String hwid = getHWID();
                AuthResult r = apiPost("/launcher/login",
                    "{\"email\":\""+esc(em)+"\",\"password\":\""+esc(pw)+"\",\"hwid\":\""+esc(hwid)+"\"}");
                SwingUtilities.invokeLater(()->{
                    btn.setEnabled(true); btn.setText("Войти");
                    if(r.ok){saveToken(r.token);token=r.token;username=r.username;
                        role=r.role;sub=r.sub;loadAvatar();showMain();}
                    else err.setText(r.error!=null?r.error:"Ошибка входа");
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
        lbl(p,"Клиент в игре",0,55,480,30,new Font("Segoe UI",Font.BOLD,20),WHITE).setHorizontalAlignment(SwingConstants.CENTER);

        JTextArea desc = new JTextArea(
            "TheDay — это приватный клиент для игры в Minecraft 1.21.11. "+
            "В нашем продукте предоставлена отличная Combat составляющая, "+
            "а так же не плохая Movement составляющая. "+
            "Клиент регулярно обновляется и дополняется, дабы вы в полной мере "+
            "ощутили комфорт в игре Minecraft.");
        desc.setForeground(GREY); desc.setBackground(new Color(0,0,0,0));
        desc.setFont(new Font("Segoe UI",Font.PLAIN,14));
        desc.setLineWrap(true); desc.setWrapStyleWord(true);
        desc.setEditable(false); desc.setOpaque(false);
        desc.setBounds(50,105,380,160); p.add(desc);

        GBtn launch = new GBtn("\u25B6  ЗАПУСТИТЬ");
        launch.setBounds(50,290,380,56); p.add(launch);

        // Прогресс-бар (скрыт по умолчанию)
        ProgressBar pb = new ProgressBar();
        pb.setBounds(50,290,380,56); pb.setVisible(false); p.add(pb);

        // Статус загрузки
        JLabel statusLbl = new JLabel("");
        statusLbl.setForeground(ORANGE);
        statusLbl.setFont(new Font("Segoe UI",Font.PLAIN,13));
        statusLbl.setBounds(50,355,380,20); statusLbl.setVisible(false); p.add(statusLbl);

        launch.addActionListener(e -> {
            launch.setVisible(false);
            pb.setVisible(true);
            statusLbl.setVisible(true);
            new Thread(()->launchClient(pb, statusLbl, launch)).start();
        });

        // Разделитель
        JPanel sep = new JPanel();
        sep.setBackground(BORDER); sep.setBounds(50,385,380,1); p.add(sep);

        // Аватар
        AvatarLabel av = new AvatarLabel(avatarB64,48);
        av.setBounds(50,400,48,48); p.add(av);

        JLabel nick = new JLabel(username);
        nick.setForeground(WHITE); nick.setFont(new Font("Segoe UI",Font.BOLD,15));
        nick.setBounds(112,405,220,20); p.add(nick);

        JLabel roleL = new JLabel(role);
        // Цвет по роли
        Color roleColor;
        switch(role) {
            case "Администратор": case "Admin":    roleColor = new Color(255,80,80);   break;
            case "Developer":     case "Dev":      roleColor = new Color(41,182,246);  break;
            case "Media":         case "Медиа":    roleColor = new Color(206,147,216); break;
            case "Beta":          case "Бета":     roleColor = new Color(255,167,38);  break;
            case "Sponsor":       case "Спонсор":  roleColor = new Color(255,215,0);   break;
            case "Модератор":     case "Moder":    roleColor = new Color(102,187,106); break;
            default:                               roleColor = ORANGE;                 break;
        }
        roleL.setForeground(roleColor); roleL.setFont(new Font("Segoe UI",Font.PLAIN,13));
        roleL.setBounds(112,427,220,18); p.add(roleL);

        JLabel logout = new JLabel("\u2192");
        logout.setForeground(GREY); logout.setFont(new Font("Segoe UI",Font.BOLD,20));
        logout.setBounds(405,408,30,30);
        logout.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        logout.setToolTipText("Выйти");
        logout.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){deleteToken();token=null;avatarB64=null;showLogin();}
            public void mouseEntered(MouseEvent e){logout.setForeground(WHITE);}
            public void mouseExited(MouseEvent e){logout.setForeground(GREY);}
        });
        p.add(logout);

        frame.setContentPane(p); frame.revalidate(); frame.repaint();
    }

    static void launchClient(ProgressBar pb, JLabel statusLbl, GBtn launch) {
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
        JPanel p=new JPanel(null){
            protected void paintComponent(Graphics g){
                super.paintComponent(g);
                Graphics2D g2=(Graphics2D)g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(BG);g2.fillRoundRect(0,0,getWidth(),getHeight(),20,20);}};
        p.setBackground(BG);p.setOpaque(true);
        MouseAdapter drag=new MouseAdapter(){Point st;
            public void mousePressed(MouseEvent e){st=e.getPoint();}
            public void mouseDragged(MouseEvent e){Point l=frame.getLocation();frame.setLocation(l.x+e.getX()-st.x,l.y+e.getY()-st.y);}};
        p.addMouseListener(drag);p.addMouseMotionListener(drag);return p;}

    static void addX(JPanel p){
        JLabel x=new JLabel("\u2715");x.setForeground(GREY);x.setFont(new Font("Segoe UI",Font.PLAIN,18));
        x.setBounds(440,18,25,25);x.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        x.addMouseListener(new MouseAdapter(){
            public void mouseClicked(MouseEvent e){System.exit(0);}
            public void mouseEntered(MouseEvent e){x.setForeground(WHITE);}
            public void mouseExited(MouseEvent e){x.setForeground(GREY);}});p.add(x);}

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
