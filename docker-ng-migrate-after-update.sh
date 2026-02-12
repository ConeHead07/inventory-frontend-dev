#!/bin/bash

# Der folgende Befehl ist leider gescheitert, da "ng update" selbst mit "--migrate-only" aus seiner Zeitkapsel ausbricht
# und nach aktuellsten Versionen sucht, die aber inkompatibel zu ng 8 und ng 9 sind :-(
# > ng update @angular/core@9 @angular/cli@9 --from 8 --to 9 --migrate-only --force
# Selbst mit --migrate-only versucht das CLI im Hintergrund, die "Update-Logik" zu aktualisieren 
# und stößt dabei wieder gegen die Node-Versionsprüfung. 
# Das liegt daran, dass der Befehl ng update intern fest verdrahtet ist, nach Updates für sich selbst zu suchen.
# Wir müssen nun den "Hardcore-Migrations-Modus" aktivieren: Wir rufen das Migrations-Script (Schematic) direkt auf, ohne den ng update Wrapper zu benutzen.
# Die Lösung: ng generate statt ng update
# Angular-Migrationen sind technisch gesehen nichts anderes als "Schematics". Wir können sie manuell triggern:
# 1. Die Angular 9 Migration direkt aufrufen: Führe diesen Befehl im Container aus:
#
# Bash
# ng generate @angular/core:version-9-migration --force

# Da wir nun alle Automatismen des CLIs ausgeschöpft haben (und das CLI uns immer wieder mit der Node-Versionsprüfung ausbremst), schwenken wir auf die effizienteste Methode für Profis um: Wir führen die Migration über das @angular-devkit/schematics-cli aus. Das ist das "Skalpell" hinter dem Angular CLI.

# Schritt 1: Das Schematics-Tool installieren
# Wir installieren das Werkzeug, das Schematics direkt ausführen kann, ohne die lästigen ng update-Prüfungen:
# Bash

# Das ist der Durchbruch! 
# Das Tool ist installiert und bereit. Da es ein reiner Script-Runner ist, wird es die lästige Node-Versionsprüfung 
# des Angular-CLIs einfach ignorieren.
npm install -g @angular-devkit/schematics-cli@0.901.15

# Wir müssen dem Tool den absoluten Pfad zur Migrations-Logik mitteilen.
# Wenn die Suche mit 'find' nichts findet:
# > find node_modules/@angular/core -name "collection.json"
# Sehen wir nach, ob der schematics - Ordner existis
# > ls -d node_modules/@angular/core/schematics
# Response> node_modules/@angular/core/schematics

schematics ./node_modules/@angular/core/schematics/collection.json:version-9-migration --force
