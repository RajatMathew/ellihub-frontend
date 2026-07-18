# Aurinko Unified API Docs

Source: https://apirefs.aurinko.io/

---

- Introduction
- API Authentication
- Getting Started Guide
- OAuth Flow
  - Authorization
    - postValidate an external identity token
    - getStart an account authorization flow
    - getStart a service/daemon account authorization flow
    - getStart a user session authorization flow
    - getGet access token, Deprecated use POST instead
    - postRequest an access token
  - Account
    - getGet account status
    - delDelete the account
    - delDelete the token and revoke all provider authentication data associated with it
  - User sessions
    - getGet user info
    - patchChange user settings
    - getGet user accounts
    - getGet user account by id
    - delDelete a user account
    - postMake a user account 'managed'
    - postLog out a user
- Account management
  - Accounts
    - getGet accounts
    - postUpsert an account
    - getGet account by id
    - delDelete account by ID
    - postCheck a connection, supported Office365, Google, IMAP
  - Service accounts
    - getGet service accounts
    - postUpsert a service account
  - Managed accounts
    - postUpsert a managed account
- Email
  - Email messages
    - getList email messages
    - postSend a new message
    - getGet a message
    - delDelete a message
    - getGet a raw message
    - postUpdate a message's status
    - getGet messages in a conversation
    - getGet a conversation's followup info
    - postReply to a message
    - getGet a message attachment
  - Email sync
    - postStart a new email sync
    - getRequest changed emails (deltas)
    - getRequest deleted emails (deltas)
  - Draft messages
    - postCreate a new draft message
    - putUpdate a draft message
    - getGet a draft message
    - delDelete a draft message
    - postSend a draft message
  - Email folders
    - getList email folders
    - postCreate a new email folder
    - getList wellKnown email folders
    - patchUpdate wellKnown email folders
    - getGet an email folder
    - getList email messages in a specified folder
  - Email tracking
    - postCreate tracking for a draft message
    - patchMark draft's tracking as sent
    - patchModify draft's tracking
    - getList tracking data
    - postPurge recent activity for a user
    - postSet ignore open/click tracking for а message
    - getList all tracking events
    - getGet tracking data by Id
    - getList tracking events
    - getGet tracking event by Id
  - Follow-up and templates
    - getGet a follow up configuration
    - putUpdate a follow up configuration
    - getGet follow up rules
    - postAdd a follow up rule
    - putUpdate a follow up rule
    - delDelete a follow up rule
    - getGet a list of conversations touched by followup
    - getCheck a conversation status
    - putUpdate a conversation status
- Calendars
  - Calendars
    - getRequest list of calendars
    - postCreate new calendar
    - getGet a calendar
    - patchUpdate a calendar
  - Calendar events
    - getRequest events in a range
    - getRequest events by ICalUid's
    - getGet an event
    - patchUpdate an event
    - delDelete an event
    - getRequest a series description
    - getRequest an occurrence by original start time
    - postCreate a new event
    - putUpdate meeting response
    - getGet an event attachment
  - Calendar sync
    - postStart a new calendar sync
    - getRequest changed events (deltas)
    - getRequest deleted events (deltas)
  - Free/Busy schedule
    - postGet the free/busy availability information for a collection of users, or resources
    - postSuggest meeting times for a collection of users, or resources
    - postGet the free/busy availability information for a calendar
    - postGet available times for a calendar
- Scheduling
  - Booking (Accounts)
    - getGet user work hours
    - postCreate a booking profile
    - getGet booking profiles
    - getGet a booking profile by id
    - patchUpdate a booking profile
    - delDelete a booking profile by id
    - getGet available meeting times
    - postCreate a meeting
    - postConvert an unconfirmed booking reservation to a calendar event
    - delCancel an unconfirmed booking reservation
  - Group Booking
    - postGet available bookings for а time range
    - getGet available meeting times
    - postCreate a meeting
    - getGet group booking profiles
    - postCreate a group booking profile
    - getGet a group booking profile by id
    - patchUpdate a group booking profile
    - delDelete a group booking profile by id
    - postAssign groups to group booking
    - getList groups of a group booking profile
    - postRemove groups from group booking
    - postAssign accounts to group booking
    - getList accounts of a group booking profile
    - postRemove accounts from group booking
    - postConvert an unconfirmed booking reservation to a calendar event
    - delCancel an unconfirmed booking reservation
  - Availability
    - getGet available meeting times
    - postCreate a meeting
    - postGet available bookings for а time range
    - getGet available meeting times
    - postCreate a meeting
    - getGet available meeting times
    - postCreate a meeting
- Contacts
  - Contacts
    - getGet a contact
    - patchUpdate a contact
    - delDelete a contact
    - postCreate a new contact
  - Contacts sync
    - postStart a new contacts sync
    - getRequest changed contacts (deltas)
    - getRequest deleted contacts (deltas)
- Tasks
  - Task Lists
    - getRequest list of task lists
    - postCreate a task list
    - getRequest a task list by id
    - patchUpdate a task list
    - delDelete a task list by id
  - Tasks
    - getRequest list of tasks
    - postCreate a task
    - getRequest a task by id
    - patchUpdate a task
    - delDelete a task by id
  - Task sync
    - postStart a new task sync
    - getRequest changed tasks (deltas)
    - getRequest deleted tasks (deltas)
- Webhooks
  - Webhooks
    - getGet a list of push event subscriptions
    - postCreate a push event subscription
    - getCheck a subscription status
    - delRemove a subscription
- Other
  - Handling errors
    - Failing requests
    - Rate limiting (429 Too Many Requests)
    - 5xx server errors
    - 404 Not Found
    - 408 Request timeout
    - 412 Precondition Failed
- Rate Limiting
  - Rate Limiting

