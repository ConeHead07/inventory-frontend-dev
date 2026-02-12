Hilfreiche Tipps und Links zur Migration alter Angular-Versionen

## 🔎 Wo findest du die richtige TypeScript-Version?
Offiziell dokumentiert ist das hier: 👉 https://angular.io/guide/versions

```terminal
Angular-Version	Release-Datum	Empfohlene/minimale Node-Version
Angular 8	Mai 2019	⚠️ Node 10.9+, empfohlen: 10.13+ (LTS)
Angular 9	Februar 2020	⚠️ Node ~10.13 (weiterhin), später: 12+
Angular 10	Juni 2020	✅ Node 10 / 12
Angular 11	November 2020	✅ Node 10 / 12
Angular 12	Mai 2021	⛔ Nur Node 12+
Angular 13	November 2021	⛔ Ab jetzt nur noch Node 12.20+, 14+, 16+
Angular 14	Juni 2022	⛔ Node 14.15+
Angular 15	Dezember 2022	✅ Node 14.20+ / 16+
Angular 16	Mai 2023	✅ Node 16.14+ / 18+
Angular 17	November 2023	✅ Node 18.13+ / 20+
Angular 18+	Juli 2024	⛔ Exklusiv Node.js 18.13+/20+/22.x
Angular 19+	November 2025+	⛔ Node.js 18.19+/20+/22.x (keine Unterstützung für frühere!)
```



Da steht z. B.:

Angular	TypeScript
8	~3.4 oder ~3.5
9	~3.7
10	~3.9
11	~4.0
12	~4.2
13+	~4.4 oder höher



Bei besonders alten Angular - Versionen wie 8 und 9, muss darauf geachtet werden,
nach Möglichkeit, die zum damaligen Zeitpunkt aktuellen Node.js / NPM Versionen 
zu nutzen, da sonst Konflikte mit zu neuen Paketen auftreten.

Falls nvm installiert ist und nvm via "nvm install x.x.x" Probleme hat,
eine alte Version zu installieren, kann die Version manuell hinzugefügt.

Eine Liste aller node.js - Versionen in unterschiedlichsten Formaten befindet sich unter:
https://nodejs.org/download/release

Für v12.22.12:
https://nodejs.org/download/release/v12.22.12/

Um das node.js eigene Setup zu umgehen, damit es direkt im nvm-Ordner abgelegt werden kann, verwende:
node-v12.22.12-win-x64.zip => https://nodejs.org/download/release/latest-erbium/node-v12.22.12-win-x64.zip

Die Zip-Datei entpacken ins nvm - Verzeichnis, in dem die unterschiedlichen Node-Versions-Pakete abgelegt sind:
z.B: C:\Users\barthold\AppData\Roaming\nvm\ so dass der node_modules Ordner und node.exe und npm direkt unter 
C:\Users\barthold\AppData\Roaming\nvm\v12.22.12 liegen


Da global installierte Pakete wie "ng" im node - Ordner abgelegt werden, fehlen diese bei neu installierten node-Versionen
und müssen händisch nachinstalliert werden. Im Falle von Angular 9, kann dies so nachgeholt werden:
npm install -g @angular/cli@9


Diese Übersicht ist ein essenzielles Werkzeug für die schrittweise Migration (den sogenannten "Upgrade-Pfad"). Da Angular-Migrationen oft daran scheitern, dass zu neue Node-Versionen für alte Migrationstools verwendet werden, hilft dir diese Liste dabei, die passende `nvm`-Umgebung für jeden Schritt einzustellen.

Ich habe die Daten aus deinem Fließtext rekonstruiert, strukturiert und auf Basis der offiziellen Angular-Dokumentation validiert.

---

## Angular Versionskompatibilitäts-Matrix

### 1. Actively Supported Versions

Diese Versionen befinden sich aktuell im aktiven Support oder im LTS-Status (Stand deiner Datenquelle).

| Angular | Node.js | TypeScript | RxJS |
| --- | --- | --- | --- |
| **17.3.x** | ^18.13.0 || ^20.9.0 | >=5.2.0 <5.5.0 | ^6.5.3 || ^7.4.0 |
| **17.1.x || 17.2.x** | ^18.13.0 || ^20.9.0 | >=5.2.0 <5.4.0 | ^6.5.3 || ^7.4.0 |
| **17.0.x** | ^18.13.0 || ^20.9.0 | >=5.2.0 <5.3.0 | ^6.5.3 || ^7.4.0 |
| **16.1.x || 16.2.x** | ^16.14.0 || ^18.10.0 | >=4.9.3 <5.2.0 | ^6.5.3 || ^7.4.0 |
| **16.0.x** | ^16.14.0 || ^18.10.0 | >=4.9.3 <5.1.0 | ^6.5.3 || ^7.4.0 |
| **15.1.x || 15.2.x** | ^14.20.0 || ^16.13.0 || ^18.10.0 | >=4.8.2 <5.0.0 | ^6.5.3 || ^7.4.0 |
| **15.0.x** | ^14.20.0 || ^16.13.0 || ^18.10.0 | ~4.8.2 | ^6.5.3 || ^7.4.0 |

---

### 2. Unsupported Angular Versions

Diese Versionen sind aus dem Support gefallen, stellen aber die wichtigsten Etappenziele für deine Migration dar.

