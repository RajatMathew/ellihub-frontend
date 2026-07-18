# Elli Core setup

## 1. Clone and install

You need [Git](https://git-scm.com/) and [Bun](https://bun.sh/) installed.

```sh
git clone https://github.com/zubblehq/elli-core.git
bun install
cp .env.example .env
```

## 2. Aurinko setup

1. Go to [aurinko.io](https://www.aurinko.io/), create a free trial account, and create a test project.
2. From the project dashboard/settings, copy its **Client ID**, **Client Secret**, and **Signing Secret** into `.env`:

```dotenv
AURINKO_CLIENT_ID="your-client-id"
AURINKO_CLIENT_SECRET="your-client-secret"
AURINKO_SIGNING_SECRET="your-signing-secret"
```

3. Configure both OAuth providers below.

<details>
<summary><strong>Microsoft OAuth</strong></summary>

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com/) and go to **Identity → Applications → App registrations → New registration**.
2. Name the app. Select **Accounts in any organizational directory and personal Microsoft accounts**, unless the app should be limited to your organization.
3. Add a **Web** redirect URI:

   ```text
   https://api.aurinko.io/v1/auth/callback
   ```

4. Go to **API permissions → Add a permission → Microsoft Graph** and add:

   | Permission | Type | Admin consent required |
   | --- | --- | --- |
   | `Calendars.ReadWrite` | Application | Yes |
   | `Mail.Read` | Delegated | No |
   | `Mail.Read` | Application | Yes |
   | `Mail.ReadWrite` | Delegated | No |
   | `Mail.ReadWrite` | Application | Yes |
   | `Mail.Send` | Delegated | No |
   | `Mail.Send` | Application | Yes |
   | `Tasks.Read.All` | Application | Yes |
   | `Tasks.ReadWrite.All` | Application | Yes |
   | `User.Read` | Delegated | No |

   Application permissions will show **Not granted for Default Directory** until a directory administrator grants consent.

5. Go to **Certificates & secrets → Client secrets → New client secret**. Copy the secret **Value** immediately.
6. Copy the app's **Application (client) ID** from **Overview**.
7. In the [Aurinko portal](https://app.aurinko.io/), open **Settings → Mailbox APIs → Office 365 OAuth** and enter:
   - **Client ID:** the Microsoft **Application (client) ID**
   - **Client Secret:** the Microsoft client secret **Value**
   - **Redirect URI:** `https://api.aurinko.io/v1/auth/callback` (the default)

</details>

<details>
<summary><strong>Google OAuth</strong></summary>

1. Open the [Google Cloud console](https://console.cloud.google.com/), create a project, and select it.
2. Go to **APIs & Services → Library** and enable:
   - **Gmail API**
   - **Google Calendar API**
3. Configure the OAuth consent screen. For an external test app, keep its publishing status as **Testing**.
4. Go to **Google Auth Platform → Audience → Test users** and add every Google account that developers need to connect.

   Test users are required because Google does not allow OAuth return URLs on unverified domains. You cannot verify `aurinko.io` because you do not own that domain, so this local callback forwards the OAuth result to Aurinko. See [Aurinko's authorized return URLs guide](https://docs.aurinko.io/authentication/authorized-return-urls) for the full explanation.

5. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID** and choose **Web application**.
6. Configure the client:
   - **Authorized JavaScript origin:** `http://localhost:5173`
   - **Authorized redirect URI:** `http://localhost:9000/api/v1/email/auth/google/callback`
7. Copy the generated Google **Client ID** and **Client Secret**.
8. In the [Aurinko portal](https://app.aurinko.io/), open **Settings → Mailbox APIs → Google OAuth**, paste both credentials, and set:

   ```text
   http://localhost:9000/api/v1/email/auth/google/callback
   ```

</details>

## 3. Configure the Aurinko callback

In the [Aurinko portal](https://app.aurinko.io/), open **Settings → General → Callback** and add:

```text
http://localhost:9000/api/v1/email/auth/callback
```

## 4. Run the API

```sh
bun run dev
```