[![redocly logo](https://cdn.redoc.ly/redoc/logo-mini.svg)API docs by Redocly](https://redocly.com/redoc/)

# Aurinko.io API (1.0.0)

E-mail: [support@aurinko.io](mailto:support@aurinko.io)[Terms of Service](https://www.aurinko.io/terms-of-service/)

## [section/Introduction](https://apirefs.aurinko.io/\#section/Introduction) Introduction

The Aurinko API is a unified API platform allowing developers to quickly build integrations with
many mailbox providers and services like Google, Office 365, Outlook.com, MS Exchange, IMAP.
The unified API abstracts away differences between many email, calendar, contact, task APIs
to make it easy to connect and sync the mailbox data.

The Aurinko API's focus is convenient and reliable data synchronization for all supported
data categories (email, calendar, contacts, tasks) so the API provides methods to receive changes/deltas
and be notified of the changes (through webhooks) in a unified manner. The API's sync/deltas model
should allow developers to build reliable event based solutions easily.

The Aurinko API is built on HTTP. Our API is RESTful. It has predictable resource URLs.
It returns HTTP response codes to indicate errors. It also accepts and returns JSON in the HTTP body.

## [section/API-Authentication](https://apirefs.aurinko.io/\#section/API-Authentication) API Authentication

When you [sign up for an account](https://app.aurinko.io/#/signUp), you are given a Client Id and Secret
for every application that you create. You use those to go through OAuth flows that allow you
to start syncing remote account data through Aurinko. An account OAuth flow can be started with
just the Client Id and the Client Secret will be required to obtain an account access token in the
"authorization code" flow ("implicit grant" flow does is secured by the "trusted domains" setting).

Aurinko supports four methods of authentication depending on your authorization mode:

- **Basic Authentication** (`Client Id`, `Client Secret`): Used primarily for authentication flows and administrative requests initiated from the server side.
- **Bearer Token**`Account Access Token`: Used to authorize requests when accessing or manipulating specific user account data.
- **API Key in Cookie**: Designed for in-browser web applications that utilize Aurinko as a backend API and manage user sessions.
- **API Key in Header** (`X-Aurinko-Session`): Designed for server-side applications that need to maintain and manage user sessions.

Never share your client secret or access token. Keep them guarded and secure.

## [section/Getting-Started-Guide](https://apirefs.aurinko.io/\#section/Getting-Started-Guide) Getting Started Guide

If you have a use case you would like to implement, please consult us for feedback on the best API operations for the task.

[Click here to visit our API Guides](https://docs.aurinko.io/ctg-getting-started/getting-started).

## [tag/Auth](https://apirefs.aurinko.io/\#tag/Auth) Authorization

Aurinko's Unified OAuth Flows are backed by providers’ OAuth2 flows (i.e. Google, Office 365, Salesforce, HubSpot,...)
or by secure password-based authentications (i.e. MS Exchange, IMAP accounts). The following three flows are supported:

1. Account OAuth - User delegated authorization that produces an Aurinko account and an access token.
2. Service Account OAuth - Admin/Org-level authorization that produces an Auirnko service account and an access token.
3. User OAuth - User delegated authorization that produces an Aurinko User, its primary account, and a user session token or cookie.

See [this user guide](https://docs.aurinko.io/authentication/authentication-flow) for more information.

## [tag/Auth/operation/prepareAuth](https://apirefs.aurinko.io/\#tag/Auth/operation/prepareAuth) Validate an external identity token

post/v1/auth/prepare

Production server

https://api.aurinko.io/v1/auth/prepare

This method is for Office365 web add-ins that want to implement external authentication based on
[Exchange Identity Token](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/inside-the-identity-token).

Here are the steps involved in establishing an Aurinko User session:

1. Your Office 365 web add-in gets the Exchange identity token (see the link above for how it is done).

2. Makes a POST call to the `/auth/prepare` endpoint with the following HTTP headers:


- `X-Aurinko-Auth-Type`: `exchangeIdToken`

- `Authorization`: `Bearer <your_exchange_id_token>`

Auriko validates the identity token and provides a temporary token if the ID is valid:
`{ "token": "your-temporary-token" }`


3. The addin then calls the `/authorizeUser` endpoint with the temporary token, using the query parameter
`?token=your-temporary-token`.

Upon successful completion of the steps a new Aurinko User is created or an existing User is re-authorized.
And from now on this identity token is recognized by Aurinko and is associated with the User session.

From here on the add-in can access Aurinko API with its Exchange identity token, this way:

- `X-Aurinko-Auth-Type`: `exchangeIdToken`
- `Authorization`: `Bearer <your_exchange_id_token>`

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"token": "string"

}`

## [tag/Auth/operation/authorize](https://apirefs.aurinko.io/\#tag/Auth/operation/authorize) Start an account authorization flow

get/v1/auth/authorize

Production server

https://api.aurinko.io/v1/auth/authorize

##### query Parameters

|     |     |
| --- | --- |
| clientId<br>required | string<br>Application Client Id from the Aurinko portal dashboard. |
| serviceType<br>required | string (ServiceTypeNonDaemon) <br>Enum:"Google""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""Slack""SugarCRM""HighLevel""Hubspot""Zoom""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| scopes | Array of strings or null (Scope) <br>Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite"<br>Space separated list of Aurinko defined scopes. |
| nativeScopes | Array of strings or null (NativeScope) <br>Space separated list of provider defined scopes |
| responseType | string or null<br>Default: "code"<br>Enum:"code""token"<br>The type of response expected from the authorization flow. Choose `token` to directly receive the authentication token, or `code` to obtain a temporary code that can be exchanged for the token using the /auth/token endpoint. |
| accountId | integer or null <int64> <br>For re-authorizing an existing account. |
| loginHint | string or null<br>Is passed as "login\_hint" in OAuth flows, suggesting user identity for a smoother login process. |
| returnUrl<br>required | string or null<br>Return/Callback url for receiving the authorization code or token. It must be registered on the settings page in Aurinko portal. |
| state | string or null<br>Custom state string that will be returned in the callback. |
| clientOrgId | string or null<br>Allows clients to group accounts based on their internal organization data. |
| serverUrl | string or null<br>Can be used in the form-based authentication to specify the URL of the server to which the user intends to authenticate. When included, it automatically populates the corresponding input field on the authentication form. |
| ensureScopes | boolean or null<br>When set to true, Aurinko will check if a user granted all requested permissions. |
| ensureAccess | boolean or null<br>When set to true, Aurinko will check if a user has access to the requested resources. Supported only for Google and Office365, and only for Email, Calendar, Contacts and Tasks APIs. |
| recycle | boolean or null<br>Indicates whether to reuse an existing account instead of creating a new one during authentication. |
| authEmail | string<br>Email address that must be used for authentication. Aurinko will fail the authentication flow if the email address does not match the one provided. |

### Responses

**303**

Redirect

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -G https://api.aurinko.io/v1/auth/authorize \
    -d clientId='a8b7c6d5e4f3g2h1' \
    -d serviceType='Google' \
    -d scopes='Calendar.ReadWrite Mail.Read Mail.Send' \
    -d responseType='code' \
    -d returnUrl='https://yourapp.com/aurinko-redirect' \
    -d state='CustomStateString'
```

## [tag/Auth/operation/authorizeDaemon](https://apirefs.aurinko.io/\#tag/Auth/operation/authorizeDaemon) Start a service/daemon account authorization flow

get/v1/auth/authorizeDaemon

Production server

https://api.aurinko.io/v1/auth/authorizeDaemon

##### query Parameters

|     |     |
| --- | --- |
| clientId<br>required | string<br>Application Client Id from the Aurinko portal dashboard. |
| serviceType<br>required | string (ServiceTypeDaemon) <br>Enum:"Google""GoogleBot""Office365""EWS""MsTeamsBot""Slack""SlackBot""ZoomBot""MCTrade""Zoho" |
| scopes | Array of strings or null (Scope) <br>Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite"<br>Space separated list of Aurinko defined scopes. |
| nativeScopes | Array of strings or null (NativeScope) <br>Space separated list of provider defined scopes. |
| responseType | string or null<br>Default: "code"<br>Enum:"code""token"<br>The type of response expected from the authorization flow. Choose `token` to directly receive the authentication token, or `code` to obtain a temporary code that can be exchanged for the token using the /auth/token endpoint. |
| accountId | integer or null <int64> <br>For re-authorizing an existing account. |
| returnUrl<br>required | string or null<br>Return/Callback url for receiving the authorization code or token. It must be registered on the settings page in Aurinko portal. |
| state | string or null<br>Custom state string |
| clientOrgId | string or null<br>Allows clients to group accounts based on their internal organization data. |
| ensureScopes | boolean or null<br>When set to true, Aurinko will check if a user granted all requested permissions. |

### Responses

**303**

Redirect

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -G https://api.aurinko.io/v1/auth/authorizeDaemon \
    -d clientId='a8b7c6d5e4f3g2h1' \
    -d serviceType='Google' \
    -d scopes='Calendar.ReadWrite Mail.Read Mail.Send' \
    -d returnUrl='https://yourapp.com/aurinko-redirect' \
    -d state='CustomStateString'
```

## [tag/Auth/operation/authorizeUser](https://apirefs.aurinko.io/\#tag/Auth/operation/authorizeUser) Start a user session authorization flow

get/v1/auth/authorizeUser

Production server

https://api.aurinko.io/v1/auth/authorizeUser

This endpoint is used to authorize accounts that are linked to `Users`. The `accountRole` parameter must be set to either `primary` or `secondary`. A `primary` role creates a new User entity and assigns the account as its key/primary account, with subsequent authorizations simply re-authorizing the existing primary account with its User. The `secondary` role requires an existing `User` cookie or `userId`+`userSignature` parameters and links the new account to the `User` specified by the cookie or `userId`.

##### query Parameters

|     |     |
| --- | --- |
| clientId<br>required | string<br>Application Client Id from the Aurinko portal dashboard. |
| mailboxInfo | string or null<br>Relevant only for cookie-based authentication in multi-client setups. When different client apps are connected to a single Aurinko application, this string (commonly the user's email, but can be any unique identifier) is combined with "clientId" to create a distinct authentication cookie name and prevent cookie conflicts. Clients using cookie-based auth must send "clientId" and "mailboxInfo" via "X-Aurinko-Client-Id" and "X-Aurinko-Mailbox-Info" HTTP headers for accurate cookie identification. |
| serviceType<br>required | string (ServiceTypeNonDaemon) <br>Enum:"Google""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""Slack""SugarCRM""HighLevel""Hubspot""Zoom""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| scopes | Array of strings or null (Scope) <br>Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite"<br>Space separated list of Aurinko defined scopes. |
| nativeScopes | Array of strings or null (NativeScope) <br>Space separated list of provider defined scopes |
| responseType | string or null<br>Default: "cookie"<br>Enum:"cookie""code""none"<br>The type of response expected from the user authorization flow. For `primary` accounts, choose `cookie` or `code`, for `secondary` accounts, choose `none`. `cookie` will set a cookie in the user's browser in the callback, `code` will return a temporary code that can be exchanged for a user session token using the /auth/token endpoint. `none` will return only the status of the operation and information about an occurred error. Because `secondary` accounts are linked to an existing and authorized User, they don't need to receive a token or cookie in the callback. |
| accountId | integer or null <int64> <br>For re-authorizing an existing `secondary` account. |
| loginHint | string or null<br>Is passed as "login\_hint" in OAuth flows, suggesting user identity for a smoother login process. |
| returnUrl<br>required | string or null<br>Return/Callback url for receiving the authorization code or token. It must be registered on the settings page in Aurinko portal. |
| state | string or null<br>Custom state string |
| accountRole<br>required | string<br>Enum:"primary""secondary"<br>The account's role in relation to a User. Use `primary` for the account to act as a key account; this will create a new User if the primary account doesn't exist already. If the primary account exists, it's simply re-authorized without creating a new user. Choose `secondary` to associate the account with an already existing User, which requires either existing User cookie or `userId` \+ `userSignature` for identification. |
| userId | string or null<br>Identifies a user for whom a secondary account is being added. Should be used only when `userAccount=secondary` and user cookie is not present in the request. Works in conjunction with `timestamp` and `userSignature` to authorize the addition of secondary account. |
| timestamp | integer or null <int64> <br>Request timestamp in seconds. Should be used only when `userAccount=secondary` and user cookie is not present in the request. Works in conjunction with `userId` and `userSignature` to authorize the addition of secondary account. |
| userSignature | string or null<br>A string that is generated by concatenating `userId` and `timestamp`, then hashing with HmacSHA256 using the application's `clientSecret`, then encoding in Hex, base64, or base64 web format. Should be used only when `userAccount=secondary` and user cookie is not present in the request Works in conjunction with `userId` and `timestamp` to authorize the addition of secondary account. |
| serverUrl | string or null<br>Can be used in the form-based authentication to specify the URL of the server to which the user intends to authenticate. When included, it automatically populates the corresponding input field on the authentication form. |
| ensureScopes | boolean or null<br>When set to true, Aurinko will check if a user granted all requested permissions. |
| ensureAccess | boolean or null<br>When set to true, Aurinko will check if a user has access to the requested resources. Supported only for Google and Office365, and only for Email, Calendar, Contacts and Tasks APIs. |
| token | string or null<br>Token from the /auth/prepare endpoint. |

### Responses

**303**

Redirect

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -G https://api.aurinko.io/v1/auth/authorizeUser \
    -d clientId='a8b7c6d5e4f3g2h1' \
    -d serviceType='Google' \
    -d accountRole='primary' \
    -d scopes='Calendar.ReadWrite Mail.Read Mail.Send' \
    -d responseType='cookie' \
    -d returnUrl='https://yourapp.com/aurinko-redirect' \
    -d state='CustomStateString'
```

## [tag/Auth/operation/getAccessTokenByCode](https://apirefs.aurinko.io/\#tag/Auth/operation/getAccessTokenByCode) Get access token, Deprecated use POST instead

get/v1/auth/token/{code}

Production server

https://api.aurinko.io/v1/auth/token/{code}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| code<br>required | string<br>A code returned by /authorize |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X GET https://api.aurinko.io/v1/auth/token/<code>
```

### Response samples

- 200

Content type

application/json

Copy

`{"accountId": 0,

"accessToken": "string",

"userId": "string",

"userSession": "string"

}`

## [tag/Auth/operation/authCodeExchange](https://apirefs.aurinko.io/\#tag/Auth/operation/authCodeExchange) Request an access token

post/v1/auth/token/{code}

Production server

https://api.aurinko.io/v1/auth/token/{code}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| code<br>required | string<br>A code returned by /authorize |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X POST https://api.aurinko.io/v1/auth/token/<code>
```

### Response samples

- 200

Content type

application/json

Copy

`{"accountId": 0,

"accessToken": "string",

"userId": "string",

"userSession": "string"

}`

## [tag/Account](https://apirefs.aurinko.io/\#tag/Account) Account

An account corresponds to an email address, mailbox, and/or calendar. When connecting to the Aurinko API, a specific access token gives you access to a specific account’s data.

## [tag/Account/operation/getMyAccount](https://apirefs.aurinko.io/\#tag/Account/operation/getMyAccount) Get account status

get/v1/account

Production server

https://api.aurinko.io/v1/account

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| pingProvider | boolean or null<br>If true, the provider will be pinged to check if the token is still valid. Currently supported only for Google, Office365, Salesforce, NetSuite, IMAP. |
| includeProviderAuth | boolean or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/account
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"parentId": 0,

"serviceType": "Google",

"serviceProvider": "Office365",

"active": true,

"tokenStatus": "active",

"tokenError": "string",

"type": "daemon",

"daemon": true,

"loginString": "string",

"email": "string",

"email2": "string",

"mailboxAddress": "string",

"name": "string",

"name2": "string",

"serverUrl": "string",

"serverUrl2": "string",

"clientOrgId": "string",

"authUserId": "string",

"authOrgId": "string",

"timezone": "string",

"tokenIssuedAt": "2019-08-24T14:15:22Z",

"tokenLastActivity": "2019-08-24T14:15:22Z",

"authScopes": ["Calendar.Read"\
\
],

"authNativeScopes": ["string"\
\
],

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"userId": "string",

"copyToSent": true,

"trustServer": true,

"createdAt": "2019-08-24T14:15:22Z",

"updatedAt": "2019-08-24T14:15:22Z"

}`

## [tag/Account/operation/deleteAccount](https://apirefs.aurinko.io/\#tag/Account/operation/deleteAccount) Delete the account

delete/v1/account

Production server

https://api.aurinko.io/v1/account

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X DELETE -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/account
```

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/Account/operation/deleteToken](https://apirefs.aurinko.io/\#tag/Account/operation/deleteToken) Delete the token and revoke all provider authentication data associated with it

delete/v1/account/token

Production server

https://api.aurinko.io/v1/account/token

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X DELETE -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/account/token
```

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/User](https://apirefs.aurinko.io/\#tag/User) User sessions

`User` is an Aurinko managed entity that your app can leverage to implement user session management. Multiple regular Aurinko accounts can be linked to a `User` however there is always one primary account that acts as the user id-provider. The `User` sessions allow browser apps to store all their account access tokens securely on the Aurinko servers.

## [tag/User/operation/getUserInfo](https://apirefs.aurinko.io/\#tag/User/operation/getUserInfo) Get user info

get/v1/user

Production server

https://api.aurinko.io/v1/user

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"appId": 0,

"email": "string",

"name": "string",

"authOrgId": "string",

"createdAt": "2019-08-24T14:15:22Z",

"lastActivity": "2019-08-24T14:15:22Z",

"trustedIdentity": true,

"externalIdType": "exchangeIdentity",

"accounts": [{"id": 0,\
\
"parentId": 0,\
\
"serviceType": "Google",\
\
"userAccountType": "primary",\
\
"type": "daemon",\
\
"active": true,\
\
"loginString": "string",\
\
"email": "string",\
\
"name": "string",\
\
"serverUrl": "string",\
\
"serverUrl2": "string",\
\
"clientOrgId": "string",\
\
"authUserId": "string",\
\
"authOrgId": "string",\
\
"timezone": "string",\
\
"authObtainedAt": "2019-08-24T14:15:22Z",\
\
"organization": {"id": 0,\
\
"serviceProvider": "Office365",\
\
"xid": "string",\
\
"domain": "string",\
\
"name": "string",\
\
"createdAt": "2019-08-24T14:15:22Z"\
\
},\
\
"tokenStatus": "active",\
\
"scopes": ["Calendar.Read"\
\
],\
\
"authScopes": ["Calendar.Read"\
\
],\
\
"nativeScopes": ["string"\
\
],\
\
"authNativeScopes": ["string"\
\
],\
\
"hasApiErrors": true,\
\
"bookingCount": 0,\
\
"trackingActive": true,\
\
"templatesCount": 0,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"updatedAt": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/User/operation/updateSettings](https://apirefs.aurinko.io/\#tag/User/operation/updateSettings) Change user settings

patch/v1/user/settings

Production server

https://api.aurinko.io/v1/user/settings

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

##### Request Body schema: application/json

|     |     |
| --- | --- |
| workHours | object (WeekWorkSchedule) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"appId": 0,

"email": "string",

"name": "string",

"authOrgId": "string",

"createdAt": "2019-08-24T14:15:22Z",

"lastActivity": "2019-08-24T14:15:22Z",

"trustedIdentity": true,

"externalIdType": "exchangeIdentity",

"accounts": [{"id": 0,\
\
"parentId": 0,\
\
"serviceType": "Google",\
\
"userAccountType": "primary",\
\
"type": "daemon",\
\
"active": true,\
\
"loginString": "string",\
\
"email": "string",\
\
"name": "string",\
\
"serverUrl": "string",\
\
"serverUrl2": "string",\
\
"clientOrgId": "string",\
\
"authUserId": "string",\
\
"authOrgId": "string",\
\
"timezone": "string",\
\
"authObtainedAt": "2019-08-24T14:15:22Z",\
\
"organization": {"id": 0,\
\
"serviceProvider": "Office365",\
\
"xid": "string",\
\
"domain": "string",\
\
"name": "string",\
\
"createdAt": "2019-08-24T14:15:22Z"\
\
},\
\
"tokenStatus": "active",\
\
"scopes": ["Calendar.Read"\
\
],\
\
"authScopes": ["Calendar.Read"\
\
],\
\
"nativeScopes": ["string"\
\
],\
\
"authNativeScopes": ["string"\
\
],\
\
"hasApiErrors": true,\
\
"bookingCount": 0,\
\
"trackingActive": true,\
\
"templatesCount": 0,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"updatedAt": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/User/operation/getEndUserAccounts](https://apirefs.aurinko.io/\#tag/User/operation/getEndUserAccounts) Get user accounts

get/v1/user/accounts

Production server

https://api.aurinko.io/v1/user/accounts

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user/accounts
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": 0,\
\
"parentId": 0,\
\
"serviceType": "Google",\
\
"userAccountType": "primary",\
\
"type": "daemon",\
\
"active": true,\
\
"loginString": "string",\
\
"email": "string",\
\
"name": "string",\
\
"serverUrl": "string",\
\
"serverUrl2": "string",\
\
"clientOrgId": "string",\
\
"authUserId": "string",\
\
"authOrgId": "string",\
\
"timezone": "string",\
\
"authObtainedAt": "2019-08-24T14:15:22Z",\
\
"organization": {"id": 0,\
\
"serviceProvider": "Office365",\
\
"xid": "string",\
\
"domain": "string",\
\
"name": "string",\
\
"createdAt": "2019-08-24T14:15:22Z"\
\
},\
\
"tokenStatus": "active",\
\
"scopes": ["Calendar.Read"\
\
],\
\
"authScopes": ["Calendar.Read"\
\
],\
\
"nativeScopes": ["string"\
\
],\
\
"authNativeScopes": ["string"\
\
],\
\
"hasApiErrors": true,\
\
"bookingCount": 0,\
\
"trackingActive": true,\
\
"templatesCount": 0,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"updatedAt": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/User/operation/getEndUserAccount](https://apirefs.aurinko.io/\#tag/User/operation/getEndUserAccount) Get user account by id

get/v1/user/accounts/{id}

Production server

https://api.aurinko.io/v1/user/accounts/{id}

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>user's account Id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user/accounts/<id>
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"parentId": 0,

"serviceType": "Google",

"userAccountType": "primary",

"type": "daemon",

"active": true,

"loginString": "string",

"email": "string",

"name": "string",

"serverUrl": "string",

"serverUrl2": "string",

"clientOrgId": "string",

"authUserId": "string",

"authOrgId": "string",

"timezone": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"organization": {"id": 0,

"serviceProvider": "Office365",

"xid": "string",

"domain": "string",

"name": "string",

"createdAt": "2019-08-24T14:15:22Z"

},

"tokenStatus": "active",

"scopes": ["Calendar.Read"\
\
],

"authScopes": ["Calendar.Read"\
\
],

"nativeScopes": ["string"\
\
],

"authNativeScopes": ["string"\
\
],

"hasApiErrors": true,

"bookingCount": 0,

"trackingActive": true,

"templatesCount": 0,

"createdAt": "2019-08-24T14:15:22Z",

"updatedAt": "2019-08-24T14:15:22Z"

}`

## [tag/User/operation/logoutAccount](https://apirefs.aurinko.io/\#tag/User/operation/logoutAccount) Delete a user account

delete/v1/user/accounts/{id}

Production server

https://api.aurinko.io/v1/user/accounts/{id}

Deleting a primary account, also invalidates the user's session cookie (logout).

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>user's account Id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X DELETE --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user/accounts/<id>
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/User/operation/copyAsManaged](https://apirefs.aurinko.io/\#tag/User/operation/copyAsManaged) Make a user account 'managed'

post/v1/user/accounts/{id}/managed

Production server

https://api.aurinko.io/v1/user/accounts/{id}/managed

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>user's account Id |

##### query Parameters

|     |     |
| --- | --- |
| clientOrgId | string or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user/accounts/<id>/managed
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"parentId": 0,

"serviceType": "Google",

"userAccountType": "primary",

"type": "daemon",

"active": true,

"loginString": "string",

"email": "string",

"name": "string",

"serverUrl": "string",

"serverUrl2": "string",

"clientOrgId": "string",

"authUserId": "string",

"authOrgId": "string",

"timezone": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"organization": {"id": 0,

"serviceProvider": "Office365",

"xid": "string",

"domain": "string",

"name": "string",

"createdAt": "2019-08-24T14:15:22Z"

},

"tokenStatus": "active",

"scopes": ["Calendar.Read"\
\
],

"authScopes": ["Calendar.Read"\
\
],

"nativeScopes": ["string"\
\
],

"authNativeScopes": ["string"\
\
],

"hasApiErrors": true,

"bookingCount": 0,

"trackingActive": true,

"templatesCount": 0,

"createdAt": "2019-08-24T14:15:22Z",

"updatedAt": "2019-08-24T14:15:22Z"

}`

## [tag/User/operation/logout](https://apirefs.aurinko.io/\#tag/User/operation/logout) Log out a user

post/v1/user/logout

Production server

https://api.aurinko.io/v1/user/logout

Invalidates the user's session cookie

##### Authorizations:

(_UserSessionCookie__ClientIdHeader_) _UserSessionHeader_

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST --cookie "<END_USER_COOKIE>" \
    -H 'X-Aurinko-ClientId: <CLIENT_ID>' \
    https://api.aurinko.io/v1/user/logout
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Accounts](https://apirefs.aurinko.io/\#tag/Accounts) Accounts

These endpoints allow for account management outside the developer console interface. You can list, cancel, update, and delete accounts associated with your application.

## [tag/Accounts/operation/getAccounts](https://apirefs.aurinko.io/\#tag/Accounts/operation/getAccounts) Get accounts

get/v1/am/accounts

Production server

https://api.aurinko.io/v1/am/accounts

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |
| authOrgId | string or null<br>An authenticated OrgId |
| serviceType | string (ServiceTypeNonDaemon) <br>Enum:"Google""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""Slack""SugarCRM""HighLevel""Hubspot""Zoom""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| subscriptionId | integer or null <int64> |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X GET https://api.aurinko.io/v1/am/accounts \
    -G -d clientOrgId='12345'
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"parentId": 0,\
\
"serviceType": "Google",\
\
"serviceProvider": "Office365",\
\
"active": true,\
\
"tokenStatus": "active",\
\
"tokenError": "string",\
\
"type": "daemon",\
\
"daemon": true,\
\
"loginString": "string",\
\
"email": "string",\
\
"email2": "string",\
\
"mailboxAddress": "string",\
\
"name": "string",\
\
"name2": "string",\
\
"serverUrl": "string",\
\
"serverUrl2": "string",\
\
"clientOrgId": "string",\
\
"authUserId": "string",\
\
"authOrgId": "string",\
\
"timezone": "string",\
\
"tokenIssuedAt": "2019-08-24T14:15:22Z",\
\
"tokenLastActivity": "2019-08-24T14:15:22Z",\
\
"authScopes": ["Calendar.Read"\
\
],\
\
"authNativeScopes": ["string"\
\
],\
\
"authObtainedAt": "2019-08-24T14:15:22Z",\
\
"authExpiresAt": "2019-08-24T14:15:22Z",\
\
"userId": "string",\
\
"copyToSent": true,\
\
"trustServer": true,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"updatedAt": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/Accounts/operation/upsertPersonal](https://apirefs.aurinko.io/\#tag/Accounts/operation/upsertPersonal) Upsert an account

post/v1/am/accounts

Production server

https://api.aurinko.io/v1/am/accounts

Creates an account automatically without requiring manual authorization. See [Accounts](https://apirefs.aurinko.io/#tag/Accounts) for details.

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| userAccount | string (UserAccountType) <br>Enum:"primary""secondary"<br>Type of user account. Required if `userId` is provided. |
| userId | string or null<br>ID of a user this account should be attached to. |
| recycleKeys | Array of strings or null (ServiceKey) <br>Enum:"email""orgId""userId""serverUrl""username""clientOrgId" |
| ensureAccess | boolean or null<br>When set to true, Aurinko will check if a user has access to the requested resources. Supported only for Google, Office365, IMAP and only for Email, Calendar, Contacts and Tasks APIs. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| serviceType<br>required | string (ServiceType) <br>Enum:"Google""GoogleBot""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""MsTeamsBot""Slack""SlackBot""SugarCRM""HighLevel""Hubspot""Zoom""ZoomBot""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""MCTrade""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| serviceProvider | string (ServiceProvider) <br>Enum:"Office365""Google""Zoho""IMAP""EWS""Yahoo""AOL""iCloud""BigPond""Fastmail""Repfabric""Salesforce""Salesflare""SugarCRM""HighLevel""Hubspot""Pipedrive""AutoQuotes""SpecPath""Clientify""EclipseERP""NetSuite""Fishbowl""Slack""Zoom""Webex""MCTrade""Creatio""QuickBooks""ActiveCampaign""ConstantContact""Yoxel" |
| authScopes | Array of strings (Scope) <br>Items Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite" |
| authOrgId | string |
| authUserId | string |
| clientOrgId | string |
| serverUrl | string |
| loginString | string<br>This or email field must be specified |
| oauthClientId | string |
| active<br>required | boolean<br>The account is always active in the current API version |
| authString1 | string |
| authString2 | string |
| password | string<br>Password for IMAP accounts |
| authObtainedAt | string <date-time> |
| authExpiresAt | string <date-time> |
| email | string<br>This or loginString field must be specified |
| email2 | string |
| name | string |
| serverInfo | string |
| timezone | string |
| copyToSent | boolean<br>Copy sent emails to “Sent Messages” folder |
| trustServer | boolean<br>Default: false |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"serviceType": "Google",

"serviceProvider": "Office365",

"authScopes": ["Calendar.Read"\
\
],

"authOrgId": "string",

"authUserId": "string",

"clientOrgId": "string",

"serverUrl": "string",

"loginString": "string",

"oauthClientId": "string",

"active": true,

"authString1": "string",

"authString2": "string",

"password": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"email": "string",

"email2": "string",

"name": "string",

"serverInfo": "string",

"timezone": "string",

"copyToSent": true,

"trustServer": false

}`

### Response samples

- 200

Content type

application/json

Copy

`{"accountId": 0,

"accessToken": "string",

"userId": "string",

"userSession": "string"

}`

## [tag/Accounts/operation/getAccount](https://apirefs.aurinko.io/\#tag/Accounts/operation/getAccount) Get account by id

get/v1/am/accounts/{id}

Production server

https://api.aurinko.io/v1/am/accounts/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>account id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X GET https://api.aurinko.io/v1/am/accounts/{id}
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"parentId": 0,

"serviceType": "Google",

"serviceProvider": "Office365",

"active": true,

"tokenStatus": "active",

"tokenError": "string",

"type": "daemon",

"daemon": true,

"loginString": "string",

"email": "string",

"email2": "string",

"mailboxAddress": "string",

"name": "string",

"name2": "string",

"serverUrl": "string",

"serverUrl2": "string",

"clientOrgId": "string",

"authUserId": "string",

"authOrgId": "string",

"timezone": "string",

"tokenIssuedAt": "2019-08-24T14:15:22Z",

"tokenLastActivity": "2019-08-24T14:15:22Z",

"authScopes": ["Calendar.Read"\
\
],

"authNativeScopes": ["string"\
\
],

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"userId": "string",

"copyToSent": true,

"trustServer": true,

"createdAt": "2019-08-24T14:15:22Z",

"updatedAt": "2019-08-24T14:15:22Z"

}`

## [tag/Accounts/operation/amAccountDelete](https://apirefs.aurinko.io/\#tag/Accounts/operation/amAccountDelete) Delete account by ID

delete/v1/am/accounts/{id}

Production server

https://api.aurinko.io/v1/am/accounts/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X DELETE https://api.aurinko.io/v1/am/accounts/12345
```

## [tag/Accounts/operation/checkConnection](https://apirefs.aurinko.io/\#tag/Accounts/operation/checkConnection) Check a connection, supported Office365, Google, IMAP

post/v1/am/accounts/connect

Production server

https://api.aurinko.io/v1/am/accounts/connect

##### Authorizations:

_AppAuth_

##### Request Body schema: application/json

|     |     |
| --- | --- |
| serviceType<br>required | string (ServiceType) <br>Enum:"Google""GoogleBot""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""MsTeamsBot""Slack""SlackBot""SugarCRM""HighLevel""Hubspot""Zoom""ZoomBot""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""MCTrade""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| serviceProvider | string (ServiceProvider) <br>Enum:"Office365""Google""Zoho""IMAP""EWS""Yahoo""AOL""iCloud""BigPond""Fastmail""Repfabric""Salesforce""Salesflare""SugarCRM""HighLevel""Hubspot""Pipedrive""AutoQuotes""SpecPath""Clientify""EclipseERP""NetSuite""Fishbowl""Slack""Zoom""Webex""MCTrade""Creatio""QuickBooks""ActiveCampaign""ConstantContact""Yoxel" |
| authScopes | Array of strings (Scope) <br>Items Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite" |
| authOrgId | string |
| authUserId | string |
| clientOrgId | string |
| serverUrl | string |
| loginString | string<br>This or email field must be specified |
| oauthClientId | string |
| active<br>required | boolean<br>The account is always active in the current API version |
| authString1 | string |
| authString2 | string |
| password | string<br>Password for IMAP accounts |
| authObtainedAt | string <date-time> |
| authExpiresAt | string <date-time> |
| email | string<br>This or loginString field must be specified |
| email2 | string |
| name | string |
| serverInfo | string |
| timezone | string |
| copyToSent | boolean<br>Copy sent emails to “Sent Messages” folder |
| trustServer | boolean<br>Default: false |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"serviceType": "Google",

"serviceProvider": "Office365",

"authScopes": ["Calendar.Read"\
\
],

"authOrgId": "string",

"authUserId": "string",

"clientOrgId": "string",

"serverUrl": "string",

"loginString": "string",

"oauthClientId": "string",

"active": true,

"authString1": "string",

"authString2": "string",

"password": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"email": "string",

"email2": "string",

"name": "string",

"serverInfo": "string",

"timezone": "string",

"copyToSent": true,

"trustServer": false

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Services](https://apirefs.aurinko.io/\#tag/Services) Service accounts

Service accounts represent admin/service/organization level connections. List, cancel, update, and delete service accounts associated with your application.

## [tag/Services/operation/getSvcAccounts](https://apirefs.aurinko.io/\#tag/Services/operation/getSvcAccounts) Get service accounts

get/v1/am/svc\_accounts

Production server

https://api.aurinko.io/v1/am/svc\_accounts

Retrieve details for existing service accounts. See [Service accounts](https://apirefs.aurinko.io/#tag/Services) for details.

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |
| clientOrgId | string or null<br>A client OrgId |
| authOrgId | string or null<br>An authenticated OrgId |
| serviceType | string (ServiceTypeDaemon) <br>Enum:"Google""GoogleBot""Office365""EWS""MsTeamsBot""Slack""SlackBot""ZoomBot""MCTrade""Zoho" |
| subscriptionId | integer or null <int64> |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -u ClientId:Secret -X GET https://api.aurinko.io/v1/am/svc_accounts \
    -G -d clientOrgId='12345'
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"parentId": 0,\
\
"serviceType": "Google",\
\
"serviceProvider": "Office365",\
\
"active": true,\
\
"tokenStatus": "active",\
\
"tokenError": "string",\
\
"type": "daemon",\
\
"daemon": true,\
\
"loginString": "string",\
\
"email": "string",\
\
"email2": "string",\
\
"mailboxAddress": "string",\
\
"name": "string",\
\
"name2": "string",\
\
"serverUrl": "string",\
\
"serverUrl2": "string",\
\
"clientOrgId": "string",\
\
"authUserId": "string",\
\
"authOrgId": "string",\
\
"timezone": "string",\
\
"tokenIssuedAt": "2019-08-24T14:15:22Z",\
\
"tokenLastActivity": "2019-08-24T14:15:22Z",\
\
"authScopes": ["Calendar.Read"\
\
],\
\
"authNativeScopes": ["string"\
\
],\
\
"authObtainedAt": "2019-08-24T14:15:22Z",\
\
"authExpiresAt": "2019-08-24T14:15:22Z",\
\
"userId": "string",\
\
"copyToSent": true,\
\
"trustServer": true,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"updatedAt": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/Services/operation/upsertServiceAccount](https://apirefs.aurinko.io/\#tag/Services/operation/upsertServiceAccount) Upsert a service account

post/v1/am/svc\_accounts

Production server

https://api.aurinko.io/v1/am/svc\_accounts

Creates a service account automatically without requiring manual authorization. See [Service accounts](https://apirefs.aurinko.io/#tag/Services) for details.

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| recycleKeys | Array of strings or null (ServiceKey) <br>Enum:"email""orgId""userId""serverUrl""username""clientOrgId"<br>Recycle Keys |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| serviceType<br>required | string (ServiceType) <br>Enum:"Google""GoogleBot""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""MsTeamsBot""Slack""SlackBot""SugarCRM""HighLevel""Hubspot""Zoom""ZoomBot""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""MCTrade""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| serviceProvider | string (ServiceProvider) <br>Enum:"Office365""Google""Zoho""IMAP""EWS""Yahoo""AOL""iCloud""BigPond""Fastmail""Repfabric""Salesforce""Salesflare""SugarCRM""HighLevel""Hubspot""Pipedrive""AutoQuotes""SpecPath""Clientify""EclipseERP""NetSuite""Fishbowl""Slack""Zoom""Webex""MCTrade""Creatio""QuickBooks""ActiveCampaign""ConstantContact""Yoxel" |
| authScopes | Array of strings (Scope) <br>Items Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite" |
| authOrgId | string |
| authUserId | string |
| clientOrgId | string |
| serverUrl | string |
| loginString | string<br>This or email field must be specified |
| oauthClientId | string |
| active<br>required | boolean<br>The account is always active in the current API version |
| authString1 | string |
| authString2 | string |
| password | string<br>Password for IMAP accounts |
| authObtainedAt | string <date-time> |
| authExpiresAt | string <date-time> |
| email | string<br>This or loginString field must be specified |
| email2 | string |
| name | string |
| serverInfo | string |
| timezone | string |
| copyToSent | boolean<br>Copy sent emails to “Sent Messages” folder |
| trustServer | boolean<br>Default: false |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"serviceType": "Google",

"serviceProvider": "Office365",

"authScopes": ["Calendar.Read"\
\
],

"authOrgId": "string",

"authUserId": "string",

"clientOrgId": "string",

"serverUrl": "string",

"loginString": "string",

"oauthClientId": "string",

"active": true,

"authString1": "string",

"authString2": "string",

"password": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"email": "string",

"email2": "string",

"name": "string",

"serverInfo": "string",

"timezone": "string",

"copyToSent": true,

"trustServer": false

}`

### Response samples

- 200

Content type

application/json

Copy

`{"accountId": 0,

"accessToken": "string",

"userId": "string",

"userSession": "string"

}`

## [tag/Managed-accounts](https://apirefs.aurinko.io/\#tag/Managed-accounts) Managed accounts

Manage accounts rely on service accounts for their connections. List, cancel, update, and delete managed accounts associated with service accounts.

## [tag/Managed-accounts/operation/upsertManagedAccount](https://apirefs.aurinko.io/\#tag/Managed-accounts/operation/upsertManagedAccount) Upsert a managed account

post/v1/am/svc\_accounts/{accId}/accounts

Production server

https://api.aurinko.io/v1/am/svc\_accounts/{accId}/accounts

Creates a managed account automatically without requiring manual authorization. See [Managed accounts](https://apirefs.aurinko.io/#tag/Managed-accounts) for details.

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| accId<br>required | integer <int64> <br>A service account id |

##### query Parameters

|     |     |
| --- | --- |
| userAccount | string (UserAccountType) <br>Enum:"primary""secondary"<br>Type of user account. Required if `userId` is provided. |
| userId | string or null |
| recycleKeys | Array of strings or null (ServiceKey) <br>Enum:"email""orgId""userId""serverUrl""username""clientOrgId" |
| ensureAccess | boolean or null<br>When set to true, Aurinko will check if a user has access to the requested resources. Supported only for Google and Office365, and only for Email, Calendar, Contacts and Tasks APIs. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| serviceType<br>required | string (ServiceType) <br>Enum:"Google""GoogleBot""Office365""EWS""IMAP""Salesforce""Salesflare""Repfabric""MsTeamsBot""Slack""SlackBot""SugarCRM""HighLevel""Hubspot""Zoom""ZoomBot""Webex""WebexBot""Pipedrive""EclipseERP""AutoQuotes""NetSuite""MCTrade""SpecPath""Zoho""Clientify""QuickBooks""ActiveCampaign""Creatio""ConstantContact""Fishbowl""iCloud" |
| serviceProvider | string (ServiceProvider) <br>Enum:"Office365""Google""Zoho""IMAP""EWS""Yahoo""AOL""iCloud""BigPond""Fastmail""Repfabric""Salesforce""Salesflare""SugarCRM""HighLevel""Hubspot""Pipedrive""AutoQuotes""SpecPath""Clientify""EclipseERP""NetSuite""Fishbowl""Slack""Zoom""Webex""MCTrade""Creatio""QuickBooks""ActiveCampaign""ConstantContact""Yoxel" |
| authScopes | Array of strings (Scope) <br>Items Enum:"Calendar.Read""Calendar.ReadWrite""Mail.Read""Mail.ReadWrite""Mail.Send""Mail.Drafts""Mail.All""Contacts.Read""Contacts.ReadWrite""Tasks.Read""Tasks.ReadWrite" |
| authOrgId | string |
| authUserId | string |
| clientOrgId | string |
| serverUrl | string |
| loginString | string<br>This or email field must be specified |
| oauthClientId | string |
| active<br>required | boolean<br>The account is always active in the current API version |
| authString1 | string |
| authString2 | string |
| password | string<br>Password for IMAP accounts |
| authObtainedAt | string <date-time> |
| authExpiresAt | string <date-time> |
| email | string<br>This or loginString field must be specified |
| email2 | string |
| name | string |
| serverInfo | string |
| timezone | string |
| copyToSent | boolean<br>Copy sent emails to “Sent Messages” folder |
| trustServer | boolean<br>Default: false |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"serviceType": "Google",

"serviceProvider": "Office365",

"authScopes": ["Calendar.Read"\
\
],

"authOrgId": "string",

"authUserId": "string",

"clientOrgId": "string",

"serverUrl": "string",

"loginString": "string",

"oauthClientId": "string",

"active": true,

"authString1": "string",

"authString2": "string",

"password": "string",

"authObtainedAt": "2019-08-24T14:15:22Z",

"authExpiresAt": "2019-08-24T14:15:22Z",

"email": "string",

"email2": "string",

"name": "string",

"serverInfo": "string",

"timezone": "string",

"copyToSent": true,

"trustServer": false

}`

### Response samples

- 200

Content type

application/json

Copy

`{"accountId": 0,

"accessToken": "string",

"userId": "string",

"userSession": "string"

}`

## [tag/Messages](https://apirefs.aurinko.io/\#tag/Messages) Email messages

Messages contain several pieces of information, such as when a message was sent, the sender's address, to whom it was sent, and the message body. They can also contain files (attachments), calendar event invitations, and more.

## [tag/Messages/operation/messages](https://apirefs.aurinko.io/\#tag/Messages/operation/messages) List email messages

get/v1/email/messages

Production server

https://api.aurinko.io/v1/email/messages

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null |
| q | string or null<br>Only return messages matching the specified query. For example, "from: [someuser@example.com](mailto:someuser@example.com) after:01/01/2020" |
| bodyType | string (BodyType) <br>Enum:"html""text"<br>Supported by Google and Office365 accounts only. Body preview (snippet) is returned for other providers. Always, check the omitted\[\] array to determine if the response contains full body. |
| includeTrashAndJunk | boolean or null |
| nativeProperties | Array of strings or null (NativeProperty) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/messages
    -d q='text to:{address_or_name}'
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"threadId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"sentAt": "2019-08-24T14:15:22Z",\
\
"receivedAt": "2019-08-24T14:15:22Z",\
\
"internetMessageId": "string",\
\
"subject": "string",\
\
"sysLabels": ["junk"\
\
],\
\
"keywords": ["string"\
\
],\
\
"sysClassifications": ["personal"\
\
],\
\
"sensitivity": "normal",\
\
"meetingMessageMethod": "request",\
\
"from": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"hasAttachments": true,\
\
"body": "string",\
\
"bodySnippet": "string",\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"inReplyTo": "string",\
\
"references": "string",\
\
"threadIndex": "string",\
\
"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],\
\
"nativeProperties": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"folderId": "string",\
\
"webLink": "string",\
\
"omitted": ["threadId"\
\
]\
\
}\
\
]

}`

## [tag/Messages/operation/send](https://apirefs.aurinko.io/\#tag/Messages/operation/send) Send a new message

post/v1/email/messages

Production server

https://api.aurinko.io/v1/email/messages

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text" |
| returnIds | boolean or null<br>return message id and thread id if possible |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| from | object (EmailAddress) |
| subject | string |
| body | string |
| inReplyTo | string |
| references | string |
| to | Array of objects (EmailAddress) |
| cc | Array of objects (EmailAddress) |
| bcc | Array of objects (EmailAddress) |
| replyTo | Array of objects (EmailAddress) |
| xHeaders | Array of objects (EmailHeader) |
| attachments | Array of objects (OutgoingEmailAttachment) |
| tracking | object (OutEmailTrack) |
| followUp | object (FollowUpOutgoing) |
| keywords | Array of strings |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"from": {"name": "string",

"address": "user@example.com"

},

"subject": "string",

"body": "string",

"inReplyTo": "string",

"references": "string",

"to": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"xHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"attachments": [{"inline": true,\
\
"name": "string",\
\
"mimeType": "string",\
\
"contentId": "string",\
\
"content": "string"\
\
}\
\
],

"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

},

"followUp": {"ruleId": 0,

"actionVars": {"property1": "string",

"property2": "string"

}

},

"keywords": ["string"\
\
]

}`

