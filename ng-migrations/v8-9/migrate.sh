#!/bin/bash

node -v
npm -v
yarn -v

ng version

# install angular-cli global
npm install -g @angular/cli@9

# Nachdem ng verfügbar ist, ng updaten
ng update @angular/core@9 @angular/cli@9