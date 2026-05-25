# Možnosti využití mikrokontroleru řady STM32F v součinnosti s wifi modulem ESP32

[![Embedded Systems](https://img.shields.io/badge/Embedded-STM32%20%7C%20ESP32-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-teal.svg)](#)

Bakalářský projekt zaměřený na návrh, realizaci a vyhodnocení distribuovaného vestavěného systému se dvěma mikrokontroléry. Cílem je striktní **oddělení nízkoúrovňového řízení v reálném čase** (STM32) od **asynchronní síťové komunikace** (ESP32).

* **Autor:** Daniel Kňourek
* **Instituce:** Technická univerzita v Liberci (TUL) | Fakulta mechatroniky, informatiky a mezioborových studií (FM)
* **Rok:** 2026

---

## 🏗️ Architektura systému

Systém se skládá ze tří hlavních vrstev propojených optimalizovaným komunikačním řetězcem:

```text
┌───────────────────────────────────────┐
│   Webová aplikace (React + Tailwind)  │
│   Dashboard s grafy a ovládáním v RT  │
└──────────────────────┬────────────────┘
                   ▲   │
                   │   │  REST API / WebSockets (Wi-Fi)
                   │   ▼
┌──────────────────┴────────────────────┐
│       ESP32 (ESP-IDF, FreeRTOS)       │
│  Asynchronní síťová brána a servery   │
└──────────────────────┬────────────────┘
                   ▲   │
                   │   │  UART (Protocol Buffers)
                   │   ▼
┌──────────────────┴────────────────────┐      ┌─────────────────────────────┐
│       STM32F746G (Core C, HAL)        ├─────►│ Regulovaná analogová smyčka │
│  Nízkoúrovňové řízení v reálném čase  │◄─────┤ (PWM out, ADC in, RC filtr) │
└───────────────────────────────────────┘      └─────────────────────────────┘
```


1. **Řídicí vrstva (STM32F746G-DISCOVERY):** Vysoce výkonný mikrokontrolér s jádrem ARM Cortex-M7. Zajišťuje nízkoúrovňové výpočty a měření (ADC/DAC) bez jakéhokoliv zatížení síťovým stackem. Využívá vlastní navržený hardwarový shield pro analogovou zpětnou smyčku.
2. **Síťová brána (ESP32 DevKit v1):** Zabezpečuje bezdrátovou Wi-Fi konektivitu, provozuje vestavěný webový server s REST API pro bezstavovou konfiguraci a WebSocket server pro plně duplexní streamování dat v reálném čase.
3. **Uživatelské rozhraní (ESP-webapp):** Moderní, vysoce responzivní webový dashboard vytvořený v **Reactu (Vite + TypeScript + Tailwind CSS)** s podporou tmavého/světlého režimu, real-time vizualizací přenášených dat (grafy) a integrovanou diagnostickou konzolí.

---

## 🔌 Komunikační protokol & UART

Mezi deskami STM32 a ESP32 probíhá obousměrná komunikace po sériové lince UART s využitím standardu **Protocol Buffers (nanopb)**.
* **Dvoufázový přenos:** Pro vysokou spolehlivost asynchronního přenosu byl implementován mechanismus odesílání hlavičky (`FrameHeader` s CRC a délkou zprávy) následovaný samotným tělem zprávy (`FramePayload`).
* **Struktura zpráv (`messenger.proto`):** Definuje zprávy pro konfiguraci a přenos dat testovacích programů (včetně streamovaných hodnot ADC a DAC).

---

## 📊 Ukázkové programy

Pro ověření funkčnosti celého řetězce byly implementovány 3 testovací programy:
1. **Alive Ping (Test Int):** Základní ověření integrity a průchodnosti celého komunikačního řetězce.
2. **Analýza propustnosti (Test Bandwidth):** Měření maximální reálné přenosové rychlosti přes UART s různě velkými datovými bloky.
3. **Komplexní integrace (Streaming):** Plně duplexní streamování vzorků (potenciometr -> ADC -> přenos -> webový graf -> DAC -> regulace zpětné smyčky) v reálném čase.

---

## 🛠️ Vývojové prostředí

Projekt je plně kontejnerizován pomocí **Dockeru** a **VS Code Dev Containers** pro zajištění jednotného vývojového prostředí:
* Rychlé zprovoznění bez nutnosti lokální instalace toolchainů (ESP-IDF, STM32 GNU arm toolchain).
* Podpora USB bridge do WSL2 pomocí nástroje `usbipd` pro bezproblémové flashování a ladění mikrokontrolérů.