### Response samples

- 201
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"status": "Ok",

"id": "string",

"submittedMessageId": "string",

"threadId": "string",

"trackingId": "string",

"processingStatus": "Ok",

"processingError": {"failedSteps": ["tracking"\
\
],

"errorMessage": "string"

}

}`

## [tag/Messages/operation/message](https://apirefs.aurinko.io/\#tag/Messages/operation/message) Get a message

get/v1/email/messages/{messageId}

Production server

https://api.aurinko.io/v1/email/messages/{messageId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string<br>email message identifier |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text"<br>Default html |
| nativeProperties | Array of strings or null (NativeProperty) |
| loadInlines | boolean or null<br>Default: false<br>automatically pre-load relevant inline attachments |
| stripQuoted | boolean or null<br>Default: false<br>strip quoted elements from message body |
| requireThreadId | boolean or null<br>Default: false<br>For IMAP accounts not supporting threads, wait for Aurinko to discover threads and provide its threadId |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**408**

threadId may be yet unavailable for some IMAP providers

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/messages/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"threadId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"sentAt": "2019-08-24T14:15:22Z",

"receivedAt": "2019-08-24T14:15:22Z",

"internetMessageId": "string",

"subject": "string",

"sysLabels": ["junk"\
\
],

"keywords": ["string"\
\
],

"sysClassifications": ["personal"\
\
],

"sensitivity": "normal",

"meetingMessageMethod": "request",

"from": {"name": "string",

"address": "user@example.com",

"raw": "string"

},

"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"hasAttachments": true,

"body": "string",

"bodySnippet": "string",

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"inReplyTo": "string",

"references": "string",

"threadIndex": "string",

"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"folderId": "string",

"webLink": "string",

"omitted": ["threadId"\
\
]

}`

## [tag/Messages/operation/deleteMessage](https://apirefs.aurinko.io/\#tag/Messages/operation/deleteMessage) Delete a message

delete/v1/email/messages/{messageId}

Production server

https://api.aurinko.io/v1/email/messages/{messageId}

Moves a message to Trash

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X DELETE https://api.aurinko.io/v1/email/messages/{messageId}'
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Messages/operation/messageRaw](https://apirefs.aurinko.io/\#tag/Messages/operation/messageRaw) Get a raw message

get/v1/email/messages/{messageId}/raw

Production server

https://api.aurinko.io/v1/email/messages/{messageId}/raw

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string<br>email message identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/messages/{id}/raw
```

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/Messages/operation/updateMessageStatus](https://apirefs.aurinko.io/\#tag/Messages/operation/updateMessageStatus) Update a message's status

post/v1/email/messages/{messageId}/status

Production server

https://api.aurinko.io/v1/email/messages/{messageId}/status

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| unread | boolean |
| archived | boolean |
| keywords | Array of strings |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"unread": true,

"archived": true,

"keywords": ["string"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Messages/operation/conversation](https://apirefs.aurinko.io/\#tag/Messages/operation/conversation) Get messages in a conversation

get/v1/email/conversations/{threadId}

Production server

https://api.aurinko.io/v1/email/conversations/{threadId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| threadId<br>required | string<br>conversation/thread identifier |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text"<br>Supported by Google and Office365 accounts only. Body preview (snippet) is returned for other providers. Always, check the omitted\[\] array to determine if the response contains full body. |
| pageToken | string or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/conversations/{threadId}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"threadId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"sentAt": "2019-08-24T14:15:22Z",\
\
"receivedAt": "2019-08-24T14:15:22Z",\
\
"internetMessageId": "string",\
\
"subject": "string",\
\
"sysLabels": ["junk"\
\
],\
\
"keywords": ["string"\
\
],\
\
"sysClassifications": ["personal"\
\
],\
\
"sensitivity": "normal",\
\
"meetingMessageMethod": "request",\
\
"from": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"hasAttachments": true,\
\
"body": "string",\
\
"bodySnippet": "string",\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"inReplyTo": "string",\
\
"references": "string",\
\
"threadIndex": "string",\
\
"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],\
\
"nativeProperties": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"folderId": "string",\
\
"webLink": "string",\
\
"omitted": ["threadId"\
\
]\
\
}\
\
]

}`

## [tag/Messages/operation/conversationFollowup](https://apirefs.aurinko.io/\#tag/Messages/operation/conversationFollowup) Get a conversation's followup info

get/v1/email/conversations/{threadId}/followup

Production server

https://api.aurinko.io/v1/email/conversations/{threadId}/followup

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| threadId<br>required | string<br>conversation/thread identifier |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text"<br>Supported by Google and Office365 accounts only. Body preview (snippet) is returned for other providers. Always, check the omitted\[\] array to determine if the response contains full body. |
| skipMailboxCheck | boolean or null<br>Default: false<br>When true, the system bypasses all mailbox validation and interaction. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/conversations/{threadId}/followup
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"lastSentEmail": {"id": "string",

"threadId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"sentAt": "2019-08-24T14:15:22Z",

"receivedAt": "2019-08-24T14:15:22Z",

"internetMessageId": "string",

"subject": "string",

"sysLabels": ["junk"\
\
],

"keywords": ["string"\
\
],

"sysClassifications": ["personal"\
\
],

"sensitivity": "normal",

"meetingMessageMethod": "request",

"from": {"name": "string",

"address": "user@example.com",

"raw": "string"

},

"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"hasAttachments": true,

"body": "string",

"bodySnippet": "string",

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"inReplyTo": "string",

"references": "string",

"threadIndex": "string",

"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"folderId": "string",

"webLink": "string",

"omitted": ["threadId"\
\
]

},

"followup": {"convoId": "string",

"subject": "string",

"status": "disabled",

"rule": {"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

},

"actionOverrides": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
],

"dripStartedAt": "2019-08-24T14:15:22Z",

"dripLastNum": 0,

"dripError": "string",

"dripEndedAt": "2019-08-24T14:15:22Z",

"actionVars": {"property1": "string",

"property2": "string"

},

"targets": ["string"\
\
],

"dripResponder": "string"

},

"mailboxError": "string",

"followupError": "string"

}`

## [tag/Messages/operation/reply](https://apirefs.aurinko.io/\#tag/Messages/operation/reply) Reply to a message

post/v1/email/messages/{messageId}/reply

Production server

https://api.aurinko.io/v1/email/messages/{messageId}/reply

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string<br>an identifier of a message the response is for |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text" |
| returnIds | boolean or null<br>return message id and thread id if possible |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| from | object (EmailAddress) |
| subject | string |
| body | string |
| to | Array of objects (EmailAddress) |
| cc | Array of objects (EmailAddress) |
| bcc | Array of objects (EmailAddress) |
| replyTo | Array of objects (EmailAddress) |
| xHeaders | Array of objects (EmailHeader) |
| attachments | Array of objects (OutgoingEmailAttachment) |
| tracking | object (OutEmailTrack) |
| followUp | object (FollowUpOutgoing) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"from": {"name": "string",

"address": "user@example.com"

},

"subject": "string",

"body": "string",

"to": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"xHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"attachments": [{"inline": true,\
\
"name": "string",\
\
"mimeType": "string",\
\
"contentId": "string",\
\
"content": "string"\
\
}\
\
],

"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

},

"followUp": {"ruleId": 0,

"actionVars": {"property1": "string",

"property2": "string"

}

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"status": "Ok",

"id": "string",

"submittedMessageId": "string",

"threadId": "string",

"trackingId": "string",

"processingStatus": "Ok",

"processingError": {"failedSteps": ["tracking"\
\
],

"errorMessage": "string"

}

}`

## [tag/Messages/operation/emailAttachment](https://apirefs.aurinko.io/\#tag/Messages/operation/emailAttachment) Get a message attachment

get/v1/email/messages/{messageId}/attachments/{attachmentId}

Production server

https://api.aurinko.io/v1/email/messages/{messageId}/attachments/{attachmentId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| messageId<br>required | string<br>email message identifier |
| attachmentId<br>required | string<br>attachment identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/messages/{msgId}/attachments/{attId}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"content": "string"

}`

## [tag/EmailSync](https://apirefs.aurinko.io/\#tag/EmailSync) Email sync

Sync/delta methods.

## [tag/EmailSync/operation/emailSyncStart](https://apirefs.aurinko.io/\#tag/EmailSync/operation/emailSyncStart) Start a new email sync

post/v1/email/sync

Production server

https://api.aurinko.io/v1/email/sync

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| daysWithin | integer<br>Scan emails received within last 'daysWithin' days. |
| bodyType | string (BodyType) <br>Enum:"html""text" |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/sync \
    -d daysWithin=7
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"syncUpdatedToken": "string",

"syncDeletedToken": "string",

"ready": true

}`

## [tag/EmailSync/operation/emailSyncUpdated](https://apirefs.aurinko.io/\#tag/EmailSync/operation/emailSyncUpdated) Request changed emails (deltas)

get/v1/email/sync/updated

Production server

https://api.aurinko.io/v1/email/sync/updated

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/sync/updated \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"threadId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"sentAt": "2019-08-24T14:15:22Z",\
\
"receivedAt": "2019-08-24T14:15:22Z",\
\
"internetMessageId": "string",\
\
"subject": "string",\
\
"sysLabels": ["junk"\
\
],\
\
"keywords": ["string"\
\
],\
\
"sysClassifications": ["personal"\
\
],\
\
"sensitivity": "normal",\
\
"meetingMessageMethod": "request",\
\
"from": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"hasAttachments": true,\
\
"body": "string",\
\
"bodySnippet": "string",\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"inReplyTo": "string",\
\
"references": "string",\
\
"threadIndex": "string",\
\
"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],\
\
"nativeProperties": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"folderId": "string",\
\
"webLink": "string",\
\
"omitted": ["threadId"\
\
]\
\
}\
\
]

}`

## [tag/EmailSync/operation/emailSyncDeleted](https://apirefs.aurinko.io/\#tag/EmailSync/operation/emailSyncDeleted) Request deleted emails (deltas)

get/v1/email/sync/deleted

Production server

https://api.aurinko.io/v1/email/sync/deleted

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/sync/deleted \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"folderId": "string",\
\
"internetMessageId": "string",\
\
"timestamp": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/Drafts](https://apirefs.aurinko.io/\#tag/Drafts) Draft messages

A draft message is a message which has not been sent yet. The drafts endpoints let you create new drafts, read existing drafts, and send drafts.

## [tag/Drafts/operation/createDraft](https://apirefs.aurinko.io/\#tag/Drafts/operation/createDraft) Create a new draft message

post/v1/email/drafts

Production server

https://api.aurinko.io/v1/email/drafts

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text" |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| from | object (EmailAddress) |
| subject | string |
| body | string |
| inReplyTo | string |
| references | string |
| to | Array of objects (EmailAddress) |
| cc | Array of objects (EmailAddress) |
| bcc | Array of objects (EmailAddress) |
| replyTo | Array of objects (EmailAddress) |
| xHeaders | Array of objects (EmailHeader) |
| attachments | Array of objects (OutgoingEmailAttachment) |
| tracking | object (OutEmailTrack) |
| followUp | object (FollowUpOutgoing) |
| keywords | Array of strings |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"from": {"name": "string",

"address": "user@example.com"

},

"subject": "string",

"body": "string",

"inReplyTo": "string",

"references": "string",

"to": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"xHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"attachments": [{"inline": true,\
\
"name": "string",\
\
"mimeType": "string",\
\
"contentId": "string",\
\
"content": "string"\
\
}\
\
],

"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

},

"followUp": {"ruleId": 0,

"actionVars": {"property1": "string",

"property2": "string"

}

},

"keywords": ["string"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": "string",

"webLink": "string"

}`

