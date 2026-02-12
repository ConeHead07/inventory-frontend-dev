FROM node:12.22.12

# npm-Version passend zu Angular 9
RUN npm install -g npm@6.14.16

# Bestehende yarn - Version entfernen
RUN rm -f /usr/local/bin/yarn \
   && rm -f /usr/local/bin/yarnpkg

# Exakt passende Yarn-Classic-Version (kein Berry!)
RUN npm install -g yarn@1.22.19

# Keine globale Angular CLI – wir nutzen npx
WORKDIR /workspace

# Gruppe/Benutzer erstellen (Security)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Benutzer-Rechte einstellen
USER appuser

# Paketdateien kopieren (für optimiertes Caching)
COPY --chown=appuser:appgroup package.json yarn.lock ./

# Dependencies installieren (ohne Dev-Optimierung, also inkl. dev deps)
RUN yarn install --frozen-lockfile

# Restliche Projektdateien kopieren
COPY --chown=appuser:appgroup . .