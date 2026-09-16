# Abenteuerkarte iOS – separater Arbeitsstand

Dieser Ordner ist absichtlich **nicht** die Android/Web-Basis. iOS-spezifische Änderungen bleiben hier.

## Behobene iPhone-Punkte
- `viewport-fit=cover` in der tatsächlich geladenen `app.html`, damit Safe-Area-Werte funktionieren.
- Statusbar überlagert den WebView nicht; Dynamic Island/Notch blockiert keine oberen Controls.
- Keyboard-Resize auf `none`: die Karte bleibt stabil, Chat/KI passen nur ihre eigenen Panels an.
- Native iOS-Keyboard-Höhe wird über `--sk-ios-keyboard-height` weitergegeben.
- Native SQLite ist auf iOS verpflichtend; kein stiller IndexedDB-Fallback.
- Eigener frischer iOS-Cache (`schatzkarte_map_cache_ios_v1`) und kleinere native Insert-Batches.
- Expliziter iOS-SQLite-Pfad `Library/CapacitorDatabase`.
- iOS-OTA-Kanal nutzt `latest-ios.json`; Android/Web `latest.json` kann diese iOS-Fixes nicht überschreiben.

## Vor Build auf GitHub/macOS
1. `npm install`
2. `npx cap sync ios`
3. Xcode/GitHub Build aus `ios/App/App.xcodeproj`

`ios/App/App/public` ist absichtlich nicht im Repository: es wird von `cap sync ios` aus `src/` neu erzeugt.