## [tag/Drafts/operation/updateDraft](https://apirefs.aurinko.io/\#tag/Drafts/operation/updateDraft) Update a draft message

put/v1/email/drafts/{draftId}

Production server

https://api.aurinko.io/v1/email/drafts/{draftId}

Works for Google and Office365 only

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>draft message identifier |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text" |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| from | object (EmailAddress) |
| subject | string |
| body | string |
| inReplyTo | string |
| references | string |
| to | Array of objects (EmailAddress) |
| cc | Array of objects (EmailAddress) |
| bcc | Array of objects (EmailAddress) |
| replyTo | Array of objects (EmailAddress) |
| xHeaders | Array of objects (EmailHeader) |
| attachments | Array of objects (OutgoingEmailAttachment) |
| tracking | object (OutEmailTrack) |
| followUp | object (FollowUpOutgoing) |
| keywords | Array of strings |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"from": {"name": "string",

"address": "user@example.com"

},

"subject": "string",

"body": "string",

"inReplyTo": "string",

"references": "string",

"to": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com"\
\
}\
\
],

"xHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"attachments": [{"inline": true,\
\
"name": "string",\
\
"mimeType": "string",\
\
"contentId": "string",\
\
"content": "string"\
\
}\
\
],

"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

},

"followUp": {"ruleId": 0,

"actionVars": {"property1": "string",

"property2": "string"

}

},

"keywords": ["string"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": "string",

"webLink": "string"

}`

## [tag/Drafts/operation/getDraft](https://apirefs.aurinko.io/\#tag/Drafts/operation/getDraft) Get a draft message

get/v1/email/drafts/{draftId}

Production server

https://api.aurinko.io/v1/email/drafts/{draftId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>draft message identifier |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text" |
| nativeProperties | Array of strings or null (NativeProperty) |
| loadInlines | boolean or null<br>Default: false<br>automatically pre-load relevant inline attachments |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/drafts/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"message": {"id": "string",

"threadId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"sentAt": "2019-08-24T14:15:22Z",

"receivedAt": "2019-08-24T14:15:22Z",

"internetMessageId": "string",

"subject": "string",

"sysLabels": ["junk"\
\
],

"keywords": ["string"\
\
],

"sysClassifications": ["personal"\
\
],

"sensitivity": "normal",

"meetingMessageMethod": "request",

"from": {"name": "string",

"address": "user@example.com",

"raw": "string"

},

"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],

"hasAttachments": true,

"body": "string",

"bodySnippet": "string",

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"inReplyTo": "string",

"references": "string",

"threadIndex": "string",

"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"folderId": "string",

"webLink": "string",

"omitted": ["threadId"\
\
]

},

"scheduled": {"jobId": 0,

"sendTime": "2019-08-24T14:15:22Z",

"status": "scheduled",

"errorMessage": "string"

}

}`

## [tag/Drafts/operation/deleteDraft](https://apirefs.aurinko.io/\#tag/Drafts/operation/deleteDraft) Delete a draft message

delete/v1/email/drafts/{draftId}

Production server

https://api.aurinko.io/v1/email/drafts/{draftId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>an identifier of a draft message |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X DELETE https://api.aurinko.io/v1/email/drafts/{draftId} \
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Drafts/operation/sendDraft](https://apirefs.aurinko.io/\#tag/Drafts/operation/sendDraft) Send a draft message

post/v1/email/drafts/{draftId}/send

Production server

https://api.aurinko.io/v1/email/drafts/{draftId}/send

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>an identifier of a draft message |

##### query Parameters

|     |     |
| --- | --- |
| sendTime | string or null <date-time> |
| returnIds | boolean or null<br>return message id and thread id if possible |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| tracking | object (OutEmailTrack) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"status": "Ok",

"id": "string",

"threadId": "string",

"trackingId": "string",

"processingStatus": "Ok",

"processingError": {"failedSteps": ["tracking"\
\
],

"errorMessage": "string"

}

}`

## [tag/EmailFolders](https://apirefs.aurinko.io/\#tag/EmailFolders) Email folders

List email folders, their attributes, and messages.

## [tag/EmailFolders/operation/folders](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/folders) List email folders

get/v1/email/folders

Production server

https://api.aurinko.io/v1/email/folders

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/folders
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"length": 0,

"records": [{"id": "string",\
\
"name": "string",\
\
"fullName": "string",\
\
"isFolder": true,\
\
"isLabel": true,\
\
"parentId": "string",\
\
"sysLabel": "junk"\
\
}\
\
]

}`

## [tag/EmailFolders/operation/createFolder](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/createFolder) Create a new email folder

post/v1/email/folders

Production server

https://api.aurinko.io/v1/email/folders

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string |
| parentId | string<br>parent folder identifier |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"name": "string",

"parentId": "string"

}`

### Response samples

- 201
- 401

Content type

application/json

Copy

`{"id": "string",

"name": "string",

"fullName": "string",

"isFolder": true,

"isLabel": true,

"parentId": "string",

"sysLabel": "junk"

}`

## [tag/EmailFolders/operation/wellKnownFolders](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/wellKnownFolders) List wellKnown email folders

get/v1/email/folders/wellKnown

Production server

https://api.aurinko.io/v1/email/folders/wellKnown

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/folders/wellKnown
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"archive": "string",

"sent": "string"

}`

## [tag/EmailFolders/operation/updateWellKnownFolders](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/updateWellKnownFolders) Update wellKnown email folders

patch/v1/email/folders/wellKnown

Production server

https://api.aurinko.io/v1/email/folders/wellKnown

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| archive | string<br>an xid of folder - to mark it as Archive, set to null to clear Archive folder |
| sent | string<br>an xid of folder marked as an Sent, set to null to clear |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"archive": "string",

"sent": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"archive": "string",

"sent": "string"

}`

## [tag/EmailFolders/operation/folder](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/folder) Get an email folder

get/v1/email/folders/{folderId}

Production server

https://api.aurinko.io/v1/email/folders/{folderId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| folderId<br>required | string<br>email folder identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/folders/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": "string",

"name": "string",

"fullName": "string",

"isFolder": true,

"isLabel": true,

"parentId": "string",

"sysLabel": "junk"

}`

## [tag/EmailFolders/operation/folderEmails](https://apirefs.aurinko.io/\#tag/EmailFolders/operation/folderEmails) List email messages in a specified folder

get/v1/email/folders/{folderId}/messages

Production server

https://api.aurinko.io/v1/email/folders/{folderId}/messages

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| folderId<br>required | string |

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null |
| q | string or null<br>Only return messages matching the specified query. For example, "from: [someuser@example.com](mailto:someuser@example.com) after:01/01/2020" |
| bodyType | string (BodyType) <br>Enum:"html""text" |
| nativeProperties | Array of strings or null (NativeProperty) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/messages
    -d q='text to:{address_or_name}'
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"threadId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"sentAt": "2019-08-24T14:15:22Z",\
\
"receivedAt": "2019-08-24T14:15:22Z",\
\
"internetMessageId": "string",\
\
"subject": "string",\
\
"sysLabels": ["junk"\
\
],\
\
"keywords": ["string"\
\
],\
\
"sysClassifications": ["personal"\
\
],\
\
"sensitivity": "normal",\
\
"meetingMessageMethod": "request",\
\
"from": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"to": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"cc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"bcc": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"replyTo": [{"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
],\
\
"hasAttachments": true,\
\
"body": "string",\
\
"bodySnippet": "string",\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"inReplyTo": "string",\
\
"references": "string",\
\
"threadIndex": "string",\
\
"internetHeaders": [{"name": "string",\
\
"value": "string"\
\
}\
\
],\
\
"nativeProperties": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"folderId": "string",\
\
"webLink": "string",\
\
"omitted": ["threadId"\
\
]\
\
}\
\
]

}`

## [tag/EmailTracking](https://apirefs.aurinko.io/\#tag/EmailTracking) Email tracking

Track email opens.

## [tag/EmailTracking/operation/createDraftTracking](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/createDraftTracking) Create tracking for a draft message

post/v1/email/draftTracking/create

Production server

https://api.aurinko.io/v1/email/draftTracking/create

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| draftId<br>required | string or null<br>an identifier of a draft message for start tracking |
| ignoreNotFound | boolean or null<br>if draft was not found, store tracking data anyway |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| htmlText | string |
| tracking | object (OutEmailTrack) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"htmlText": "string",

"tracking": {"threadReplies": true,

"opens": true,

"links": true,

"trackOpensAfterSendDelay": 5,

"context": "string",

"customDomainAlias": "string"

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"trackReplies": true,

"htmlBody": "string",

"trackingCode": "string",

"context": "string",

"linkCodes": [{ }\
\
],

"trackingId": "string"

}`

## [tag/EmailTracking/operation/convertDraftTracking](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/convertDraftTracking) Mark draft's tracking as sent

patch/v1/email/draftTracking/{draftId}/convert

Production server

https://api.aurinko.io/v1/email/draftTracking/{draftId}/convert

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>an identifier of a draft message |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| threadId | string |
| messageId | string |
| internetMessageId | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"threadId": "string",

"messageId": "string",

"internetMessageId": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/EmailTracking/operation/updateDraftTracking](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/updateDraftTracking) Modify draft's tracking

patch/v1/email/draftTracking/{draftId}

Production server

https://api.aurinko.io/v1/email/draftTracking/{draftId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| draftId<br>required | string<br>an identifier of a draft message |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| context | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"context": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/EmailTracking/operation/getTracking](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/getTracking) List tracking data

get/v1/email/tracking

Production server

https://api.aurinko.io/v1/email/tracking

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| withActivityOnly | boolean or null<br>Default: false<br>return only those where an open or click happened |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |
| contextContains | string or null |
| threadId | string or null<br>identifier of thread |
| showSentOnly | boolean or null<br>Default: true<br>return tracking which started message was sent |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/tracking
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"messageId": "string",\
\
"inetMessageId": "string",\
\
"threadId": "string",\
\
"sendDate": "2019-08-24T14:15:22Z",\
\
"lastActivityTime": "2019-08-24T14:15:22Z",\
\
"lastRespondedTime": "2019-08-24T14:15:22Z",\
\
"trackReplies": true,\
\
"trackOpens": true,\
\
"trackingCode": "string",\
\
"context": "string",\
\
"location": "string",\
\
"userAgent": "string",\
\
"remoteAddr": "string",\
\
"openCount": 0,\
\
"ignoreOpenClicks": true,\
\
"hasBounced": true\
\
}\
\
]

}`

## [tag/EmailTracking/operation/purgeMyTracking](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/purgeMyTracking) Purge recent activity for a user

post/v1/email/tracking/purgeMyTracking

Production server

https://api.aurinko.io/v1/email/tracking/purgeMyTracking

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| threadId | string or null |

##### header Parameters

|     |     |
| --- | --- |
| User-Agent<br>required | string<br>User-Agent |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
     -H 'User-Agent: <User-Agent>' \
    -X POST https://api.aurinko.io/v1/email/tracking/purgeMyTracking
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/EmailTracking/operation/switchOpenClicks](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/switchOpenClicks) Set ignore open/click tracking for а message

post/v1/email/tracking/ignoreOpenClicks

Production server

https://api.aurinko.io/v1/email/tracking/ignoreOpenClicks

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| messageId | string or null<br>message identifier |
| inetMessageId | string or null<br>internet message identifier |
| isIgnored<br>required | boolean<br>should be ignored or not |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X POST https://api.aurinko.io/v1/email/tracking/ignoreOpenClicks
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/EmailTracking/operation/getTrackingEvents](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/getTrackingEvents) List all tracking events

get/v1/email/tracking/events

Production server

https://api.aurinko.io/v1/email/tracking/events

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| threadId | string or null<br>conversation id |
| from | string or null <datetime> <br>event start dateTime (strictly greater) |
| to | string or null <datetime> <br>event end dateTime (smaller or equal) |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/tracking/events
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"eventType": "open",\
\
"location": "string",\
\
"userAgent": "string",\
\
"referrer": "string",\
\
"remoteAddr": "string",\
\
"targetUrl": "string",\
\
"openNumber": 0,\
\
"threadId": "string",\
\
"messageId": "string",\
\
"internetMessageId": "string",\
\
"trackingId": 0,\
\
"trackingThreadId": "string",\
\
"trackingMessageId": "string",\
\
"trackingInternetMessageId": "string",\
\
"context": "string",\
\
"trackingCode": "string"\
\
}\
\
]

}`

## [tag/EmailTracking/operation/trackingById](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/trackingById) Get tracking data by Id

get/v1/email/tracking/{id}

Production server

https://api.aurinko.io/v1/email/tracking/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>Tracking data id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/tracking/{id}'
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": 0,

"messageId": "string",

"inetMessageId": "string",

"threadId": "string",

"sendDate": "2019-08-24T14:15:22Z",

"lastActivityTime": "2019-08-24T14:15:22Z",

"lastRespondedTime": "2019-08-24T14:15:22Z",

"trackReplies": true,

"trackOpens": true,

"trackingCode": "string",

"context": "string",

"location": "string",

"userAgent": "string",

"remoteAddr": "string",

"openCount": 0,

"ignoreOpenClicks": true,

"hasBounced": true

}`

## [tag/EmailTracking/operation/trackingEvents](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/trackingEvents) List tracking events

get/v1/email/tracking/{id}/events

Production server

https://api.aurinko.io/v1/email/tracking/{id}/events

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>Tracking id |

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/tracking/{id}/events
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"createdAt": "2019-08-24T14:15:22Z",\
\
"eventType": "open",\
\
"location": "string",\
\
"userAgent": "string",\
\
"referrer": "string",\
\
"remoteAddr": "string",\
\
"targetUrl": "string",\
\
"openNumber": 0,\
\
"threadId": "string",\
\
"messageId": "string",\
\
"internetMessageId": "string",\
\
"trackingId": 0,\
\
"trackingThreadId": "string",\
\
"trackingMessageId": "string",\
\
"trackingInternetMessageId": "string",\
\
"context": "string",\
\
"trackingCode": "string"\
\
}\
\
]

}`

## [tag/EmailTracking/operation/trackingEventById](https://apirefs.aurinko.io/\#tag/EmailTracking/operation/trackingEventById) Get tracking event by Id

get/v1/email/tracking/{trackingId}/events/{id}

Production server

https://api.aurinko.io/v1/email/tracking/{trackingId}/events/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| trackingId<br>required | integer <int64> <br>Tracking data id |
| id<br>required | integer <int64> <br>Tracking event id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/email/tracking/{trackingId}/events/{id}'
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": 0,

"createdAt": "2019-08-24T14:15:22Z",

"eventType": "open",

"location": "string",

"userAgent": "string",

"referrer": "string",

"remoteAddr": "string",

"targetUrl": "string",

"openNumber": 0,

"threadId": "string",

"messageId": "string",

"internetMessageId": "string",

"trackingId": 0,

"trackingThreadId": "string",

"trackingMessageId": "string",

"trackingInternetMessageId": "string",

"context": "string",

"trackingCode": "string"

}`

## [tag/FollowUpRobot](https://apirefs.aurinko.io/\#tag/FollowUpRobot) Follow-up and templates

Follow-up rules allow you to define automatic email follow-up (drip) sequences and email templates. List, create, update, and delete follow-up rules associated with a mailbox account. Check status of a drip sequence for a given email thread, or activate a drip sequence.

## [tag/FollowUpRobot/operation/getConfig](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/getConfig) Get a follow up configuration

get/v1/followup/config

Production server

https://api.aurinko.io/v1/followup/config

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"timezone": "string",

"emailAliases": ["user@example.com"\
\
]

}`

## [tag/FollowUpRobot/operation/updateConfig](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/updateConfig) Update a follow up configuration

put/v1/followup/config

Production server

https://api.aurinko.io/v1/followup/config

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timezone | string |
| emailAliases | Array of strings <email> \[ items <email > \] |

### Responses

**200**

A result of changed configuration

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"timezone": "string",

"emailAliases": ["user@example.com"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"timezone": "string",

"emailAliases": ["user@example.com"\
\
]

}`

## [tag/FollowUpRobot/operation/getRules](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/getRules) Get follow up rules

get/v1/followup/rules

Production server

https://api.aurinko.io/v1/followup/rules

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

A list of rules

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

}`

## [tag/FollowUpRobot/operation/createRule](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/createRule) Add a follow up rule

post/v1/followup/rules

Production server

https://api.aurinko.io/v1/followup/rules

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string |
| expectThreadResponse | boolean |
| templateBody | string |
| templateSubject | string |
| actions | Array of objects (FollowupRuleAction) |

### Responses

**200**

A result of add rule

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

}`

## [tag/FollowUpRobot/operation/updateRule](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/updateRule) Update a follow up rule

put/v1/followup/rules/{id}

Production server

https://api.aurinko.io/v1/followup/rules/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string |
| expectThreadResponse | boolean |
| templateBody | string |
| templateSubject | string |
| actions | Array of objects (FollowupRuleAction) |

### Responses

**200**

A result of changed rule

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

}`

## [tag/FollowUpRobot/operation/deleteRule](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/deleteRule) Delete a follow up rule

delete/v1/followup/rules/{id}

Production server

https://api.aurinko.io/v1/followup/rules/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/FollowUpRobot/operation/getConversationsDripStatus](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/getConversationsDripStatus) Get a list of conversations touched by followup

get/v1/followup/conversations

Production server

https://api.aurinko.io/v1/followup/conversations

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| active | boolean or null<br>active or inactive threads, by default all threads returned |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>page offset |

### Responses

**200**

A result of conversations with followup

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"convoId": "string",\
\
"subject": "string",\
\
"status": "disabled",\
\
"rule": {"id": 0,\
\
"name": "string",\
\
"expectThreadResponse": true,\
\
"templateBody": "string",\
\
"templateSubject": "string",\
\
"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]\
\
},\
\
"actionOverrides": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
],\
\
"dripStartedAt": "2019-08-24T14:15:22Z",\
\
"dripLastNum": 0,\
\
"dripError": "string",\
\
"dripEndedAt": "2019-08-24T14:15:22Z",\
\
"actionVars": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"targets": ["string"\
\
],\
\
"dripResponder": "string"\
\
}\
\
]

}`

## [tag/FollowUpRobot/operation/getConversationDripStatus](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/getConversationDripStatus) Check a conversation status

get/v1/followup/conversations/{convoId}

Production server

https://api.aurinko.io/v1/followup/conversations/{convoId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| convoId<br>required | string<br>thread identifier |

### Responses

**200**

A conversation status response

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"convoId": "string",

"subject": "string",

"status": "disabled",

"rule": {"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

},

"actionOverrides": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
],

"dripStartedAt": "2019-08-24T14:15:22Z",

"dripLastNum": 0,

"dripError": "string",

"dripEndedAt": "2019-08-24T14:15:22Z",

"actionVars": {"property1": "string",

"property2": "string"

},

"targets": ["string"\
\
],

"dripResponder": "string"

}`

## [tag/FollowUpRobot/operation/updateConversationDripStatus](https://apirefs.aurinko.io/\#tag/FollowUpRobot/operation/updateConversationDripStatus) Update a conversation status

put/v1/followup/conversations/{convoId}

Production server

https://api.aurinko.io/v1/followup/conversations/{convoId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| convoId<br>required | string<br>thread identifier |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| status | string<br>Enum:"disabled""active" |
| ruleId | integer <int64> |
| actionOverrides | Array of objects (FollowupRuleAction) <br>These actions override the ones defined in the specified ruleId. If this field is null or empty, the actions from the ruleId will be applied by default. |
| dripAfter | string <date-time> |
| targets | Array of strings |
| actionVars | object |

### Responses

**200**

A result of applying drip

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"status": "disabled",

"ruleId": 0,

"actionOverrides": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
],

"dripAfter": "2019-08-24T14:15:22Z",

"targets": ["string"\
\
],