| Angular | Node.js | TypeScript | RxJS |
| --- | --- | --- | --- |
| **14.2.x || 14.3.x** | ^14.15.0 || ^16.10.0 | >=4.6.2 <4.9.0 | ^6.5.3 || ^7.4.0 |
| **14.0.x || 14.1.x** | ^14.15.0 || ^16.10.0 | >=4.6.2 <4.8.0 | ^6.5.3 || ^7.4.0 |
| **13.3.x** | ^12.20.0 || ^14.15.0 || ^16.10.0 | >=4.4.3 <4.7.0 | ^6.5.3 || ^7.4.0 |
| **13.1.x || 13.2.x** | ^12.20.0 || ^14.15.0 || ^16.10.0 | >=4.4.3 <4.6.0 | ^6.5.3 || ^7.4.0 |
| **13.0.x** | ^12.20.0 || ^14.15.0 || ^16.10.0 | ~4.4.3 | ^6.5.3 || ^7.4.0 |
| **12.2.x** | ^12.14.0 || ^14.15.0 | >=4.2.3 <4.4.0 | ^6.5.3 || ^7.0.0 |
| **12.1.x** | ^12.14.0 || ^14.15.0 | >=4.2.3 <4.4.0 | ^6.5.3 |
| **12.0.x** | ^12.14.0 || ^14.15.0 | ~4.2.3 | ^6.5.3 |
| **11.2.x** | ^10.13.0 || ^12.11.0 | >=4.0.0 <4.2.0 | ^6.5.3 |
| **11.1.x** | ^10.13.0 || ^12.11.0 | >=4.0.0 <4.2.0 | ^6.5.3 |
| **11.0.x** | ^10.13.0 || ^12.11.0 | ~4.0.0 | ^6.5.3 |
| **10.2.x** | ^10.13.0 || ^12.11.0 | >=3.9.0 <4.1.0 | ^6.5.3 |
| **10.1.x** | ^10.13.0 || ^12.11.0 | >=3.9.0 <4.1.0 | ^6.5.3 |
| **10.0.x** | ^10.13.0 || ^12.11.0 | ~3.9.0 | ^6.5.3 |
| **9.1.x** | ^10.13.0 || ^12.11.0 | >=3.6.0 <3.9.0 | ^6.5.3 |
| **9.0.x** | ^10.13.0 || ^12.11.0 | >=3.6.0 <3.8.0 | ^6.5.3 |

---

### 3. Versions Before v9

Hinweis: Vor Version 9 waren die Angular-Versionen und die CLI-Versionen nicht synchronisiert. Dies ist der kritischste Bereich für deine `nvm`-Steuerung.

| Angular | Angular CLI | Node.js | TypeScript | RxJS |
| --- | --- | --- | --- | --- |
| **8.2.x** | 8.2.x || 8.3.x | ^10.9.0 | >=3.4.2 <3.6.0 | ^6.4.0 |
| **8.0.x || 8.1.x** | 8.0.x || 8.1.x | ^10.9.0 | ~3.4.2 | ^6.4.0 |
| **7.2.x** | 7.2.x || 7.3.x | ^8.9.0 || ^10.9.0 | >=3.1.3 <3.3.0 | ^6.0.0 |
| **7.0.x || 7.1.x** | 7.0.x || 7.1.x | ^8.9.0 || ^10.9.0 | ~3.1.3 | ^6.0.0 |
| **6.1.x** | 6.1.x || 6.2.x | ^8.9.0 | >=2.7.2 <3.0.0 | ^6.0.0 |
| **6.0.x** | 6.0.x | ^8.9.0 | ~2.7.2 | ^6.0.0 |
| **5.2.x** | 1.6.x || 1.7.x | ^6.9.0 || ^8.9.0 | >=2.4.2 <2.7.0 | ^5.5.0 |
| **5.0.x || 5.1.x** | 1.5.x | ^6.9.0 || ^8.9.0 | ~2.4.2 | ^5.5.0 |
| **4.2.x - 4.4.x** | 1.4.x | ^6.9.0 || ^8.9.0 | >=2.1.6 <2.5.0 | ^5.0.1 |
| **4.2.x - 4.4.x** | 1.3.x | ^6.9.0 | >=2.1.6 <2.5.0 | ^5.0.1 |
| **4.0.x || 4.1.x** | 1.0.x - 1.2.x | ^6.9.0 | >=2.1.6 <2.4.0 | ^5.0.1 |
| **2.x** | - | ^6.9.0 | >=1.8.0 <2.2.0 | ^5.0.1 |

---

### Strategische Hinweise für deine Migration:

* **Der v9-Wendepunkt:** Die Migration von v8 auf v9 ist der wichtigste Schritt, da hier die Ivy-Engine eingeführt wurde. Nutze hierfür zwingend **Node 10.13+** oder **12.11+**.
* **Peer-Dependency Konflikte:** Wenn du beim Update (z.B. auf v9) auf Fehler stößt (wie vorhin mit `angular-cropperjs`), nutze die Tabellen oben, um sicherzustellen, dass dein lokales TypeScript und RxJS innerhalb der erlaubten Ranges liegen, bevor du den nächsten Schritt wagst.
* **Migration Tooling:** Da moderne npm-Pakete oft Node 18+ verlangen, das alte Angular-CLI aber Node 12, kann es helfen, `npm install --legacy-peer-deps` zu verwenden, um starre Blockaden zu umgehen.

Soll ich dir für einen dieser spezifischen Versionssprünge (z.B. v8 auf v11) eine detaillierte Liste der notwendigen Befehle zusammenstellen?




