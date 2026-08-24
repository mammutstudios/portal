#!/usr/bin/env bash
#
# Plausible Community Edition opzetten op een verse Ubuntu-VPS.
#
# Gebruik:   sudo bash setup.sh analytics.mammutstudios.com
#
# Veilig om opnieuw te draaien: elke stap controleert eerst of hij al gedaan is.
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Geef het domein mee, bijvoorbeeld:" >&2
  echo "  sudo bash setup.sh analytics.mammutstudios.com" >&2
  exit 1
fi

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "1/6  Controleren of $DOMAIN naar deze server wijst"
SERVER_IP="$(curl -fsS https://api.ipify.org || true)"
DNS_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
if [[ -z "$DNS_IP" ]]; then
  echo "FOUT: $DOMAIN resolvet nog niet. Zet eerst het DNS-record." >&2
  exit 1
fi
if [[ -n "$SERVER_IP" && "$DNS_IP" != "$SERVER_IP" ]]; then
  echo "LET OP: $DOMAIN wijst naar $DNS_IP, deze server is $SERVER_IP."
  echo "Caddy krijgt dan geen certificaat. Doorgaan? [j/N]"
  read -r ok; [[ "$ok" == "j" ]] || exit 1
fi

say "2/6  Swap aanzetten (4 GB)"
if swapon --show | grep -q '/swapfile'; then
  echo "Swap staat al aan, overgeslagen."
else
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "3/6  Systeem bijwerken en Docker installeren"
apt-get update -qq && apt-get upgrade -y -qq
if command -v docker >/dev/null; then
  echo "Docker is er al: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
fi

say "4/6  Plausible Community Edition ophalen"
INSTALL_DIR=/opt/plausible-ce
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "Bestaat al in $INSTALL_DIR, overgeslagen."
else
  git clone --depth 1 https://github.com/plausible/community-edition "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

say "5/6  Configuratie schrijven"
if [[ -f .env ]]; then
  echo ".env bestaat al; niet overschreven (je sleutel blijft dus staan)."
else
  {
    echo "BASE_URL=https://$DOMAIN"
    echo "SECRET_KEY_BASE=$(openssl rand -base64 48)"
  } > .env
fi

cat > Caddyfile <<CADDYEOF
$DOMAIN {
	reverse_proxy plausible:8000
}
CADDYEOF

cat > compose.caddy.yml <<'YMLEOF'
services:
  caddy:
    image: caddy:2
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - plausible

volumes:
  caddy_data:
  caddy_config:
YMLEOF

say "6/6  Starten"
docker compose -f compose.yml -f compose.caddy.yml up -d

cat <<DONE

Klaar. Open https://$DOMAIN en maak de eerste gebruiker aan.

Handig om te weten:
  logs        cd $INSTALL_DIR && docker compose logs -f
  herstarten  cd $INSTALL_DIR && docker compose restart
  geheugen    free -h

Certificaat komt er niet? Kijk in de Caddy-logs; meestal wijst het DNS-record
nog niet naar deze server, of poort 80 is dicht.
DONE