"actionVars": {"property1": "string",

"property2": "string"

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"convoId": "string",

"subject": "string",

"status": "disabled",

"rule": {"id": 0,

"name": "string",

"expectThreadResponse": true,

"templateBody": "string",

"templateSubject": "string",

"actions": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
]

},

"actionOverrides": [{"intervalDays": 0,\
\
"message": "string"\
\
}\
\
],

"dripStartedAt": "2019-08-24T14:15:22Z",

"dripLastNum": 0,

"dripError": "string",

"dripEndedAt": "2019-08-24T14:15:22Z",

"actionVars": {"property1": "string",

"property2": "string"

},

"targets": ["string"\
\
],

"dripResponder": "string"

}`

## [tag/Calendars](https://apirefs.aurinko.io/\#tag/Calendars) Calendars

Each account connected to Aurino can have zero or more calendars, and each calendar has a collection of individual events.

## [tag/Calendars/operation/calendars](https://apirefs.aurinko.io/\#tag/Calendars/operation/calendars) Request list of calendars

get/v1/calendars

Production server

https://api.aurinko.io/v1/calendars

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request (for the first page it must be empty) |
| withShared | boolean or null<br>Default: false<br>Shows shared calendars if any available |
| mode | string (CalendarMode) <br>Enum:"user""group"<br>Calendar type to request (make sense only for Office365) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/calendars
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"name": "string",\
\
"color": "string",\
\
"description": "string",\
\
"accessRole": "owner",\
\
"primary": true,\
\
"multipleRemindersSupported": true,\
\
"defaultReminders": [{"minutes": 0\
\
}\
\
]\
\
}\
\
]

}`

## [tag/Calendars/operation/createCalendar](https://apirefs.aurinko.io/\#tag/Calendars/operation/createCalendar) Create new calendar

post/v1/calendars

Production server

https://api.aurinko.io/v1/calendars

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string |
| color | string |
| description | string |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"name": "string",

"color": "string",

"description": "string"

}`

### Response samples

- 201
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"name": "string",

"color": "string",

"description": "string",

"accessRole": "owner",

"primary": true,

"multipleRemindersSupported": true,

"defaultReminders": [{"minutes": 0\
\
}\
\
]

}`

## [tag/Calendars/operation/calendarById](https://apirefs.aurinko.io/\#tag/Calendars/operation/calendarById) Get a calendar

get/v1/calendars/{id}

Production server

https://api.aurinko.io/v1/calendars/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | string<br>Calendar id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/calendars/primary
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"name": "string",

"color": "string",

"description": "string",

"accessRole": "owner",

"primary": true,

"multipleRemindersSupported": true,

"defaultReminders": [{"minutes": 0\
\
}\
\
]

}`

## [tag/Calendars/operation/updateCalendar](https://apirefs.aurinko.io/\#tag/Calendars/operation/updateCalendar) Update a calendar

patch/v1/calendars/{id}

Production server

https://api.aurinko.io/v1/calendars/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | string<br>Calendar id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string |
| description | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"name": "string",

"description": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"name": "string",

"color": "string",

"description": "string",

"accessRole": "owner",

"primary": true,

"multipleRemindersSupported": true,

"defaultReminders": [{"minutes": 0\
\
}\
\
]

}`

## [tag/Events](https://apirefs.aurinko.io/\#tag/Events) Calendar events

Events are objects within a calendar, generally supporting all features of modern scheduling apps. Using the calendar APIs, your application can schedule events, send meeting invitations, RSVP, and more.

## [tag/Events/operation/range](https://apirefs.aurinko.io/\#tag/Events/operation/range) Request events in a range

get/v1/calendars/{calendarId}/events/range

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/range

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| timeMin<br>required | string <date-time> <br>Lower bound (exclusive) for an event's end time to filter by. Must be an RFC3339 timestamp with mandatory time zone offset, for example, 2011-06-03T10:00:00-07:00, 2011-06-03T10:00:00Z. If timeMax is set, timeMin must be smaller than timeMax. |
| timeMax<br>required | string <date-time> <br>Upper bound (exclusive) for an event's start time to filter by. Must be an RFC3339 timestamp with mandatory time zone offset, for example, 2011-06-03T10:00:00-07:00, 2011-06-03T10:00:00Z. Milliseconds may be provided but are ignored. If timeMin is set, timeMax must be greater than timeMin. |
| pageToken | string or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/calendars/primary/events/range \
    -d timeMin=2019-06-03T10:00:00-07:00 \
    -d timeMax=2020-06-03T10:00:00-07:00
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"calendarId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"subject": "string",\
\
"description": "string",\
\
"location": "string",\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"end": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"organizer": {"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
},\
\
"meetingInfo": {"canceled": true,\
\
"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],\
\
"response": "noResponse",\
\
"attendeePermissions": ["inviteOthers"\
\
],\
\
"onlineMeetingProvider": "string",\
\
"onlineMeetingDetails": {"id": "string",\
\
"url": "string",\
\
"phone": "string",\
\
"pin": "string",\
\
"regionCode": "string",\
\
"sip": "string",\
\
"infoUrl": "string"\
\
}\
\
},\
\
"recurrenceType": "single",\
\
"recurrence": {"original": "simple",\
\
"ical": {"rules": ["string"\
\
],\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
},\
\
"simple": {"pattern": {"frequency": "daily",\
\
"interval": 1,\
\
"daysOfWeek": ["monday"\
\
],\
\
"weekStart": "monday",\
\
"dayOfMonth": 1,\
\
"monthOfYear": 1,\
\
"instance": "first"\
\
},\
\
"range": {"type": "byDate",\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"recurrenceEnd": "2019-08-24",\
\
"count": 1,\
\
"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]\
\
}\
\
}\
\
},\
\
"reminder": {"useDefault": true,\
\
"overrides": [{"minutes": 0\
\
}\
\
]\
\
},\
\
"occurrenceInfo": {"id": "string",\
\
"type": "regular",\
\
"originalStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"masterId": "string"\
\
},\
\
"iCalUid": "string",\
\
"globalId": "string",\
\
"showAs": "free",\
\
"sensitivity": "normal",\
\
"categories": ["string"\
\
],\
\
"htmlLink": "string",\
\
"hasAttachments": true,\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"omitted": ["description"\
\
]\
\
}\
\
]

}`

## [tag/Events/operation/eventsByICalUIds](https://apirefs.aurinko.io/\#tag/Events/operation/eventsByICalUIds) Request events by ICalUid's

get/v1/calendars/{calendarId}/events/find

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/find

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| iCalUId<br>required | Array of strings<br>Find all events that match specified ICalUid's |
| pageToken | string or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/calendars/primary/events/find \
    -d ICalUid=ABCID1 \
    -d ICalUid=XYZID2
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"calendarId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"subject": "string",\
\
"description": "string",\
\
"location": "string",\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"end": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"organizer": {"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
},\
\
"meetingInfo": {"canceled": true,\
\
"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],\
\
"response": "noResponse",\
\
"attendeePermissions": ["inviteOthers"\
\
],\
\
"onlineMeetingProvider": "string",\
\
"onlineMeetingDetails": {"id": "string",\
\
"url": "string",\
\
"phone": "string",\
\
"pin": "string",\
\
"regionCode": "string",\
\
"sip": "string",\
\
"infoUrl": "string"\
\
}\
\
},\
\
"recurrenceType": "single",\
\
"recurrence": {"original": "simple",\
\
"ical": {"rules": ["string"\
\
],\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
},\
\
"simple": {"pattern": {"frequency": "daily",\
\
"interval": 1,\
\
"daysOfWeek": ["monday"\
\
],\
\
"weekStart": "monday",\
\
"dayOfMonth": 1,\
\
"monthOfYear": 1,\
\
"instance": "first"\
\
},\
\
"range": {"type": "byDate",\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"recurrenceEnd": "2019-08-24",\
\
"count": 1,\
\
"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]\
\
}\
\
}\
\
},\
\
"reminder": {"useDefault": true,\
\
"overrides": [{"minutes": 0\
\
}\
\
]\
\
},\
\
"occurrenceInfo": {"id": "string",\
\
"type": "regular",\
\
"originalStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"masterId": "string"\
\
},\
\
"iCalUid": "string",\
\
"globalId": "string",\
\
"showAs": "free",\
\
"sensitivity": "normal",\
\
"categories": ["string"\
\
],\
\
"htmlLink": "string",\
\
"hasAttachments": true,\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"omitted": ["description"\
\
]\
\
}\
\
]

}`

## [tag/Events/operation/event](https://apirefs.aurinko.io/\#tag/Events/operation/event) Get an event

get/v1/calendars/{calendarId}/events/{eventId}

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{eventId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| eventId<br>required | string<br>Event id |

##### query Parameters

|     |     |
| --- | --- |
| nativeProperties | Array of strings or null (NativeProperty) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/calendars/primary/events/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"calendarId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"organizer": {"id": "string",

"emailAddress": {"name": "string",

"address": "user@example.com",

"raw": "string"

}

},

"meetingInfo": {"canceled": true,

"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

},

"recurrenceType": "single",

"recurrence": {"original": "simple",

"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1,

"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"iCalUid": "string",

"globalId": "string",

"showAs": "free",

"sensitivity": "normal",

"categories": ["string"\
\
],

"htmlLink": "string",

"hasAttachments": true,

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"omitted": ["description"\
\
]

}`

## [tag/Events/operation/updateEvent](https://apirefs.aurinko.io/\#tag/Events/operation/updateEvent) Update an event

patch/v1/calendars/{calendarId}/events/{eventId}

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{eventId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| eventId<br>required | string<br>Event id |

##### query Parameters

|     |     |
| --- | --- |
| notifyAttendees | boolean or null<br>Default: true |
| returnRecord | boolean or null<br>Default: true<br>Whether response must contain a record that has been updated. This can result in an additional request to provider API. |

##### header Parameters

|     |     |
| --- | --- |
| If-Match<br>required | string<br>The HTTP entity tag of the resource (ETag). Used for web cache validation. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| subject | string |
| description | string |
| location | string |
| start | object (EventDateTime) |
| end | object (EventDateTime) |
| meetingInfo | object (MeetingInfo) |
| recurrence | object (Recurrence) |
| reminder | object (Reminder) |
| occurrenceInfo | object (OccurrenceInfo) |
| showAs | string (ShowAs) <br>Enum:"free""busy""tentative""outOfOffice""unknown" |
| sensitivity | string (Sensitivity) <br>Enum:"normal""private""personal""confidential" |
| attachments | Array of objects (EmailAttachment) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"meetingInfo": {"attendees": [{"emailAddress": {"name": "string",\
\
"address": "user@example.com"\
\
},\
\
"type": "required"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeeting": true,

"onlineMeetingProvider": "string"

},

"recurrence": {"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"showAs": "free",

"sensitivity": "normal",

"attachments": [{ }\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"iCalUId": "string",

"globalId": "string",

"record": {"id": "string",

"etag": "string",

"calendarId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"organizer": {"id": "string",

"emailAddress": {"name": "string",

"address": "user@example.com",

"raw": "string"

}

},

"meetingInfo": {"canceled": true,

"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

},

"recurrenceType": "single",

"recurrence": {"original": "simple",

"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1,

"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"iCalUid": "string",

"globalId": "string",

"showAs": "free",

"sensitivity": "normal",

"categories": ["string"\
\
],

"htmlLink": "string",

"hasAttachments": true,

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"omitted": ["description"\
\
]

},

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

}`

## [tag/Events/operation/deleteEvent](https://apirefs.aurinko.io/\#tag/Events/operation/deleteEvent) Delete an event

delete/v1/calendars/{calendarId}/events/{eventId}

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{eventId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| eventId<br>required | string<br>Event id |

##### query Parameters

|     |     |
| --- | --- |
| notifyAttendees | boolean or null<br>Default: true |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X DELETE -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/calendars/primary/events/<eventId>
```

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/Events/operation/seriesInfo](https://apirefs.aurinko.io/\#tag/Events/operation/seriesInfo) Request a series description

get/v1/calendars/{calendarId}/events/{masterId}/series

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{masterId}/series

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| masterId<br>required | string<br>Master event id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/calendars/primary/events/{masterId}/series
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"globalId": "string",

"recurrence": {"original": "simple",

"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1,

"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]

}

}

},

"modifiedOccurrences": [{"id": "string",\
\
"type": "regular",\
\
"originalStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"masterId": "string"\
\
}\
\
],

"deletedOccurrences": [{"id": "string",\
\
"type": "regular",\
\
"originalStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"masterId": "string"\
\
}\
\
]

}`

## [tag/Events/operation/occurrenceByOrigStart](https://apirefs.aurinko.io/\#tag/Events/operation/occurrenceByOrigStart) Request an occurrence by original start time

get/v1/calendars/{calendarId}/events/{masterId}/occurrences/{ost}

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{masterId}/occurrences/{ost}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| masterId<br>required | string<br>Master event id |
| ost<br>required | string <datetime> <br>Original start time |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/calendars/primary/events/{masterId}/occurrences/2020-04-01
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"calendarId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"organizer": {"id": "string",

"emailAddress": {"name": "string",

"address": "user@example.com",

"raw": "string"

}

},

"meetingInfo": {"canceled": true,

"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

},

"recurrenceType": "single",

"recurrence": {"original": "simple",

"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1,

"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"iCalUid": "string",

"globalId": "string",

"showAs": "free",

"sensitivity": "normal",

"categories": ["string"\
\
],

"htmlLink": "string",

"hasAttachments": true,

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"omitted": ["description"\
\
]

}`

## [tag/Events/operation/createEvent](https://apirefs.aurinko.io/\#tag/Events/operation/createEvent) Create a new event

post/v1/calendars/{calendarId}/events

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| notifyAttendees | boolean or null<br>Default: true |
| bodyType | string (BodyType) <br>Enum:"html""text" |
| returnRecord | boolean or null<br>Default: true<br>Whether response must contain a record that has been created. This can result in an additional request to provider API. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| subject | string |
| description | string |
| location | string |
| start | object (EventDateTime) |
| end | object (EventDateTime) |
| meetingInfo | object (MeetingInfo) |
| recurrence | object (Recurrence) |
| reminder | object (Reminder) |
| occurrenceInfo | object (OccurrenceInfo) |
| showAs | string (ShowAs) <br>Enum:"free""busy""tentative""outOfOffice""unknown" |
| sensitivity | string (Sensitivity) <br>Enum:"normal""private""personal""confidential" |
| attachments | Array of objects (EmailAttachment) |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"meetingInfo": {"attendees": [{"emailAddress": {"name": "string",\
\
"address": "user@example.com"\
\
},\
\
"type": "required"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeeting": true,

"onlineMeetingProvider": "string"

},

"recurrence": {"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"showAs": "free",

"sensitivity": "normal",

"attachments": [{ }\
\
]

}`

### Response samples

- 201
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"iCalUId": "string",

"globalId": "string",

"record": {"id": "string",

"etag": "string",

"calendarId": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"subject": "string",

"description": "string",

"location": "string",

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"end": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"organizer": {"id": "string",

"emailAddress": {"name": "string",

"address": "user@example.com",

"raw": "string"

}

},

"meetingInfo": {"canceled": true,

"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],

"response": "noResponse",

"attendeePermissions": ["inviteOthers"\
\
],

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

},

"recurrenceType": "single",

"recurrence": {"original": "simple",

"ical": {"rules": ["string"\
\
],

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

}

},

"simple": {"pattern": {"frequency": "daily",

"interval": 1,

"daysOfWeek": ["monday"\
\
],

"weekStart": "monday",

"dayOfMonth": 1,

"monthOfYear": 1,

"instance": "first"

},

"range": {"type": "byDate",

"recurrenceStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"recurrenceEnd": "2019-08-24",

"count": 1,

"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]

}

}

},

"reminder": {"useDefault": true,

"overrides": [{"minutes": 0\
\
}\
\
]

},

"occurrenceInfo": {"id": "string",

"type": "regular",

"originalStart": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"start": {"dateOnly": "2019-08-24",

"dateTime": "2019-08-24T14:15:22Z",

"timezone": "string"

},

"masterId": "string"

},

"iCalUid": "string",

"globalId": "string",

"showAs": "free",

"sensitivity": "normal",

"categories": ["string"\
\
],

"htmlLink": "string",

"hasAttachments": true,

"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],

"omitted": ["description"\
\
]

},

"onlineMeetingProvider": "string",

"onlineMeetingDetails": {"id": "string",

"url": "string",

"phone": "string",

"pin": "string",

"regionCode": "string",

"sip": "string",

"infoUrl": "string"

}

}`

## [tag/Events/operation/updateMeetingResponse](https://apirefs.aurinko.io/\#tag/Events/operation/updateMeetingResponse) Update meeting response

put/v1/calendars/{calendarId}/events/{eventId}/response

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{eventId}/response

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| eventId<br>required | string<br>Event id |

##### query Parameters

|     |     |
| --- | --- |
| notifyAttendees | boolean or null<br>Default: true |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| response<br>required | string (MeetingResponseType) <br>Enum:"noResponse""declined""tentative""accepted" |
| comment | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"response": "noResponse",

"comment": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Events/operation/attachment](https://apirefs.aurinko.io/\#tag/Events/operation/attachment) Get an event attachment

get/v1/calendars/{calendarId}/events/{eventId}/attachments/{attachmentId}

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/events/{eventId}/attachments/{attachmentId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |
| eventId<br>required | string<br>Event id |
| attachmentId<br>required | string<br>attachment identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/email/messages/{msgId}/attachments/{attId}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"content": "string"

}`

## [tag/CalSync](https://apirefs.aurinko.io/\#tag/CalSync) Calendar sync

Sync/delta methods.

## [tag/CalSync/operation/calSyncStart](https://apirefs.aurinko.io/\#tag/CalSync/operation/calSyncStart) Start a new calendar sync

post/v1/calendars/{calendarId}/sync

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/sync

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| timeMin<br>required | string <date-time> <br>Lower bound (exclusive) for an event's end time to filter by. Must be an RFC3339 timestamp with mandatory time zone offset, for example, 2011-06-03T10:00:00-07:00, 2011-06-03T10:00:00Z. If timeMax is set, timeMin must be smaller than timeMax. |
| timeMax<br>required | string <date-time> <br>Upper bound (exclusive) for an event's start time to filter by. Must be an RFC3339 timestamp with mandatory time zone offset, for example, 2011-06-03T10:00:00-07:00, 2011-06-03T10:00:00Z. Milliseconds may be provided but are ignored. If timeMin is set, timeMax must be greater than timeMin. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/calendars/primary/sync \
    -d timeMin=2019-06-03T10:00:00-07:00 \
    -d timeMax=2020-06-03T10:00:00-07:00
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"syncUpdatedToken": "string",

"syncDeletedToken": "string",

"ready": true

}`

## [tag/CalSync/operation/calSyncUpdated](https://apirefs.aurinko.io/\#tag/CalSync/operation/calSyncUpdated) Request changed events (deltas)

get/v1/calendars/{calendarId}/sync/updated

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/sync/updated

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/calendars/primary/sync/updated \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"calendarId": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"subject": "string",\
\
"description": "string",\
\
"location": "string",\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"end": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"organizer": {"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
}\
\
},\
\
"meetingInfo": {"canceled": true,\
\
"attendees": [{"id": "string",\
\
"emailAddress": {"name": "string",\
\
"address": "user@example.com",\
\
"raw": "string"\
\
},\
\
"type": "required",\
\
"response": "accepted",\
\
"comment": "string"\
\
}\
\
],\
\
"response": "noResponse",\
\
"attendeePermissions": ["inviteOthers"\
\
],\
\
"onlineMeetingProvider": "string",\
\
"onlineMeetingDetails": {"id": "string",\
\
"url": "string",\
\
"phone": "string",\
\
"pin": "string",\
\
"regionCode": "string",\
\
"sip": "string",\
\
"infoUrl": "string"\
\
}\
\
},\
\
"recurrenceType": "single",\
\
"recurrence": {"original": "simple",\
\
"ical": {"rules": ["string"\
\
],\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
},\
\
"simple": {"pattern": {"frequency": "daily",\
\
"interval": 1,\
\
"daysOfWeek": ["monday"\
\
],\
\
"weekStart": "monday",\
\
"dayOfMonth": 1,\
\
"monthOfYear": 1,\
\
"instance": "first"\
\
},\
\
"range": {"type": "byDate",\
\
"recurrenceStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"recurrenceEnd": "2019-08-24",\
\
"count": 1,\
\
"patternExclusions": [{"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
}\
\
]\
\
}\
\
}\
\
},\
\
"reminder": {"useDefault": true,\
\
"overrides": [{"minutes": 0\
\
}\
\
]\
\
},\
\
"occurrenceInfo": {"id": "string",\
\
"type": "regular",\
\
"originalStart": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"start": {"dateOnly": "2019-08-24",\
\
"dateTime": "2019-08-24T14:15:22Z",\
\
"timezone": "string"\
\
},\
\
"masterId": "string"\
\
},\
\
"iCalUid": "string",\
\
"globalId": "string",\
\
"showAs": "free",\
\
"sensitivity": "normal",\
\
"categories": ["string"\
\
],\
\
"htmlLink": "string",\
\
"hasAttachments": true,\
\
"attachments": [{"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"size": 0,\
\
"inline": true,\
\
"contentId": "string",\
\
"content": "string",\
\
"contentLocation": "string"\
\
}\
\
],\
\
"omitted": ["description"\
\
]\
\
}\
\
]

}`

