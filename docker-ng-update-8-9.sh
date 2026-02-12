#1/bin/bash

node -v
npm -v
yarn -v

ng version

ng update

# ng update @angular/core@9 @angular/cli@9 --force --package-manager=yarn

# 1. Die lokale CLI-Version "anheben" ohne ng update
# Da ng update versucht, schlau zu sein und dabei scheitert, machen wir den ersten Schritt manuell über Yarn:
# Bash Im Container:
# Wir heben die Pakete in der package.json manuell an
# yarn add @angular/core@9 @angular/cli@9 @angular/compiler@9 @angular/common@9 @angular/platform-browser@9 @angular/platform-browser-dynamic@9 @angular/forms@9 @angular/router@9 --exact --ignore-engines

# Wenn alle vorhergenden Versuche scheitern, müssen die tsconfig.json und tsconfig.app.json
# händisch für die Ivy-Engine eingerichtet werden
# 1. tsconfig.app.json 
# Am Ende folgenden Abschnitt hinzufügen und dabei auf das Komma vor dem neuen Eintrag achten
# ,
#  "angularCompilerOptions": {
#    "enableIvy": true,
#    "allowEmptyCodegenFiles": true
#  }
#
# 2. tsconfig.json
# bestehenden Eintrag (alternativ neu anlegen) um enableIvy ergänzen
# ,
#  "angularCompilerOptions": {
#    "fullTemplateTypeCheck": true,
#    "strictInjectionParameters": true,
#    "enableIvy": true
#  }

# In Angular 9 gab es einen Wechsel in der Art, wie Styles optimiert werden. 
# Da wir in einem Node 12 Container sind, 
# beißen sich oft die alten node-sass Binärdateien mit dem neuen Angular-Tooling.

# Danach folgenden Befehl ausführen
yarn install --ignore-engines

# Wir müssen das @angular-devkit/build-angular zwingend auf die Version 9 heben, damit es mit dem installierten Angular 9 Compiler zusammenarbeiten kann.
yarn add @angular-devkit/build-angular@~0.901.15 @angular/compiler-cli@9 @angular/language-service@9 typescript@~3.8.3 --dev --ignore-engines

# Testen
ng serve --host 0.0.0.0 --port 4201

# Das ist ein perfektes Ergebnis! Wir haben jetzt die "Inkonsistenz" in deinem Projekt behoben.
# Schau dir die Liste der installierten Pakete an: 
# Du hast jetzt webpack@4.42.0, sass@1.26.3 und autoprefixer@9.7.4 
# direkt über das neue @angular-devkit/build-angular@0.901.15 erhalten. 
# Das sind genau die Versionen, die Angular 9 braucht, um CSS und SCSS fehlerfrei zu verarbeiten. 
# Der Fehler Cannot read property 'node' of undefined sollte damit Geschichte sein, 
# da er durch die veralteten Build-Tools in Kombination mit dem neuen Angular-Core verursacht wurde.


# In src/app/shared/services/dbexport.service.ts befindet sich ein 
# import @progress/kendo-file-saver
# der nicht aufgelöst werden kann, da das Paket weder in node_modules, package.json oder app.module.ts
# definiert ist. Eigenartig, aber ist so!

# Daher müssen wir das damals zu Angular 8 aktuelle Paket nachinstallieren
yarn add @progress/kendo-file-saver@1.1.0




# ---

# Deinstalliere das alte, problematische node-sass
# yarn remove node-sass

# Installiere den modernen Dart-Sass Compiler (plattformunabhängig)
# yarn add sass --dev --ignore-engines

# Installiere/Update PostCSS, um sicherzustellen, dass 'node' property Fehler verschwinden
# yarn add postcss@latest --dev --ignore-engines