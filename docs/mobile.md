# Native Mobile Shell

Updated: 2026-05-20

Routyne ships a Capacitor shell for Android and iOS. The shell loads the hosted Next app by default, then adds native deep links, native local notifications, and native push registration on top.

## Identity

- App id and bundle id: `com.trebollabs.routyne`
- Auth callback scheme: `com.trebollabs.routyne://auth/callback`
- Primary notification path for installed apps: native local notifications
- Fallback path for browser and PWA installs: Web Push

## What The Shell Does

- Loads the hosted Vercel app instead of a static export.
- Receives ordinary web app fixes after the `main` branch deploys to Vercel; force-close and reopen the installed app if it is holding an old JavaScript bundle.
- Routes auth callbacks back into the hosted `/auth/callback` handler so Supabase PKCE cookies can finish the session exchange.
- Enables native local notifications without requiring Firebase.
- Registers a native push token and stores it through `/api/push/devices` only when `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true` and the user is signed in.
- Schedules rest timers and streak reminders locally on the device. Rest timers are driven by wall-clock target times and remain mounted while moving between app views.
- Keeps Web Push as the fallback for browser installs and the installed PWA.

## Required Accounts And Assets

- Android Studio, Android SDK, and a Java 21 JDK. Android Studio's bundled JBR 21 is the easiest option.
- A Firebase project with an Android app only if testing native remote push registration.
- `android/app/google-services.json` only when `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true` for Android FCM token registration.
- `ios/App/App/GoogleService-Info.plist` only when native remote push registration is enabled for iOS later.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for device registration.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` if you still want Web Push fallback.
- `CRON_SECRET` if you keep the protected streak reminder cron enabled.

Do not expect the app to bypass silent mode, Focus, DND, or user-disabled channels. Android and iOS still control alert delivery.

## Install On An Android Phone

1. Install Node 20, pnpm, Android Studio, and a Java 21 JDK.
2. Enable Developer options and USB debugging on the phone.
3. Copy `.env.example` to `.env.local` and fill in the required values.
4. Add `android/app/google-services.json` from your Firebase Android app.
5. If you want the phone to load a local dev server, start `pnpm dev` and set `CAPACITOR_SERVER_URL` to a LAN-reachable URL such as `http://192.168.1.20:3000`.
6. Run `pnpm install` once after dependency changes.
7. Run `pnpm cap:sync` so Capacitor copies the latest web build, config, and plugins into `android/` and `ios/`.
8. Open Android Studio with `pnpm exec cap open android`.
9. Connect the phone and press Run in Android Studio.

If you want a debug APK from the command line, use Android Studio's bundled JDK 21:

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:$PATH" \
./gradlew assembleDebug
```

The repo also includes helper scripts:

- `pnpm mobile:android:install` builds the debug APK and installs it with `adb install -r`.
- `pnpm mobile:android:refresh` pulls the latest `main` branch and reminds you to force-close/reopen the installed app after the hosted Vercel deploy finishes.

If you are testing the production site instead of local changes, leave `CAPACITOR_SERVER_URL` unset. The shell then loads `NEXT_PUBLIC_SITE_URL`.

## Web-Only Mobile Deploys

The checked-in native shell loads the hosted Next app, so web code changes such as workout UI, Zustand store behavior, sync logic, and notification scheduling helpers reach installed apps through the next Vercel deployment from `main`.

You do not need `pnpm cap:sync`, Android Studio, or a new APK for these hosted web changes. Use the native build loop only when changing `android/`, `ios/`, `capacitor.config.ts`, native plugin configuration, app icons/splash assets, or when intentionally testing a bundled local build.

After the Vercel deployment is live, force-close and reopen the installed app during QA so the WebView fetches the latest bundle.

## What To Test On The Phone

- App launch loads the hosted Routyne shell.
- Google sign-in and magic-link sign-in return to the app through the custom scheme.
- Notification permission prompts appear once, then diagnostics show the OS state.
- A rest timer scheduled in the app fires as a native notification when the timer ends.
- A rest timer keeps counting down when navigating from the active session to History, Nutrition, Stats, or Routines.
- A streak reminder schedules at the configured reminder time and uses the current timezone.
- Completing a workout on the same day cancels the reminder for that day.
- Denying notification permission still leaves the app usable, with clear settings guidance in Account.

## Troubleshooting

- If the app opens to a blank screen, confirm the phone can reach the URL in `CAPACITOR_SERVER_URL`.
- If the build fails with `invalid source release: 21`, make sure Gradle is using Android Studio's bundled JDK 21 instead of a system JDK 17.
- If notifications do not appear, check the Android notification permission and the notification channel settings in the OS.
- If sign-in returns to the browser instead of the app, verify the custom URL scheme is present in the generated Android and iOS projects.
- If native local notifications fail, check the OS notification permission and app notification channels first.
- If native push token registration fails after setting `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true`, make sure the Firebase file is present and the user is signed in.