## [tag/CalSync/operation/calSyncDeleted](https://apirefs.aurinko.io/\#tag/CalSync/operation/calSyncDeleted) Request deleted events (deltas)

get/v1/calendars/{calendarId}/sync/deleted

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/sync/deleted

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/calendars/primary/sync/deleted \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"timestamp": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/FreeBusySchedule](https://apirefs.aurinko.io/\#tag/FreeBusySchedule) Free/Busy schedule

Check free/busy status for a calendar or available time slots for a meeting in multiple calendars.

## [tag/FreeBusySchedule/operation/freeBusy](https://apirefs.aurinko.io/\#tag/FreeBusySchedule/operation/freeBusy) Get the free/busy availability information for a collection of users, or resources

post/v1/calendars/freeBusy

Production server

https://api.aurinko.io/v1/calendars/freeBusy

Account primary calendar is always in count, only primary calendar of an emails are in count

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> |
| timeMax | string <date-time> |
| emails | Array of strings <email> \[ items <email > \] |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z",

"emails": ["user@example.com"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"records": [{"email": "user@example.com",\
\
"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"status": "free"\
\
}\
\
],\
\
"error": "string",\
\
"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],\
\
"timezone": "string"\
\
}\
\
}\
\
]

}`

## [tag/FreeBusySchedule/operation/suggestMeetingTimes](https://apirefs.aurinko.io/\#tag/FreeBusySchedule/operation/suggestMeetingTimes) Suggest meeting times for a collection of users, or resources

post/v1/calendars/suggestMeetingTimes

Production server

https://api.aurinko.io/v1/calendars/suggestMeetingTimes

Account primary calendar is always in count, only primary calendar of an attendees are in count

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> <br>The lower bound of the time interval to search for available meeting times. |
| timeMax | string <date-time> <br>The upper bound of the time interval to search for available meeting times. |
| durationMinutes | integer<br>The duration of the meeting to search time for. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Default: 30<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| attendees | Array of objects (MeetingAttendee) <br>The attendees to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |
| defaultTimezone | string<br>Timezone (IANA) to use when no timezone information is available for the attendees. |
| defaultWorkHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| freeStatuses | Array of strings (ShowAs) <br>Default: \["free"\]<br>Items Enum:"free""busy""tentative""outOfOffice""unknown"<br>The statuses from /freeBusy request to consider as free time for the attendees. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z",

"durationMinutes": 0,

"bufferBetweenMinutes": 15,

"availabilityStep": 30,

"attendees": [{"email": "string",\
\
"timezone": "string",\
\
"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],\
\
"timezone": "string"\
\
},\
\
"busyIntervals": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z"\
\
}\
\
],\
\
"freeIntervals": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z"\
\
}\
\
]\
\
}\
\
],

"defaultTimezone": "string",

"defaultWorkHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"freeStatuses": ["free"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z"\
\
}\
\
],

"attendees": [{"email": "string",\
\
"timezone": "string",\
\
"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],\
\
"timezone": "string"\
\
},\
\
"error": "string"\
\
}\
\
]

}`

## [tag/FreeBusySchedule/operation/calendarFreeBusy](https://apirefs.aurinko.io/\#tag/FreeBusySchedule/operation/calendarFreeBusy) Get the free/busy availability information for a calendar

post/v1/calendars/{calendarId}/freeBusy

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/freeBusy

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> |
| timeMax | string <date-time> |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"records": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"status": "free"\
\
}\
\
],

"nextPageToken": "string"

}`

## [tag/FreeBusySchedule/operation/calendarAvailableTimes](https://apirefs.aurinko.io/\#tag/FreeBusySchedule/operation/calendarAvailableTimes) Get available times for a calendar

post/v1/calendars/{calendarId}/availableTimes

Production server

https://api.aurinko.io/v1/calendars/{calendarId}/availableTimes

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| calendarId<br>required | string<br>Calendar id |

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> <br>The lower bound of the time interval to search for available meeting times. |
| timeMax | string <date-time> <br>The upper bound of the time interval to search for available meeting times. |
| durationMinutes | integer<br>The duration of the meeting to search time for. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Default: 30<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| defaultTimezone | string<br>Timezone (IANA) to use when no timezone information is available. |
| defaultWorkHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| freeStatuses | Array of strings (ShowAs) <br>Default: \["free"\]<br>Items Enum:"free""busy""tentative""outOfOffice""unknown"<br>The statuses from /freeBusy request to consider as free time. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z",

"durationMinutes": 0,

"bufferBetweenMinutes": 15,

"availabilityStep": 30,

"defaultTimezone": "string",

"defaultWorkHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"freeStatuses": ["free"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/Booking](https://apirefs.aurinko.io/\#tag/Booking) Booking (Accounts)

Booking profiles allow you to build calendar availability and meeting scheduling apps. List, create, update, and delete booking profiles associated with a calendar (Aurinko account). Gather availability information from a calendar and find time slots when the calendar owner is available. Schedule events for a calendar owner.

## [tag/Booking/operation/workHours](https://apirefs.aurinko.io/\#tag/Booking/operation/workHours) Get user work hours

get/v1/book/account/workHours

Production server

https://api.aurinko.io/v1/book/account/workHours

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

}`

## [tag/Booking/operation/create](https://apirefs.aurinko.io/\#tag/Booking/operation/create) Create a booking profile

post/v1/book/account/profiles

Production server

https://api.aurinko.io/v1/book/account/profiles

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string<br>Profile name used in calendar links to identify a profile. |
| durationMinutes | integer<br>Duration of the meeting in minutes. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| startAfterMinutes | integer<br>The available meeting times can only start this minutes after the current time. Default is 1 hour. |
| startTime | string <date-time> <br>The beginning of the formation of intervals. Must be in the future, otherwise the current time will be used. |
| endTime | string <date-time> <br>The ending of the formation of intervals. If the time specified here is in the past, the intervals will be empty, regardless of the Start time parameter. |
| timeAvailableFor | string<br>Time period (in ISO-8601 format) the profile is covering. For example, P3M (3 months), P4W (4 weeks), P5D (5 days). |
| subject | string<br>Subject for events booked using this profile. |
| description | string<br>Description for events booked using this profile. |
| location | string<br>Location for events booked using this profile. |
| workHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| context | string<br>Custom client data stored for the profile. |
| startConference | boolean<br>Whether to create an online conference (hangoutsMeet, teamsForBusiness, etc.) for the event. Note, not all providers support creating conferences. |
| openMeetingUrl | string<br>The value of the {{openMeetingUrl}} variable that can be used in the event description or subject. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string"

}`

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string"

}`

## [tag/Booking/operation/getAccBookings](https://apirefs.aurinko.io/\#tag/Booking/operation/getAccBookings) Get booking profiles

get/v1/book/account/profiles

Production server

https://api.aurinko.io/v1/book/account/profiles

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"name": "aurDemo - https://calendar.aurinko.io/aurDemo",\
\
"durationMinutes": 30,\
\
"bufferBetweenMinutes": 15,\
\
"availabilityStep": 0,\
\
"startAfterMinutes": 0,\
\
"startTime": "2019-08-24T14:15:22Z",\
\
"endTime": "2019-08-24T14:15:22Z",\
\
"timeAvailableFor": "P4W",\
\
"subject": "string",\
\
"description": "string",\
\
"location": "string",\
\
"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],\
\
"timezone": "string"\
\
},\
\
"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]\
\
},\
\
"context": "string",\
\
"startConference": true,\
\
"openMeetingUrl": "string"\
\
}\
\
]

}`

## [tag/Booking/operation/getBooking](https://apirefs.aurinko.io/\#tag/Booking/operation/getBooking) Get a booking profile by id

get/v1/book/account/profiles/{id}

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string"

}`

## [tag/Booking/operation/updateBooking](https://apirefs.aurinko.io/\#tag/Booking/operation/updateBooking) Update a booking profile

patch/v1/book/account/profiles/{id}

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string<br>Profile name used in calendar links to identify a profile. |
| durationMinutes | integer<br>Duration of the meeting in minutes. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| startAfterMinutes | integer<br>The available meeting times can only start this minutes after the current time. Default is 1 hour. |
| startTime | string <date-time> <br>The beginning of the formation of intervals. Must be in the future, otherwise the current time will be used. |
| endTime | string <date-time> <br>The ending of the formation of intervals. If the time specified here is in the past, the intervals will be empty, regardless of the Start time parameter. |
| timeAvailableFor | string<br>Time period (in ISO-8601 format) the profile is covering. For example, P3M (3 months), P4W (4 weeks), P5D (5 days). |
| subject | string<br>Subject for events booked using this profile. |
| description | string<br>Description for events booked using this profile. |
| location | string<br>Location for events booked using this profile. |
| workHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| context | string<br>Custom client data stored for the profile. |
| startConference | boolean<br>Whether to create an online conference (hangoutsMeet, teamsForBusiness, etc.) for the event. Note, not all providers support creating conferences. |
| openMeetingUrl | string<br>The value of the {{openMeetingUrl}} variable that can be used in the event description or subject. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string"

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Booking/operation/deleteBooking](https://apirefs.aurinko.io/\#tag/Booking/operation/deleteBooking) Delete a booking profile by id

delete/v1/book/account/profiles/{id}

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Booking/operation/bookingAccountMeetingTimes](https://apirefs.aurinko.io/\#tag/Booking/operation/bookingAccountMeetingTimes) Get available meeting times

get/v1/book/account/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}/meeting

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| fromDate | string or null <date> <br>date to iterate a big time intervals |
| intervalLength | string or null<br>Time period (in ISO-8601 format) to iterate a big time intervals |
| pageToken | string or null<br>token to request all pages, if booking has many accounts |
| limit | integer or null <int32> |
| offset | integer or null <int32> |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"groupXids": ["string"\
\
],\
\
"accountIds": [0\
\
]\
\
}\
\
],

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"durationMinutes": 0,

"availabilityStep": 0,

"subject": "string",

"primaryColor": "string",

"secondaryColor": "string",

"additionalFields": [{"name": "string",\
\
"type": "string",\
\
"default": "string"\
\
}\
\
],

"nextPageToken": "string",

"nextFromDate": "2019-08-24"

}`

## [tag/Booking/operation/bookingAccountCreateMeeting](https://apirefs.aurinko.io/\#tag/Booking/operation/bookingAccountCreateMeeting) Create a meeting

post/v1/book/account/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}/meeting

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| reserveForMinutes | integer or null <int64> <br>Time in minutes, blocks the interval for a time (creates an unconfirmed reservation), the meeting is not created |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| time | object (SelectedMeetingTime) |
| groupXids | Array of strings |
| accountIds | Array of integers <int64> \[ items <int64 > \] |
| name | string<br>Deprecated <br>Username of the person requesting the meeting (please, use schedulerInfo.name instead) |
| email | string<br>Deprecated <br>Email of the person requesting the meeting (please, use schedulerInfo.email instead) |
| substitutionData | object<br>Data for substitution instead of templates, key - value |
| schedulerInfo | object (AttendeeInfo) |
| invitees | Array of objects (AttendeeInfo) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"time": {"start": "2019-08-24T14:15:22Z",

"end": "2019-08-24T14:15:22Z"

},

"groupXids": ["string"\
\
],

"accountIds": [0\
\
],

"name": "string",

"email": "string",

"substitutionData": {"property1": "string",

"property2": "string"

},

"schedulerInfo": {"email": "string",

"name": "string"

},

"invitees": [{"email": "string",\
\
"name": "string"\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"created": true,

"id": "string",

"ReservationId": 0,

"groupXid": "string",

"rescheduleToken": "string"

}`

## [tag/Booking/operation/bookingAccountReservationConfirm](https://apirefs.aurinko.io/\#tag/Booking/operation/bookingAccountReservationConfirm) Convert an unconfirmed booking reservation to a calendar event

post/v1/book/account/reservations/{id}/confirm

Production server

https://api.aurinko.io/v1/book/account/reservations/{id}/confirm

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>An unconfirmed reservation id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"id": "string"

}`

## [tag/Booking/operation/bookingAccountReservationDelete](https://apirefs.aurinko.io/\#tag/Booking/operation/bookingAccountReservationDelete) Cancel an unconfirmed booking reservation

delete/v1/book/account/reservations/{id}

Production server

https://api.aurinko.io/v1/book/account/reservations/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>An unconfirmed reservation id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking) Group Booking

Group Booking profiles allow you to build calendar availability and meeting scheduling for a group of accounts. List, create, update, and delete booking profiles associated with a group. Gather availability information from multiple account calendars and find time slots when at least one user is available. Schedule events for available accounts.

## [tag/GroupBooking/operation/bookingGroupAvailability](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/bookingGroupAvailability) Get available bookings for а time range

post/v1/book/group/profiles/dynamic/availability

Production server

https://api.aurinko.io/v1/book/group/profiles/dynamic/availability

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> |
| timeMax | string <date-time> |
| profileNames | Array of strings |
| profileIds | Array of integers <int64> \[ items <int64 > \] |
| required | string (BookingRequiredMode) <br>Enum:"one""all" |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z",

"profileNames": ["string"\
\
],

"profileIds": [0\
\
],

"required": "one"

}`

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"profileIds": [0\
\
]

}`

## [tag/GroupBooking/operation/bookingGroupMeetingTimes](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/bookingGroupMeetingTimes) Get available meeting times

get/v1/book/group/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/meeting

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| fromDate | string or null <date> <br>date to iterate a big time intervals |
| intervalLength | string or null<br>Time period (in ISO-8601 format) to iterate a big time intervals |
| pageToken | string or null<br>token to request all pages, if booking has many accounts |
| limit | integer or null <int32> |
| offset | integer or null <int32> |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"groupXids": ["string"\
\
],\
\
"accountIds": [0\
\
]\
\
}\
\
],

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"durationMinutes": 0,

"availabilityStep": 0,

"subject": "string",

"primaryColor": "string",

"secondaryColor": "string",

"additionalFields": [{"name": "string",\
\
"type": "string",\
\
"default": "string"\
\
}\
\
],

"nextPageToken": "string",

"nextFromDate": "2019-08-24"

}`

## [tag/GroupBooking/operation/bookingGroupCreateMeeting](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/bookingGroupCreateMeeting) Create a meeting

post/v1/book/group/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/meeting

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| reserveForMinutes | integer or null <int64> <br>Time in minutes, blocks the interval for a time (creates an unconfirmed reservation), the meeting is not created |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| time | object (SelectedMeetingTime) |
| groupXids | Array of strings |
| accountIds | Array of integers <int64> \[ items <int64 > \] |
| name | string<br>Deprecated <br>Username of the person requesting the meeting (please, use schedulerInfo.name instead) |
| email | string<br>Deprecated <br>Email of the person requesting the meeting (please, use schedulerInfo.email instead) |
| substitutionData | object<br>Data for substitution instead of templates, key - value |
| schedulerInfo | object (AttendeeInfo) |
| invitees | Array of objects (AttendeeInfo) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"time": {"start": "2019-08-24T14:15:22Z",

"end": "2019-08-24T14:15:22Z"

},

"groupXids": ["string"\
\
],

"accountIds": [0\
\
],

"name": "string",

"email": "string",

"substitutionData": {"property1": "string",

"property2": "string"

},

"schedulerInfo": {"email": "string",

"name": "string"

},

"invitees": [{"email": "string",\
\
"name": "string"\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"created": true,

"id": "string",

"ReservationId": 0,

"groupXid": "string",

"rescheduleToken": "string"

}`

## [tag/GroupBooking/operation/getGroupBookings](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/getGroupBookings) Get group booking profiles

get/v1/book/group/profiles

Production server

https://api.aurinko.io/v1/book/group/profiles

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"name": "aurDemo - https://calendar.aurinko.io/aurDemo",\
\
"durationMinutes": 30,\
\
"bufferBetweenMinutes": 15,\
\
"availabilityStep": 0,\
\
"startAfterMinutes": 0,\
\
"startTime": "2019-08-24T14:15:22Z",\
\
"endTime": "2019-08-24T14:15:22Z",\
\
"timeAvailableFor": "P4W",\
\
"subject": "string",\
\
"description": "string",\
\
"location": "string",\
\
"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],\
\
"timezone": "string"\
\
},\
\
"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]\
\
},\
\
"context": "string",\
\
"startConference": true,\
\
"openMeetingUrl": "string",\
\
"clientOrgId": "string"\
\
}\
\
]

}`

## [tag/GroupBooking/operation/createGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/createGroupBooking) Create a group booking profile

post/v1/book/group/profiles

Production server

https://api.aurinko.io/v1/book/group/profiles

##### Authorizations:

_AppAuth_

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string<br>Profile name used in calendar links to identify a profile. |
| durationMinutes | integer<br>Duration of the meeting in minutes. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| startAfterMinutes | integer<br>The available meeting times can only start this minutes after the current time. Default is 1 hour. |
| startTime | string <date-time> <br>The beginning of the formation of intervals. Must be in the future, otherwise the current time will be used. |
| endTime | string <date-time> <br>The ending of the formation of intervals. If the time specified here is in the past, the intervals will be empty, regardless of the Start time parameter. |
| timeAvailableFor | string<br>Time period (in ISO-8601 format) the profile is covering. For example, P3M (3 months), P4W (4 weeks), P5D (5 days). |
| subject | string<br>Subject for events booked using this profile. |
| description | string<br>Description for events booked using this profile. |
| location | string<br>Location for events booked using this profile. |
| workHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| context | string<br>Custom client data stored for the profile. |
| startConference | boolean<br>Whether to create an online conference (hangoutsMeet, teamsForBusiness, etc.) for the event. Note, not all providers support creating conferences. |
| openMeetingUrl | string<br>The value of the {{openMeetingUrl}} variable that can be used in the event description or subject. |
| clientOrgId | string |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string",

"clientOrgId": "string"

}`

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string",

"clientOrgId": "string"

}`

## [tag/GroupBooking/operation/getGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/getGroupBooking) Get a group booking profile by id

get/v1/book/group/profiles/{id}

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string",

"clientOrgId": "string"

}`

## [tag/GroupBooking/operation/updateGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/updateGroupBooking) Update a group booking profile

patch/v1/book/group/profiles/{id}

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | string<br>Profile name used in calendar links to identify a profile. |
| durationMinutes | integer<br>Duration of the meeting in minutes. |
| bufferBetweenMinutes | integer<br>A Duration specifying the minimum number of minutes that must be free after the meeting in minutes. |
| availabilityStep | integer<br>Determines the interval at which new meeting slots are made available throughout the working hours. Allowed values are 5, 10, 15, 20, 30, 60. |
| startAfterMinutes | integer<br>The available meeting times can only start this minutes after the current time. Default is 1 hour. |
| startTime | string <date-time> <br>The beginning of the formation of intervals. Must be in the future, otherwise the current time will be used. |
| endTime | string <date-time> <br>The ending of the formation of intervals. If the time specified here is in the past, the intervals will be empty, regardless of the Start time parameter. |
| timeAvailableFor | string<br>Time period (in ISO-8601 format) the profile is covering. For example, P3M (3 months), P4W (4 weeks), P5D (5 days). |
| subject | string<br>Subject for events booked using this profile. |
| description | string<br>Description for events booked using this profile. |
| location | string<br>Location for events booked using this profile. |
| workHours | object (WeekWorkSchedule) |
| availabilityIntervals | object (AvailabilityIntervals) |
| context | string<br>Custom client data stored for the profile. |
| startConference | boolean<br>Whether to create an online conference (hangoutsMeet, teamsForBusiness, etc.) for the event. Note, not all providers support creating conferences. |
| openMeetingUrl | string<br>The value of the {{openMeetingUrl}} variable that can be used in the event description or subject. |
| clientOrgId | string |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"name": "aurDemo - https://calendar.aurinko.io/aurDemo",

"durationMinutes": 30,

"bufferBetweenMinutes": 15,

"availabilityStep": 0,

"startAfterMinutes": 0,

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"subject": "string",

"description": "string",

"location": "string",

"workHours": {"daySchedules": [{"dayOfWeek": "monday",\
\
"workingIntervals": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
],

"timezone": "string"

},

"availabilityIntervals": {"intervals": [{"dateStartInclusive": "2019-08-24",\
\
"dateEndInclusive": "2019-08-24",\
\
"hours": [{"start": "09:00:00",\
\
"end": "17:00:00"\
\
}\
\
]\
\
}\
\
]

},

"context": "string",

"startConference": true,

"openMeetingUrl": "string",

"clientOrgId": "string"

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/deleteGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/deleteGroupBooking) Delete a group booking profile by id

delete/v1/book/group/profiles/{id}

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/attachGroupsBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/attachGroupsBooking) Assign groups to group booking

post/v1/book/group/profiles/{id}/attachGroups

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/attachGroups

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| groups | Array of objects (BookingAttachGroupDto) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"groups": [{"extId": "string",\
\
"accountIds": [0\
\
],\
\
"required": "one"\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/attachedGroupsBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/attachedGroupsBooking) List groups of a group booking profile

get/v1/book/group/profiles/{id}/attachGroups

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/attachGroups

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"extId": "string",\
\
"accountIds": [0\
\
],\
\
"required": "one"\
\
}\
\
]

}`

