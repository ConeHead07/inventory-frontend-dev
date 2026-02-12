
FROM node:12.22.12-slim

# Die offiziellen Node-Images werden so zusammengestellt, 
# dass die mitgelieferten Tools (npm und Yarn) perfekt zu der jeweiligen Node-Version passen.
# Node 12.22.12 wird mit npm 6.14.x ausgeliefert.

# 1. Debian Stretch Quellen auf Archive umstellen (EOL Support)
RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org/debian-security|archive.debian.org/debian-security|g' /etc/apt/sources.list && \
    sed -i '/stretch-updates/d' /etc/apt/sources.list

# 2. System-Abhängigkeiten installieren
RUN apt-get update && apt-get install -y \
    python \
    make \
    g++ \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 3. Globales Angular CLI installieren. 
# Wir nutzen --force, um Symlink-Konflikte (wie bei Yarn gesehen) zu ignorieren.
# Wir verzichten auf die Neuinstallation von Yarn, da es im Image bereits enthalten ist.
RUN npm config set strict-ssl false && \
    npm install -g @angular/cli@9.1.15 --force

# Alte durch Punkt 3. ersetzte Anweisungen ohne yarn, da das node-image bereits die passende yarn version bereitstellt
# Globales CLI installieren - wir entfernen --silent, um Fehler besser zu sehen
# Zudem setzen wir das Registry-Zertifikat-Handling herab, falls Node 12 SSL-Probleme hat
# RUN npm config set strict-ssl false && \
#    npm install -g @angular/cli@9.1.15 yarn@1.22.19

WORKDIR /app

# Wir kopieren package.json und yarn.lock zuerst, um Docker-Caching zu nutzen
COPY package.json yarn.lock* ./

# Engine-Checks ignorieren, falls alte Pakete in Node 12 meckern
RUN yarn config set ignore-engines true

# Installation der Abhängigkeiten
RUN yarn install --network-timeout 100000

# Den Rest des Codes kopieren
COPY . .

# Angular Standard-Port
EXPOSE 4200

# Startbefehl: Wir binden auf 0.0.0.0, damit der Zugriff von außen klappt
CMD ["ng", "serve", "--host", "0.0.0.0"]