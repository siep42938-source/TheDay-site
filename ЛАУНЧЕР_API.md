# Подключение лаунчера к TheDay API

Сервер должен быть запущен: `http://localhost:3001`
В продакшне замени на свой домен.

---

## Ключ лаунчера
Все запросы от лаунчера требуют заголовок:
```
x-launcher-secret: launcher_theday_2026
```
(Измени в `server/.env` → `LAUNCHER_SECRET`)

---

## 1. Вход пользователя в лаунчере

**POST** `http://localhost:3001/api/launcher/login`

```json
Заголовки:
  x-launcher-secret: launcher_theday_2026
  Content-Type: application/json

Тело:
{
  "email": "user@gmail.com",
  "password": "пароль",
  "hwid": "HWID-XXXXXXXX"
}
```

**Ответ (успех):**
```json
{
  "ok": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "TD-XXXXXXXX",
    "username": "destrepal",
    "role": "Пользователь",
    "sub": "30 дней",
    "subExpires": "2026-05-25T..."
  }
}
```

**Ответ (ошибка):**
```json
{ "error": "Нет активной подписки. Купите на thedayclient.su" }
{ "error": "HWID не совпадает. Сбросьте HWID в личном кабинете." }
{ "error": "Аккаунт заблокирован: читерство" }
```

---

## 2. Проверка токена при запуске лаунчера

Сохрани токен после входа. При каждом запуске проверяй:

**POST** `http://localhost:3001/api/launcher/verify`

```json
Заголовки:
  x-launcher-secret: launcher_theday_2026

Тело:
{
  "token": "eyJhbGci...",
  "hwid": "HWID-XXXXXXXX"
}
```

---

## Пример на Java (для Minecraft лаунчера)

```java
import java.net.http.*;
import java.net.URI;

public class AuthAPI {
    static final String SERVER = "http://localhost:3001/api";
    static final String LAUNCHER_KEY = "launcher_theday_2026";

    public static String login(String email, String password, String hwid) throws Exception {
        String body = String.format(
            "{\"email\":\"%s\",\"password\":\"%s\",\"hwid\":\"%s\"}",
            email, password, hwid
        );

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(SERVER + "/launcher/login"))
            .header("Content-Type", "application/json")
            .header("x-launcher-secret", LAUNCHER_KEY)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // Парсим JSON ответ
        // Если ok:true — возвращаем token
        // Если error — показываем ошибку пользователю
        return response.body();
    }

    public static boolean verify(String token, String hwid) throws Exception {
        String body = String.format("{\"token\":\"%s\",\"hwid\":\"%s\"}", token, hwid);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(SERVER + "/launcher/verify"))
            .header("Content-Type", "application/json")
            .header("x-launcher-secret", LAUNCHER_KEY)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        return response.body().contains("\"ok\":true");
    }
}
```

## Пример на C# (.NET)

```csharp
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

public class TheDayAuth {
    const string SERVER = "http://localhost:3001/api";
    const string LAUNCHER_KEY = "launcher_theday_2026";

    static HttpClient client = new HttpClient();

    public static async Task<AuthResult> Login(string email, string password, string hwid) {
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("x-launcher-secret", LAUNCHER_KEY);

        var body = JsonConvert.SerializeObject(new { email, password, hwid });
        var content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(SERVER + "/launcher/login", content);
        var json = await response.Content.ReadAsStringAsync();

        return JsonConvert.DeserializeObject<AuthResult>(json);
    }
}

public class AuthResult {
    public bool ok { get; set; }
    public string token { get; set; }
    public string error { get; set; }
    public UserInfo user { get; set; }
}
```

---

## Получение HWID

```java
// Java
String hwid = System.getenv("COMPUTERNAME") + "-" +
    java.net.InetAddress.getLocalHost().getHostName();
// Лучше использовать уникальный ID железа
```

```csharp
// C#
string hwid = Environment.MachineName + "-" +
    System.Security.Principal.WindowsIdentity.GetCurrent().User.Value;
```

---

## Логика лаунчера

```
1. Запуск лаунчера
2. Есть сохранённый токен? → verify(token, hwid)
   - ok:true → запускаем игру
   - ошибка → показываем форму входа
3. Нет токена → форма входа
4. login(email, password, hwid)
   - ok:true → сохраняем token → запускаем игру
   - error → показываем ошибку
```