## [tag/GroupBooking/operation/detachGroupsBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/detachGroupsBooking) Remove groups from group booking

post/v1/book/group/profiles/{id}/detachGroups

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/detachGroups

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| groups | Array of objects (BookingDetachGroupDto) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"groups": [{"extId": "string",\
\
"accountIds": [0\
\
]\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/attachAccountsGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/attachAccountsGroupBooking) Assign accounts to group booking

post/v1/book/group/profiles/{id}/attachAccounts

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/attachAccounts

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| accountIds | Array of integers <int64> \[ items <int64 > \] |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"accountIds": [0\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/attachedAccountsGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/attachedAccountsGroupBooking) List accounts of a group booking profile

get/v1/book/group/profiles/{id}/attachAccounts

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/attachAccounts

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"accountIds": [0\
\
]\
\
}\
\
]

}`

## [tag/GroupBooking/operation/detachAccountsGroupBooking](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/detachAccountsGroupBooking) Remove accounts from group booking

post/v1/book/group/profiles/{id}/detachAccounts

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/detachAccounts

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| accountIds | Array of integers <int64> \[ items <int64 > \] |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"accountIds": [0\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/GroupBooking/operation/bookingGroupReservationConfirm](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/bookingGroupReservationConfirm) Convert an unconfirmed booking reservation to a calendar event

post/v1/book/group/reservations/{id}/confirm

Production server

https://api.aurinko.io/v1/book/group/reservations/{id}/confirm

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>An unconfirmed reservation id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"id": "string"

}`

## [tag/GroupBooking/operation/bookingGroupReservationDelete](https://apirefs.aurinko.io/\#tag/GroupBooking/operation/bookingGroupReservationDelete) Cancel an unconfirmed booking reservation

delete/v1/book/group/reservations/{id}

Production server

https://api.aurinko.io/v1/book/group/reservations/{id}

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>An unconfirmed reservation id |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Availability](https://apirefs.aurinko.io/\#tag/Availability) Availability

See meeting time availability according to the group booking profile configuration. Book a meeting for an account or one of users in a group.

## [tag/Availability/operation/bookingAccountMeetingTimes](https://apirefs.aurinko.io/\#tag/Availability/operation/bookingAccountMeetingTimes) Get available meeting times

get/v1/book/account/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}/meeting

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| fromDate | string or null <date> <br>date to iterate a big time intervals |
| intervalLength | string or null<br>Time period (in ISO-8601 format) to iterate a big time intervals |
| pageToken | string or null<br>token to request all pages, if booking has many accounts |
| limit | integer or null <int32> |
| offset | integer or null <int32> |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"groupXids": ["string"\
\
],\
\
"accountIds": [0\
\
]\
\
}\
\
],

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"durationMinutes": 0,

"availabilityStep": 0,

"subject": "string",

"primaryColor": "string",

"secondaryColor": "string",

"additionalFields": [{"name": "string",\
\
"type": "string",\
\
"default": "string"\
\
}\
\
],

"nextPageToken": "string",

"nextFromDate": "2019-08-24"

}`

## [tag/Availability/operation/bookingAccountCreateMeeting](https://apirefs.aurinko.io/\#tag/Availability/operation/bookingAccountCreateMeeting) Create a meeting

post/v1/book/account/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/account/profiles/{id}/meeting

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| reserveForMinutes | integer or null <int64> <br>Time in minutes, blocks the interval for a time (creates an unconfirmed reservation), the meeting is not created |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| time | object (SelectedMeetingTime) |
| groupXids | Array of strings |
| accountIds | Array of integers <int64> \[ items <int64 > \] |
| name | string<br>Deprecated <br>Username of the person requesting the meeting (please, use schedulerInfo.name instead) |
| email | string<br>Deprecated <br>Email of the person requesting the meeting (please, use schedulerInfo.email instead) |
| substitutionData | object<br>Data for substitution instead of templates, key - value |
| schedulerInfo | object (AttendeeInfo) |
| invitees | Array of objects (AttendeeInfo) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"time": {"start": "2019-08-24T14:15:22Z",

"end": "2019-08-24T14:15:22Z"

},

"groupXids": ["string"\
\
],

"accountIds": [0\
\
],

"name": "string",

"email": "string",

"substitutionData": {"property1": "string",

"property2": "string"

},

"schedulerInfo": {"email": "string",

"name": "string"

},

"invitees": [{"email": "string",\
\
"name": "string"\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"created": true,

"id": "string",

"ReservationId": 0,

"groupXid": "string",

"rescheduleToken": "string"

}`

## [tag/Availability/operation/bookingGroupAvailability](https://apirefs.aurinko.io/\#tag/Availability/operation/bookingGroupAvailability) Get available bookings for а time range

post/v1/book/group/profiles/dynamic/availability

Production server

https://api.aurinko.io/v1/book/group/profiles/dynamic/availability

##### Authorizations:

_AppAuth_

##### query Parameters

|     |     |
| --- | --- |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| timeMin | string <date-time> |
| timeMax | string <date-time> |
| profileNames | Array of strings |
| profileIds | Array of integers <int64> \[ items <int64 > \] |
| required | string (BookingRequiredMode) <br>Enum:"one""all" |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"timeMin": "2019-08-24T14:15:22Z",

"timeMax": "2019-08-24T14:15:22Z",

"profileNames": ["string"\
\
],

"profileIds": [0\
\
],

"required": "one"

}`

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"profileIds": [0\
\
]

}`

## [tag/Availability/operation/bookingGroupMeetingTimes](https://apirefs.aurinko.io/\#tag/Availability/operation/bookingGroupMeetingTimes) Get available meeting times

get/v1/book/group/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/meeting

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| fromDate | string or null <date> <br>date to iterate a big time intervals |
| intervalLength | string or null<br>Time period (in ISO-8601 format) to iterate a big time intervals |
| pageToken | string or null<br>token to request all pages, if booking has many accounts |
| limit | integer or null <int32> |
| offset | integer or null <int32> |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"groupXids": ["string"\
\
],\
\
"accountIds": [0\
\
]\
\
}\
\
],

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"durationMinutes": 0,

"availabilityStep": 0,

"subject": "string",

"primaryColor": "string",

"secondaryColor": "string",

"additionalFields": [{"name": "string",\
\
"type": "string",\
\
"default": "string"\
\
}\
\
],

"nextPageToken": "string",

"nextFromDate": "2019-08-24"

}`

## [tag/Availability/operation/bookingGroupCreateMeeting](https://apirefs.aurinko.io/\#tag/Availability/operation/bookingGroupCreateMeeting) Create a meeting

post/v1/book/group/profiles/{id}/meeting

Production server

https://api.aurinko.io/v1/book/group/profiles/{id}/meeting

##### Authorizations:

_AppAuth_

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A booking id |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| reserveForMinutes | integer or null <int64> <br>Time in minutes, blocks the interval for a time (creates an unconfirmed reservation), the meeting is not created |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| time | object (SelectedMeetingTime) |
| groupXids | Array of strings |
| accountIds | Array of integers <int64> \[ items <int64 > \] |
| name | string<br>Deprecated <br>Username of the person requesting the meeting (please, use schedulerInfo.name instead) |
| email | string<br>Deprecated <br>Email of the person requesting the meeting (please, use schedulerInfo.email instead) |
| substitutionData | object<br>Data for substitution instead of templates, key - value |
| schedulerInfo | object (AttendeeInfo) |
| invitees | Array of objects (AttendeeInfo) |

### Responses

**200**

Success

**401**

Authentication information is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"time": {"start": "2019-08-24T14:15:22Z",

"end": "2019-08-24T14:15:22Z"

},

"groupXids": ["string"\
\
],

"accountIds": [0\
\
],

"name": "string",

"email": "string",

"substitutionData": {"property1": "string",

"property2": "string"

},

"schedulerInfo": {"email": "string",

"name": "string"

},

"invitees": [{"email": "string",\
\
"name": "string"\
\
}\
\
]

}`

### Response samples

- 200

Content type

application/json

Copy

`{"created": true,

"id": "string",

"ReservationId": 0,

"groupXid": "string",

"rescheduleToken": "string"

}`

## [tag/Availability/operation/getMeetingTimes](https://apirefs.aurinko.io/\#tag/Availability/operation/getMeetingTimes) Get available meeting times

get/v1/book/{aurinkoClientId}/{name}/meeting

Production server

https://api.aurinko.io/v1/book/{aurinkoClientId}/{name}/meeting

##### path Parameters

|     |     |
| --- | --- |
| aurinkoClientId<br>required | string<br>Application client Id |
| name<br>required | string<br>Booking profile name |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| fromDate | string or null <date> <br>date to iterate a big time intervals |
| intervalLength | string or null<br>Time period (in ISO-8601 format) to iterate a big time intervals |
| pageToken | string or null<br>token to request all pages, if booking has many accounts |
| limit | integer or null <int32> |
| offset | integer or null <int32> |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |
| attendeeEmail<br>required | Array of strings<br>The attendee's emails to consider when searching for available meeting times.<br>Only primary calendar of an attendees are in count.<br>Some providers do not support attendees. |

### Responses

**200**

Success

**default**

See "Handling errors" section for details

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{"items": [{"start": "2019-08-24T14:15:22Z",\
\
"end": "2019-08-24T14:15:22Z",\
\
"groupXids": ["string"\
\
],\
\
"accountIds": [0\
\
]\
\
}\
\
],

"startTime": "2019-08-24T14:15:22Z",

"endTime": "2019-08-24T14:15:22Z",

"timeAvailableFor": "P4W",

"durationMinutes": 0,

"availabilityStep": 0,

"subject": "string",

"primaryColor": "string",

"secondaryColor": "string",

"additionalFields": [{"name": "string",\
\
"type": "string",\
\
"default": "string"\
\
}\
\
],

"nextPageToken": "string",

"nextFromDate": "2019-08-24"

}`

## [tag/Availability/operation/createMeeting](https://apirefs.aurinko.io/\#tag/Availability/operation/createMeeting) Create a meeting

post/v1/book/{aurinkoClientId}/{name}/meeting

Production server

https://api.aurinko.io/v1/book/{aurinkoClientId}/{name}/meeting

##### path Parameters

|     |     |
| --- | --- |
| aurinkoClientId<br>required | string<br>Application client Id |
| name<br>required | string<br>Booking profile name |

##### query Parameters

|     |     |
| --- | --- |
| required | string (BookingRequiredMode) <br>Enum:"one""all"<br>a way to select times |
| reserveForMinutes | integer or null <int64> <br>Time in minutes, blocks the interval for a time (creates an unconfirmed reservation), the meeting is not created |
| rescheduleToken | string or null<br>token used when rescheduling an existing meeting |

##### cookie Parameters

|     |     |
| --- | --- |
| AURINKO\_BOOKING | string<br>Booking cookie received from `Get available meeting times` endpoint. |

##### header Parameters

|     |     |
| --- | --- |
| X-Aurinko-Booking-Session | string<br>Booking cookie value received from `Get available meeting times` endpoint. For API developers, browser will use cookie. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| time | object (SelectedMeetingTime) |
| groupXids | Array of strings |
| accountIds | Array of integers <int64> \[ items <int64 > \] |
| name | string<br>Deprecated <br>Username of the person requesting the meeting (please, use schedulerInfo.name instead) |
| email | string<br>Deprecated <br>Email of the person requesting the meeting (please, use schedulerInfo.email instead) |
| substitutionData | object<br>Data for substitution instead of templates, key - value |
| schedulerInfo | object (AttendeeInfo) |
| invitees | Array of objects (AttendeeInfo) |

### Responses

**200**

Success

**403**

Booking Cookie invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload

Content type

application/json

Copy
Expand all  Collapse all

`{"time": {"start": "2019-08-24T14:15:22Z",

"end": "2019-08-24T14:15:22Z"

},

"groupXids": ["string"\
\
],

"accountIds": [0\
\
],

"name": "string",

"email": "string",

"substitutionData": {"property1": "string",

"property2": "string"

},

"schedulerInfo": {"email": "string",

"name": "string"

},

"invitees": [{"email": "string",\
\
"name": "string"\
\
}\
\
]

}`

### Response samples

- 200
- 403

Content type

application/json

Copy

`{"created": true,

"id": "string",

"ReservationId": 0,

"groupXid": "string",

"rescheduleToken": "string"

}`

## [tag/Contacts](https://apirefs.aurinko.io/\#tag/Contacts) Contacts

Contacts are objects within an address book, containing several pieces of information, such as email addresses, phone numbers, postal addresses, work place details.

## [tag/Contacts/operation/contact](https://apirefs.aurinko.io/\#tag/Contacts/operation/contact) Get a contact

get/v1/contacts/{contId}

Production server

https://api.aurinko.io/v1/contacts/{contId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| contId<br>required | string<br>Contact id |

##### query Parameters

|     |     |
| --- | --- |
| bodyType | string (BodyType) <br>Enum:"html""text"<br>Default text |
| nativeProperties | Array of strings or null (NativeProperty) |
| withPhoto | boolean or null |
| includeUpdateToken | boolean or null |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    https://api.aurinko.io/v1/contacts/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"name": {"displayName": "string",

"prefix": "string",

"givenName": "string",

"middleName": "string",

"familyName": "string",

"suffix": "string",

"yomiGivenName": "string",

"yomiFamilyName": "string"

},

"nickName": "string",

"fileAs": "string",

"company": {"name": "string",

"officeLocation": "string",

"department": "string",

"jobTitle": "string",

"yomiCompanyName": "string"

},

"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],

"birthday": "string",

"keywords": ["string"\
\
],

"notes": "string",

"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],

"phoneNumbers": [{"number": "string",\
\
"type": "work",\
\
"canonicalForm": "string"\
\
}\
\
],

"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],

"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"hasPhoto": true,

"photo": {"id": "string",

"name": "string",

"mimeType": "string",

"content": "string"

}

}`

## [tag/Contacts/operation/updateContact](https://apirefs.aurinko.io/\#tag/Contacts/operation/updateContact) Update a contact

patch/v1/contacts/{contId}

Production server

https://api.aurinko.io/v1/contacts/{contId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| contId<br>required | string<br>Contact id |

##### header Parameters

|     |     |
| --- | --- |
| If-Match<br>required | string<br>The HTTP entity tag of the resource (ETag). Used for web cache validation. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | object (ContactName) |
| nickName | string |
| fileAs | string |
| company | object (ContactCompany) |
| relations | Array of objects (ContactRelation) |
| birthday | string |
| keywords | Array of strings |
| notes | string |
| emailAddresses | Array of objects (ContactEmailAddress) |
| phoneNumbers | Array of objects (ContactPhoneNumber) |
| addresses | Array of objects (ContactPostalAddress) |
| urls | Array of objects (ContactUrl) |
| nativeProperties | object |
| photo | object (ContactPhoto) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"name": {"displayName": "string",

"prefix": "string",

"givenName": "string",

"middleName": "string",

"familyName": "string",

"suffix": "string",

"yomiGivenName": "string",

"yomiFamilyName": "string"

},

"nickName": "string",

"fileAs": "string",

"company": {"name": "string",

"officeLocation": "string",

"department": "string",

"jobTitle": "string",

"yomiCompanyName": "string"

},

"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],

"birthday": "string",

"keywords": ["string"\
\
],

"notes": "string",

"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],

"phoneNumbers": [{"number": "string",\
\
"type": "work"\
\
}\
\
],

"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],

"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"photo": {"id": "string",

"name": "string",

"mimeType": "string",

"content": "string"

}

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"record": {"id": "string",

"etag": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"name": {"displayName": "string",

"prefix": "string",

"givenName": "string",

"middleName": "string",

"familyName": "string",

"suffix": "string",

"yomiGivenName": "string",

"yomiFamilyName": "string"

},

"nickName": "string",

"fileAs": "string",

"company": {"name": "string",

"officeLocation": "string",

"department": "string",

"jobTitle": "string",

"yomiCompanyName": "string"

},

"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],

"birthday": "string",

"keywords": ["string"\
\
],

"notes": "string",

"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],

"phoneNumbers": [{"number": "string",\
\
"type": "work",\
\
"canonicalForm": "string"\
\
}\
\
],

"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],

"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"hasPhoto": true,

"photo": {"id": "string",

"name": "string",

"mimeType": "string",

"content": "string"

}

}

}`

## [tag/Contacts/operation/deleteContact](https://apirefs.aurinko.io/\#tag/Contacts/operation/deleteContact) Delete a contact

delete/v1/contacts/{contId}

Production server

https://api.aurinko.io/v1/contacts/{contId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| contId<br>required | string<br>Contact id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**404**

Contact not found

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X DELETE https://api.aurinko.io/v1/contacts/{contId}
```

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/Contacts/operation/createContact](https://apirefs.aurinko.io/\#tag/Contacts/operation/createContact) Create a new contact

post/v1/contacts

Production server

https://api.aurinko.io/v1/contacts

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| name | object (ContactName) |
| nickName | string |
| fileAs | string |
| company | object (ContactCompany) |
| relations | Array of objects (ContactRelation) |
| birthday | string |
| keywords | Array of strings |
| notes | string |
| emailAddresses | Array of objects (ContactEmailAddress) |
| phoneNumbers | Array of objects (ContactPhoneNumber) |
| addresses | Array of objects (ContactPostalAddress) |
| urls | Array of objects (ContactUrl) |
| nativeProperties | object |
| photo | object (ContactPhoto) |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"name": {"displayName": "string",

"prefix": "string",

"givenName": "string",

"middleName": "string",

"familyName": "string",

"suffix": "string",

"yomiGivenName": "string",

"yomiFamilyName": "string"

},

"nickName": "string",

"fileAs": "string",

"company": {"name": "string",

"officeLocation": "string",

"department": "string",

"jobTitle": "string",

"yomiCompanyName": "string"

},

"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],

"birthday": "string",

"keywords": ["string"\
\
],

"notes": "string",

"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],

"phoneNumbers": [{"number": "string",\
\
"type": "work"\
\
}\
\
],

"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],

"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"photo": {"id": "string",

"name": "string",

"mimeType": "string",

"content": "string"

}

}`

### Response samples

- 201
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"record": {"id": "string",

"etag": "string",

"createdTime": "2019-08-24T14:15:22Z",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"name": {"displayName": "string",

"prefix": "string",

"givenName": "string",

"middleName": "string",

"familyName": "string",

"suffix": "string",

"yomiGivenName": "string",

"yomiFamilyName": "string"

},

"nickName": "string",

"fileAs": "string",

"company": {"name": "string",

"officeLocation": "string",

"department": "string",

"jobTitle": "string",

"yomiCompanyName": "string"

},

"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],

"birthday": "string",

"keywords": ["string"\
\
],

"notes": "string",

"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],

"phoneNumbers": [{"number": "string",\
\
"type": "work",\
\
"canonicalForm": "string"\
\
}\
\
],

"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],

"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],

"nativeProperties": {"property1": "string",

"property2": "string"

},

"hasPhoto": true,

"photo": {"id": "string",

"name": "string",

"mimeType": "string",

"content": "string"

}

}

}`

## [tag/ContSync](https://apirefs.aurinko.io/\#tag/ContSync) Contacts sync

Sync/delta methods.

## [tag/ContSync/operation/contSyncStart](https://apirefs.aurinko.io/\#tag/ContSync/operation/contSyncStart) Start a new contacts sync

post/v1/contacts/sync

Production server

https://api.aurinko.io/v1/contacts/sync

For Office 365, Outlook.com, and MS Exchange accounts this method works with the default Contacts folder only. For Gmail accounts it processes all user contacts except 'Other contacts'.

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/contacts/sync
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"syncUpdatedToken": "string",

"syncDeletedToken": "string",

