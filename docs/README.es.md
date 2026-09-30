<div align="center">

# OpenRouter Account Factory

**Crea y verifica cuentas de OpenRouter de principio a fin — registro, verificación por correo, onboarding y provisión de API keys — con un solo comando.**

[![CI](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](../package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet.svg)](#contribuir)
[![GitHub stars](https://img.shields.io/github/stars/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/network/members)
[![GitHub issues](https://img.shields.io/github/issues/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/issues)
[![Last commit](https://img.shields.io/github/last-commit/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/commits/main)

[English](../README.md) · [Bahasa Indonesia](README.id.md) · [Español](README.es.md) · [中文](README.zh.md) · [日本語](README.ja.md)

</div>

---

## Descripción general

`openrouter-account-factory` es una CLI de Node.js sin dependencias que automatiza por completo la
creación de cuentas de OpenRouter usando direcciones de correo temporal de
[Zenvex](https://zenvex.dev). Controla un navegador Chrome/Chromium real mediante el
**Chrome DevTools Protocol (CDP)** y completa cada paso que haría una persona:

1. **Registro** — rellena el formulario de registro de OpenRouter.
2. **Verificación** — lee el enlace de verificación del buzón temporal y lo abre.
3. **Onboarding** — recorre la encuesta posterior al registro.
4. **Provisión** — crea una API key nueva, sin caducidad y sin límite, y la copia.

Verificado de principio a fin: una ejecución con `--count 10` completó **10/10 cuentas**.

> [!IMPORTANT]
> Esta herramienta es solo para **pruebas legítimas, QA, investigación y fines educativos**. Eres
> responsable de cumplir los Términos de Servicio de OpenRouter y las leyes aplicables. Úsala bajo
> tu propio riesgo.

## Características

- ⚡ **Cero dependencias** — usa el `WebSocket` global integrado (Node ≥ 20).
- 🌐 **Funciona en cualquier lugar** — cualquier endpoint CDP: Browser Use Cloud, Chrome en Docker, Chrome local.
- 📧 **Verificación temp-mail** — sondeo automático del buzón y extracción del enlace.
- 🛡️ **Consciente de anti-bot** — espera los intersticiales `protect-check` de Cloudflare.
- 🔑 **Provisión de keys** — crea una `Main Key` con nombre (sin caducidad, sin límite).
- 🧩 **Automatizable** — salida JSONL limpia, `--count N`, nombres/dominios/contraseñas configurables.
- 🔁 **Resiliente** — reintenta ante objetivos CDP obsoletos y cierra pestañas sobrantes.

## Requisitos

| Requisito | Detalles |
|---|---|
| **Node.js** | `>= 20` (`WebSocket` integrado; sin `npm install`) |
| **Navegador** | Cualquier Chrome/Chromium con un endpoint WebSocket CDP |
| **SO** | Linux, macOS o Windows |

## Instalación

```bash
git clone https://github.com/0xgetz/openrouter-account-factory.git
cd openrouter-account-factory
# no se necesita npm install — cero dependencias
```

## Uso

Apunta la CLI a un endpoint CDP y ejecútala:

```bash
BU_CDP_WS="wss://<tu-navegador>/devtools/browser/<id>" \
  node src/index.mjs --count 10 --password 'TuPassword!1' --out ./openrouter_accounts.jsonl
```

### Opciones de la CLI

| Flag | Predeterminado | Descripción |
|------|----------------|-------------|
| `--count N` | `1` | Número de cuentas a crear |
| `--password P` | aleatoria | Contraseña para cada cuenta |
| `--first NAME` | `Budi` | Nombre en el registro |
| `--last NAME` | `Santoso` | Apellido en el registro |
| `--domain D` | `souss.dev` | Dominio receptor de Zenvex |
| `--out PATH` | `./openrouter_accounts.jsonl` | Archivo de resultados (un JSON por línea) |
| `--cdp URL` | `$BU_CDP_WS` / `$BU_CDP_URL` | Endpoint WebSocket CDP |
| `--help`, `-h` | — | Mostrar ayuda |
| `--version`, `-v` | — | Mostrar versión |

### Conectar un navegador

**Opción A — Browser Use Cloud**

```bash
export BU_CDP_WS="wss://<sesion>.cdp.browser-use.com/devtools/browser/<id>"
node src/index.mjs --count 5
```

**Opción B — Chrome local**

```bash
# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=./.chrome-profile
# luego
node src/index.mjs --cdp "$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)" --count 1
```

## Salida

Los resultados se añaden al archivo `--out` en formato JSONL:

```json
{"email":"orm60kb1mg5r@souss.dev","key":"sk-or-v1-bf95...1c6f","ok":true,"created":"2026-09-29T04:11:08.371Z"}
```

Se incluye una página de ejemplo legible en `docs/sample-output.html`.

## Cómo funciona

1. Se genera una dirección aleatoria en el dominio Zenvex `souss.dev` y se abre su buzón.
2. Se rellena y envía el formulario de registro de OpenRouter.
3. Se espera el intersticial `protect-check` de Cloudflare.
4. Se abre el correo de verificación y se sigue su enlace, iniciando sesión.
5. Se completa la encuesta de onboarding.
6. Se crea una `Main Key` nueva (sin caducidad, sin límite) y se lee del portapapeles.

## Estructura del proyecto

```
openrouter-account-factory/
├── src/
│   └── index.mjs                 # toda la CLI + cliente CDP (cero dependencias)
├── docs/
│   ├── README.id.md              # Bahasa Indonesia
│   ├── README.es.md              # Español
│   ├── README.zh.md              # 中文
│   ├── README.ja.md              # 日本語
│   ├── ARCHITECTURE.md
│   └── sample-output.html
├── .github/
│   ├── workflows/ci.yml
│   └── ISSUE_TEMPLATE/
├── package.json
├── LICENSE
└── README.md
```

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `Temporary email services are not supported` | Dominio en lista negra. Usa `--domain souss.dev`. |
| Atascado en `Verifying your request` | `protect-check` de Cloudflare. El script espera ~2 min; mantén vivo el navegador. |
| `Session with given id not found` | Objetivo CDP obsoleto. El script se reconecta; si persiste, reinicia el navegador. |
| `no verification link` | La vista previa del buzón no cargó. El script selecciona la fila y pulsa Enter. |
| `zenvex address mismatch` | Zenvex conservó la dirección anterior. El script la reenvía; usa una sola pestaña. |

## Contribuir

¡Las contribuciones son bienvenidas! Abre un PR:

1. Haz fork del repo
2. Crea una rama (`git checkout -b feature/nueva-funcion`)
3. Haz commit (`git commit -m 'feat: añadir nueva función'`)
4. Sube y abre un Pull Request

## Licencia

Distribuido bajo la **Licencia MIT**. Consulta [`LICENSE`](../LICENSE).

## Aviso legal

Este proyecto se ofrece con fines educativos y de pruebas legítimas. Los autores no se hacen
responsables del mal uso ni del incumplimiento de los términos de servicio de terceros.

<div align="center">

Hecho con ❤️ por [0xgetz](https://github.com/0xgetz)

⭐ **¡Dale una estrella si te resulta útil!**

</div>
