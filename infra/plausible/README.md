# Plausible Community Edition

Zelf gehoste analytics. De portaalkoppeling leest via de Stats API, die in CE
gewoon beschikbaar is — bij Plausible Cloud zit die alleen in het Business-plan.

## Eisen aan de server

- Docker en Docker Compose
- Minimaal 2 GB RAM (ClickHouse)
- CPU met SSE 4.2 of NEON

## Op een kleine VPS (2 GB)

Werkt prima bij weinig sites en weinig verkeer, maar zet **swap** aan voordat je
begint. De zwaarste klus is de eenmalige import van je historie uit Plausible
Cloud; zonder swap wordt op 2 GB een proces afgeschoten in plaats van dat het
traag wordt.

```sh
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Controleer bij je aanbieder of je de VPS later kunt vergroten zonder opnieuw te
installeren. Kan dat niet, neem dan meteen een maat groter.

## Installeren

Zet eerst een DNS-record: `analytics.mammutstudios.com` → het IP van de server.
Dat moet klaar zijn vóór stap 2, anders krijgt Caddy geen certificaat.

```sh
git clone https://github.com/plausible/community-edition plausible-ce
cd plausible-ce

# 1. omgeving
cp /pad/naar/dit/env.example .env
sed -i "s|__SECRET__|$(openssl rand -base64 48)|" .env

# 2. reverse proxy ernaast zetten
cp /pad/naar/dit/Caddyfile ./Caddyfile
cp /pad/naar/dit/compose.caddy.yml ./compose.caddy.yml

# 3. starten
docker compose -f compose.yml -f compose.caddy.yml up -d
```

Open daarna `https://analytics.mammutstudios.com` en maak de eerste gebruiker aan.

## Daarna

1. Exporteer je data uit Plausible Cloud en importeer die in CE — dóé dit vóór
   je het abonnement opzegt, en controleer of de historie compleet is.
2. Zet op elke klantsite het script om naar je eigen domein. Bijkomend voordeel:
   een eigen domein wordt minder vaak door adblockers geblokkeerd.
3. Maak een Stats API-key aan en zet die in `.env.local` van het portaal:

   ```
   PLAUSIBLE_BASE_URL=https://analytics.mammutstudios.com
   PLAUSIBLE_API_KEY=...
   ```

## Onderhoud

Beveiligingsfixes werken pas nadat jíj de nieuwe release installeert. Volg de
releases op GitHub. Maak back-ups van **zowel** Postgres als ClickHouse; zonder
dat ben je bij een storing ook je gemigreerde historie kwijt.