"ready": true

}`

## [tag/ContSync/operation/contSyncUpdated](https://apirefs.aurinko.io/\#tag/ContSync/operation/contSyncUpdated) Request changed contacts (deltas)

get/v1/contacts/sync/updated

Production server

https://api.aurinko.io/v1/contacts/sync/updated

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/contacts/sync/updated \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"createdTime": "2019-08-24T14:15:22Z",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"name": {"displayName": "string",\
\
"prefix": "string",\
\
"givenName": "string",\
\
"middleName": "string",\
\
"familyName": "string",\
\
"suffix": "string",\
\
"yomiGivenName": "string",\
\
"yomiFamilyName": "string"\
\
},\
\
"nickName": "string",\
\
"fileAs": "string",\
\
"company": {"name": "string",\
\
"officeLocation": "string",\
\
"department": "string",\
\
"jobTitle": "string",\
\
"yomiCompanyName": "string"\
\
},\
\
"relations": [{"name": "string",\
\
"type": "manager"\
\
}\
\
],\
\
"birthday": "string",\
\
"keywords": ["string"\
\
],\
\
"notes": "string",\
\
"emailAddresses": [{"address": "string",\
\
"name": "string",\
\
"type": "string"\
\
}\
\
],\
\
"phoneNumbers": [{"number": "string",\
\
"type": "work",\
\
"canonicalForm": "string"\
\
}\
\
],\
\
"addresses": [{"street": "string",\
\
"streetLine2": "string",\
\
"poBox": "string",\
\
"city": "string",\
\
"state": "string",\
\
"postalCode": "string",\
\
"country": "string",\
\
"type": "work"\
\
}\
\
],\
\
"urls": [{"href": "string",\
\
"type": "work"\
\
}\
\
],\
\
"nativeProperties": {"property1": "string",\
\
"property2": "string"\
\
},\
\
"hasPhoto": true,\
\
"photo": {"id": "string",\
\
"name": "string",\
\
"mimeType": "string",\
\
"content": "string"\
\
}\
\
}\
\
]

}`

## [tag/ContSync/operation/contSyncDeleted](https://apirefs.aurinko.io/\#tag/ContSync/operation/contSyncDeleted) Request deleted contacts (deltas)

get/v1/contacts/sync/deleted

Production server

https://api.aurinko.io/v1/contacts/sync/deleted

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/contacts/sync/deleted \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"timestamp": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/TaskLists](https://apirefs.aurinko.io/\#tag/TaskLists) Task Lists

TaskLists a container objects for tasks.

## [tag/TaskLists/operation/taskListsList](https://apirefs.aurinko.io/\#tag/TaskLists/operation/taskListsList) Request list of task lists

get/v1/tasklists

Production server

https://api.aurinko.io/v1/tasklists

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request (for the first page it must be empty) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/tasklists
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"title": "string",\
\
"owner": true,\
\
"shared": true,\
\
"defaultList": true,\
\
"emailsList": true,\
\
"lastModifiedTime": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/TaskLists/operation/createTaskList](https://apirefs.aurinko.io/\#tag/TaskLists/operation/createTaskList) Create a task list

post/v1/tasklists

Production server

https://api.aurinko.io/v1/tasklists

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

|     |     |
| --- | --- |
| title | string |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"title": "string"

}`

### Response samples

- 201
- 401

Content type

application/json

Copy

`{"id": "string",

"etag": "string",

"title": "string",

"owner": true,

"shared": true,

"defaultList": true,

"emailsList": true,

"lastModifiedTime": "2019-08-24T14:15:22Z"

}`

## [tag/TaskLists/operation/taskList](https://apirefs.aurinko.io/\#tag/TaskLists/operation/taskList) Request a task list by id

get/v1/tasklists/{taskListId}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/tasklists/{taskListId}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": "string",

"etag": "string",

"title": "string",

"owner": true,

"shared": true,

"defaultList": true,

"emailsList": true,

"lastModifiedTime": "2019-08-24T14:15:22Z"

}`

## [tag/TaskLists/operation/updateTaskList](https://apirefs.aurinko.io/\#tag/TaskLists/operation/updateTaskList) Update a task list

patch/v1/tasklists/{taskListId}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>TaskList id |

##### header Parameters

|     |     |
| --- | --- |
| If-Match<br>required | string<br>The HTTP entity tag of the resource (ETag). Used for web cache validation. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| title | string |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy

`{"title": "string"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"id": "string",

"etag": "string",

"title": "string",

"owner": true,

"shared": true,

"defaultList": true,

"emailsList": true,

"lastModifiedTime": "2019-08-24T14:15:22Z"

}`

## [tag/TaskLists/operation/deleteTaskList](https://apirefs.aurinko.io/\#tag/TaskLists/operation/deleteTaskList) Delete a task list by id

delete/v1/tasklists/{taskListId}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X DELETE https://api.aurinko.io/v1/tasklists/{taskListId}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/Tasks](https://apirefs.aurinko.io/\#tag/Tasks) Tasks

Tasks a work to be done.

## [tag/Tasks/operation/tasksList](https://apirefs.aurinko.io/\#tag/Tasks/operation/tasksList) Request list of tasks

get/v1/tasklists/{taskListId}/tasks

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/tasks

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

##### query Parameters

|     |     |
| --- | --- |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request (for the first page it must be empty) |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/tasklists/{taskListId}/tasks
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"title": "string",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"parentId": "string",\
\
"position": "string",\
\
"notes": "string",\
\
"status": "notStarted",\
\
"importance": "low",\
\
"due": "2019-08-24T14:15:22Z",\
\
"completed": "2019-08-24T14:15:22Z",\
\
"links": [{"source": "string",\
\
"description": "string",\
\
"link": "string"\
\
}\
\
],\
\
"startDateTime": "2019-08-24T14:15:22Z",\
\
"categories": ["string"\
\
],\
\
"owner": "string",\
\
"omitted": ["notes"\
\
]\
\
}\
\
]

}`

## [tag/Tasks/operation/createTask](https://apirefs.aurinko.io/\#tag/Tasks/operation/createTask) Create a task

post/v1/tasklists/{taskListId}/tasks

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/tasks

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| title | string |
| parentId | string |
| previousId | string |
| notes | string |
| status | string (TaskStatus) <br>Enum:"notStarted""inProgress""completed""waitingOnOthers""deferred" |
| importance | string (TaskImportance) <br>Enum:"low""normal""high" |
| due | string <date-time> |
| startDateTime | string <date-time> |
| categories | Array of strings |

### Responses

**201**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"title": "string",

"parentId": "string",

"previousId": "string",

"notes": "string",

"status": "notStarted",

"importance": "low",

"due": "2019-08-24T14:15:22Z",

"startDateTime": "2019-08-24T14:15:22Z",

"categories": ["string"\
\
]

}`

### Response samples

- 201
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"record": {"id": "string",

"etag": "string",

"title": "string",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"parentId": "string",

"position": "string",

"notes": "string",

"status": "notStarted",

"importance": "low",

"due": "2019-08-24T14:15:22Z",

"completed": "2019-08-24T14:15:22Z",

"links": [{"source": "string",\
\
"description": "string",\
\
"link": "string"\
\
}\
\
],

"startDateTime": "2019-08-24T14:15:22Z",

"categories": ["string"\
\
],

"owner": "string",

"omitted": ["notes"\
\
]

}

}`

## [tag/Tasks/operation/task](https://apirefs.aurinko.io/\#tag/Tasks/operation/task) Request a task by id

get/v1/tasklists/{taskListId}/tasks/{id}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/tasks/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |
| id<br>required | string<br>Task id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X GET https://api.aurinko.io/v1/tasklists/{taskListId}/tasks/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"title": "string",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"parentId": "string",

"position": "string",

"notes": "string",

"status": "notStarted",

"importance": "low",

"due": "2019-08-24T14:15:22Z",

"completed": "2019-08-24T14:15:22Z",

"links": [{"source": "string",\
\
"description": "string",\
\
"link": "string"\
\
}\
\
],

"startDateTime": "2019-08-24T14:15:22Z",

"categories": ["string"\
\
],

"owner": "string",

"omitted": ["notes"\
\
]

}`

## [tag/Tasks/operation/updateTask](https://apirefs.aurinko.io/\#tag/Tasks/operation/updateTask) Update a task

patch/v1/tasklists/{taskListId}/tasks/{id}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/tasks/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |
| id<br>required | string<br>Task id |

##### header Parameters

|     |     |
| --- | --- |
| If-Match | string<br>The HTTP entity tag of the resource (ETag). Used for web cache validation. |

##### Request Body schema: application/json

|     |     |
| --- | --- |
| title | string |
| parentId | string |
| previousId | string |
| notes | string |
| status | string (TaskStatus) <br>Enum:"notStarted""inProgress""completed""waitingOnOthers""deferred" |
| importance | string (TaskImportance) <br>Enum:"low""normal""high" |
| due | string <date-time> |
| startDateTime | string <date-time> |
| categories | Array of strings |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"title": "string",

"parentId": "string",

"previousId": "string",

"notes": "string",

"status": "notStarted",

"importance": "low",

"due": "2019-08-24T14:15:22Z",

"startDateTime": "2019-08-24T14:15:22Z",

"categories": ["string"\
\
]

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": "string",

"etag": "string",

"record": {"id": "string",

"etag": "string",

"title": "string",

"lastModifiedTime": "2019-08-24T14:15:22Z",

"parentId": "string",

"position": "string",

"notes": "string",

"status": "notStarted",

"importance": "low",

"due": "2019-08-24T14:15:22Z",

"completed": "2019-08-24T14:15:22Z",

"links": [{"source": "string",\
\
"description": "string",\
\
"link": "string"\
\
}\
\
],

"startDateTime": "2019-08-24T14:15:22Z",

"categories": ["string"\
\
],

"owner": "string",

"omitted": ["notes"\
\
]

}

}`

## [tag/Tasks/operation/deleteTask](https://apirefs.aurinko.io/\#tag/Tasks/operation/deleteTask) Delete a task by id

delete/v1/tasklists/{taskListId}/tasks/{id}

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/tasks/{id}

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |
| id<br>required | string<br>Task id |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X DELETE https://api.aurinko.io/v1/tasklists/{taskListId}/tasks/{id}
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"status": "Ok"

}`

## [tag/TaskSync](https://apirefs.aurinko.io/\#tag/TaskSync) Task sync

Sync/delta methods.

## [tag/TaskSync/operation/taskSyncStart](https://apirefs.aurinko.io/\#tag/TaskSync/operation/taskSyncStart) Start a new task sync

post/v1/tasklists/{taskListId}/sync

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/sync

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

##### query Parameters

|     |     |
| --- | --- |
| skipCompletedBeforeDate | string <date-time> <br>Skip completed tasks before date. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X POST -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/tasklists/{taskListId}/sync \
    -d skipCompletedBeforeDate='2023-05-29T10:58:27Z'
```

### Response samples

- 200
- 401

Content type

application/json

Copy

`{"syncUpdatedToken": "string",

"syncDeletedToken": "string",

"ready": true

}`

## [tag/TaskSync/operation/taskSyncUpdated](https://apirefs.aurinko.io/\#tag/TaskSync/operation/taskSyncUpdated) Request changed tasks (deltas)

get/v1/tasklists/{taskListId}/sync/updated

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/sync/updated

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/tasklists/{taskListId}/sync/updated \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"etag": "string",\
\
"title": "string",\
\
"lastModifiedTime": "2019-08-24T14:15:22Z",\
\
"parentId": "string",\
\
"position": "string",\
\
"notes": "string",\
\
"status": "notStarted",\
\
"importance": "low",\
\
"due": "2019-08-24T14:15:22Z",\
\
"completed": "2019-08-24T14:15:22Z",\
\
"links": [{"source": "string",\
\
"description": "string",\
\
"link": "string"\
\
}\
\
],\
\
"startDateTime": "2019-08-24T14:15:22Z",\
\
"categories": ["string"\
\
],\
\
"owner": "string",\
\
"omitted": ["notes"\
\
]\
\
}\
\
]

}`

## [tag/TaskSync/operation/taskSyncDeleted](https://apirefs.aurinko.io/\#tag/TaskSync/operation/taskSyncDeleted) Request deleted tasks (deltas)

get/v1/tasklists/{taskListId}/sync/deleted

Production server

https://api.aurinko.io/v1/tasklists/{taskListId}/sync/deleted

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| taskListId<br>required | string<br>Task list id |

##### query Parameters

|     |     |
| --- | --- |
| deltaToken | string or null<br>A token received as nextDeltaToken from a previous sync request or a start sync request |
| pageToken | string or null<br>A token received as nextPageToken from a previous page request |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**410**

SyncToken expired, retrieve a new syncToken and try again

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -X GET -H 'Authorization: Bearer <access token>' \
    -G https://api.aurinko.io/v1/tasklists/{taskListId}/sync/deleted \
    -d deltaToken='a8b7c6d5e4f3g2h1'
```

### Response samples

- 200
- 401
- 410

Content type

application/json

Copy
Expand all  Collapse all

`{"nextPageToken": "string",

"nextDeltaToken": "string",

"length": 0,

"records": [{"id": "string",\
\
"timestamp": "2019-08-24T14:15:22Z"\
\
}\
\
]

}`

## [tag/Webhooks](https://apirefs.aurinko.io/\#tag/Webhooks) Webhooks

Webhooks allow your application to receive simple notifications when certain events occur.
For implementation details, refer to the [Aurinko Webhooks API documentation](https://docs.aurinko.io/unified-apis/webhooks-api).

## [tag/Webhooks/operation/getSubscriptions](https://apirefs.aurinko.io/\#tag/Webhooks/operation/getSubscriptions) Get a list of push event subscriptions

get/v1/subscriptions

Production server

https://api.aurinko.io/v1/subscriptions

See [Webhooks](https://apirefs.aurinko.io/#tag/Webhooks) for details.

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### query Parameters

|     |     |
| --- | --- |
| limit | integer or null <int32> <br>Default: 50<br>page size |
| offset | integer or null <int32> <br>Default: 0<br>return records offset by the given number |
| includeInactive | boolean or null<br>Default: false<br>include inactive subscriptions |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- cURL

Copy

```
curl -H 'Authorization: Bearer <access token>' \
    -X POST https://api.aurinko.io/v1/subscriptions
```

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"offset": 0,

"totalSize": 0,

"done": true,

"records": [{"id": 0,\
\
"resource": "string",\
\
"notificationUrl": "string",\
\
"active": true,\
\
"failSince": "2019-08-24T14:15:22Z",\
\
"failDescription": "string",\
\
"disabledByBilling": true,\
\
"filters": ["withoutDrafts"\
\
],\
\
"detailLevel": "signal"\
\
}\
\
]

}`

## [tag/Webhooks/operation/subscribe](https://apirefs.aurinko.io/\#tag/Webhooks/operation/subscribe) Create a push event subscription

post/v1/subscriptions

Production server

https://api.aurinko.io/v1/subscriptions

See [Webhooks](https://apirefs.aurinko.io/#tag/Webhooks) for details.

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### Request Body schema: application/json

Resource, i.e '/email/messages', '/calendars/primary/events', '/calendars/{id}/events'

|     |     |
| --- | --- |
| resource | string |
| notificationUrl | string |
| filters | Array of strings (DataConsumerFilter) <br>Items Value:"withoutDrafts" |
| detailLevel | string (DataConsumerDetailLevel) <br>Enum:"signal""status"<br>Level `signal` supported by Google subscriptions on `/email/messages` (if Pub/Sub activated) and `/calendar/:id/events`.<br>Minimalist notification. Dispatches a webhook without a data payload.<br>Use this to trigger internal sync logic while keeping network overhead and data exposure to a minimum. |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Request samples

- Payload
- cURL

Content type

application/json

Copy
Expand all  Collapse all

`{"resource": "string",

"notificationUrl": "string",

"filters": ["withoutDrafts"\
\
],

"detailLevel": "signal"

}`

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"resource": "string",

"notificationUrl": "string",

"active": true,

"failSince": "2019-08-24T14:15:22Z",

"failDescription": "string",

"disabledByBilling": true,

"filters": ["withoutDrafts"\
\
],

"detailLevel": "signal"

}`

## [tag/Webhooks/operation/getSubscription](https://apirefs.aurinko.io/\#tag/Webhooks/operation/getSubscription) Check a subscription status

get/v1/subscriptions/{id}

Production server

https://api.aurinko.io/v1/subscriptions/{id}

See [Webhooks](https://apirefs.aurinko.io/#tag/Webhooks) for details.

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A subscription identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 200
- 401

Content type

application/json

Copy
Expand all  Collapse all

`{"id": 0,

"resource": "string",

"notificationUrl": "string",

"active": true,

"failSince": "2019-08-24T14:15:22Z",

"failDescription": "string",

"disabledByBilling": true,

"filters": ["withoutDrafts"\
\
],

"detailLevel": "signal"

}`

## [tag/Webhooks/operation/unsubscribe](https://apirefs.aurinko.io/\#tag/Webhooks/operation/unsubscribe) Remove a subscription

delete/v1/subscriptions/{id}

Production server

https://api.aurinko.io/v1/subscriptions/{id}

See [Webhooks](https://apirefs.aurinko.io/#tag/Webhooks) for details.

##### Authorizations:

_AccountToken_(_AppAuth__AccountIdHeader_) (_UserSessionHeader__AccountIdHeader_) (_UserSessionCookie__ClientIdHeader__AccountIdHeader_) (_AuthTypeHeader__ExchangeIdToken__ClientIdHeader__AccountIdHeader_)

##### path Parameters

|     |     |
| --- | --- |
| id<br>required | integer <int64> <br>A subscription identifier |

### Responses

**200**

Success

**401**

Access token is missing or invalid

**default**

See "Handling errors" section for details

### Response samples

- 401

Content type

application/json

Example

missingTokendeadTokeninvalidTokenmissingToken

Copy

`{"code": "unauthorized",

"message": "unauthorized",

"requestId": "82414de3-3815-47ef-aca1-6745e42a60d6"

}`

## [tag/Errors](https://apirefs.aurinko.io/\#tag/Errors) Handling errors

## [tag/Errors/Failing-requests](https://apirefs.aurinko.io/\#tag/Errors/Failing-requests) Failing requests

API clients must expect and gracefully handle transient errors, such as rate limiting or server errors.
We recommend baking 5xx and 429 response handling into your low-level HTTP client so your integration
can handle most errors automatically.

If a request fails, the error information is returned with the HTTP status code and error details are
usually sent as JSON content. For instance, if a requested record could not be found, the HTTP response
might look something like:

```
HTTP/1.1 404 The record could not be found
Date: Thu, 16 Mar 2020 17:41:40 GMT
Content-Type:	application/json
...

{
  "code": "badRequest",
  "message": "Bad Request",
  "requestId": "3cd38fee-714b-4fe2-8e41-0f358246526a",
  "originalError": {
    "error": {
      "code": "ErrorInvalidIdMalformed",
      "message": "Id is malformed.",
      "innerError": {
        "date": "2020-08-17T22:56:24",
        "request-id": "be4b9a5c-9c29-4cd4-b815-90b5e5bf8f07"
      }
    }
  }
}
```

Note that, in general, if a request causes a new record to be created (like a new event, or contact, etc.),
the response will use the "201 Created" status. Any other successful operation (like a successful query,
delete, or update) will use a 200 status code.

## [tag/Errors/Rate-limiting-(429-Too-Many-Requests)](https://apirefs.aurinko.io/\#tag/Errors/Rate-limiting-(429-Too-Many-Requests)) Rate limiting (429 Too Many Requests)

If you exceed rate limits imposed by a remote API like Google, Graph, MS Exchange, you will
get a 429 Too Many Requests response. Your application should retry with exponential backoff.

## [tag/Errors/5xx-server-errors](https://apirefs.aurinko.io/\#tag/Errors/5xx-server-errors) 5xx server errors

If Aurinko is having trouble, you will get a response with a 5xx status code indicating a server error.
500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable), and 504 (Gateway Timeout)
may be retried with exponential backoff.

## [tag/Errors/404-Not-Found](https://apirefs.aurinko.io/\#tag/Errors/404-Not-Found) 404 Not Found

API requests may get 404 due to a deleted item or insufficient permissions, etc. Do not automatically
retry these requests.

## [tag/Errors/408-Request-timeout](https://apirefs.aurinko.io/\#tag/Errors/408-Request-timeout) 408 Request timeout

API requests may timeout for some reasons. Do automatically
retry these requests.

## [tag/Errors/412-Precondition-Failed](https://apirefs.aurinko.io/\#tag/Errors/412-Precondition-Failed) 412 Precondition Failed

PATCH API requests may get 412 due to a mismatching ETag header (If-Match) which indicates
the contact has changed since its data was read.

## [tag/RateLimiting](https://apirefs.aurinko.io/\#tag/RateLimiting) Rate Limiting

API calls are limited to 250 requests per second.
Webhooks from providers (such as webhooks from the Office, Google, and others) are limited to 3,000 requests per second.
