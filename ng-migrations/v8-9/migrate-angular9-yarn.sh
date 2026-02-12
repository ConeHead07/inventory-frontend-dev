#!/bin/bash
set -e

yarn install --frozen-lockfile
npx @angular/cli@9 update @angular/core@9 @angular/cli@9
ng build
