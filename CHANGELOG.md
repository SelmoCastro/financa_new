# Changelog

All notable changes to this project will be documented in this file.

## [1.8.75](https://github.com/SelmoCastro/financa_new/compare/v1.8.74...v1.8.75) (2026-05-20)

### ✨ Features

* add GTM and GA domains to CSP for analytics with LGPD consent mode
* add Google Tag Manager with LGPD consent mode, update cookie banner for analytics
* (legal) LGPD compliance - cookie banner, DPO, export-data, refund policy, consent modal

### 🐛 Bug Fixes

* all Number() on encrypted balance/amount fields → decryptAmount() (was causing NaN→0 balance corruption)
* sync build.gradle versionName to 1.8.72 (was 1.8.69 — caused update loop)
* NaN in notification amounts + stale invite refresh
* improve LGPD cookie banner - add preferences link in footer, clarify essential-only cookies
* category icons now show emoji instead of Lucide name text
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90)
* encryptDecimal rejeita NaN + saldos recalculados do DB real
* createFamily agora persiste hashedRefreshToken para backward compat

### 🧹 Chores

* sync versions 1.8.74
* (release) 1.8.74
* (release) 1.8.73
* bump version to 1.8.72 (APK)
* (release) 1.8.72
* (release) 1.8.71
* (release) 1.8.70
* (release) 1.8.69
* (release) 1.8.68

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.8.74](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.74) (2026-05-16)


### ✨ Features

* add Google Tag Manager with LGPD consent mode, update cookie banner for analytics ([eb4eee3](https://github.com/SelmoCastro/financa_new/commit/eb4eee3da6a13520e5795d6511ae8b18b171bd28))
* add GTM and GA domains to CSP for analytics with LGPD consent mode ([8d81334](https://github.com/SelmoCastro/financa_new/commit/8d81334e344e7cb994587bb3310c4ec3b3109cb3))
* **legal:** LGPD compliance - cookie banner, DPO, export-data, refund policy, consent modal ([3e921ed](https://github.com/SelmoCastro/financa_new/commit/3e921edc5cfdb1add6238478efb5af0ffe802d91))
* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* all Number() on encrypted balance/amount fields → decryptAmount() (was causing NaN→0 balance corruption) ([ad64ffe](https://github.com/SelmoCastro/financa_new/commit/ad64ffed51c4ec36d30c1b56e312c325ef7b99eb))
* category icons now show emoji instead of Lucide name text ([3fd6959](https://github.com/SelmoCastro/financa_new/commit/3fd69596602be2e60bf794913f580e0af8982e41))
* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90) ([7bac1a5](https://github.com/SelmoCastro/financa_new/commit/7bac1a51404032ec7b47f473a0a2fdefc5c430f2))
* improve LGPD cookie banner - add preferences link in footer, clarify essential-only cookies ([8044b9e](https://github.com/SelmoCastro/financa_new/commit/8044b9edf6d668f52e5649d721fcd30f28653eb0))
* NaN in notification amounts + stale invite refresh ([e4a40b1](https://github.com/SelmoCastro/financa_new/commit/e4a40b1a822e6e47390713872e1afc59eaf37366))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))
* sync build.gradle versionName to 1.8.72 (was 1.8.69 — caused update loop) ([00804eb](https://github.com/SelmoCastro/financa_new/commit/00804ebda6db8e97c36ad78fb32221cbebfb6dff))

### [1.8.73](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.73) (2026-05-15)


### ✨ Features

* add Google Tag Manager with LGPD consent mode, update cookie banner for analytics ([eb4eee3](https://github.com/SelmoCastro/financa_new/commit/eb4eee3da6a13520e5795d6511ae8b18b171bd28))
* add GTM and GA domains to CSP for analytics with LGPD consent mode ([8d81334](https://github.com/SelmoCastro/financa_new/commit/8d81334e344e7cb994587bb3310c4ec3b3109cb3))
* **legal:** LGPD compliance - cookie banner, DPO, export-data, refund policy, consent modal ([3e921ed](https://github.com/SelmoCastro/financa_new/commit/3e921edc5cfdb1add6238478efb5af0ffe802d91))
* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* category icons now show emoji instead of Lucide name text ([3fd6959](https://github.com/SelmoCastro/financa_new/commit/3fd69596602be2e60bf794913f580e0af8982e41))
* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90) ([7bac1a5](https://github.com/SelmoCastro/financa_new/commit/7bac1a51404032ec7b47f473a0a2fdefc5c430f2))
* improve LGPD cookie banner - add preferences link in footer, clarify essential-only cookies ([8044b9e](https://github.com/SelmoCastro/financa_new/commit/8044b9edf6d668f52e5649d721fcd30f28653eb0))
* NaN in notification amounts + stale invite refresh ([e4a40b1](https://github.com/SelmoCastro/financa_new/commit/e4a40b1a822e6e47390713872e1afc59eaf37366))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))
* sync build.gradle versionName to 1.8.72 (was 1.8.69 — caused update loop) ([00804eb](https://github.com/SelmoCastro/financa_new/commit/00804ebda6db8e97c36ad78fb32221cbebfb6dff))

### [1.8.72](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.72) (2026-05-15)


### 🐛 Bug Fixes

* category icons now show emoji instead of Lucide name text ([3fd6959](https://github.com/SelmoCastro/financa_new/commit/3fd69596602be2e60bf794913f580e0af8982e41))
* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90) ([7bac1a5](https://github.com/SelmoCastro/financa_new/commit/7bac1a51404032ec7b47f473a0a2fdefc5c430f2))
* improve LGPD cookie banner - add preferences link in footer, clarify essential-only cookies ([8044b9e](https://github.com/SelmoCastro/financa_new/commit/8044b9edf6d668f52e5649d721fcd30f28653eb0))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))


### ✨ Features

* add Google Tag Manager with LGPD consent mode, update cookie banner for analytics ([eb4eee3](https://github.com/SelmoCastro/financa_new/commit/eb4eee3da6a13520e5795d6511ae8b18b171bd28))
* add GTM and GA domains to CSP for analytics with LGPD consent mode ([8d81334](https://github.com/SelmoCastro/financa_new/commit/8d81334e344e7cb994587bb3310c4ec3b3109cb3))
* **legal:** LGPD compliance - cookie banner, DPO, export-data, refund policy, consent modal ([3e921ed](https://github.com/SelmoCastro/financa_new/commit/3e921edc5cfdb1add6238478efb5af0ffe802d91))
* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))

### [1.8.71](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.71) (2026-05-14)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* category icons now show emoji instead of Lucide name text ([3fd6959](https://github.com/SelmoCastro/financa_new/commit/3fd69596602be2e60bf794913f580e0af8982e41))
* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90) ([7bac1a5](https://github.com/SelmoCastro/financa_new/commit/7bac1a51404032ec7b47f473a0a2fdefc5c430f2))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.70](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.70) (2026-05-14)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* formatCurrencyInput ao editar — valores mostravam centavos errados (ex: R$90 virava R$0,90) ([7bac1a5](https://github.com/SelmoCastro/financa_new/commit/7bac1a51404032ec7b47f473a0a2fdefc5c430f2))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.69](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.69) (2026-05-13)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* encryptDecimal rejeita NaN + saldos recalculados do DB real ([eb68781](https://github.com/SelmoCastro/financa_new/commit/eb68781e6a9da6bb4e265e163b9fc7b545660d23))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.68](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.68) (2026-05-13)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* createFamily agora persiste hashedRefreshToken para backward compat ([021493b](https://github.com/SelmoCastro/financa_new/commit/021493bb563c9cd91ccc5f89b23fc0424811d027))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.67](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.67) (2026-05-13)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* formatCurrency null guard no frontend CurrencyContext ([427d88e](https://github.com/SelmoCastro/financa_new/commit/427d88e5cbc6401aa1a800cf3a91b319f974f2ed))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.66](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.66) (2026-05-13)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))
* remove falso-positivo replay detection que quebrava login web ([b0f247e](https://github.com/SelmoCastro/financa_new/commit/b0f247e2a5fb32c1bf95a6ebbb4b456093378b47))

### [1.8.65](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.65) (2026-05-13)


### ✨ Features

* Pilar 1 Refresh Token Rotation (RFC 6819) + crash fix na tela Conta ([7f1ac2b](https://github.com/SelmoCastro/financa_new/commit/7f1ac2b1aa98778303a6f513901d3af456e734e6))


### 🐛 Bug Fixes

* corrige erros TS pre-existentes em invoice e recurring transaction ([faaffc9](https://github.com/SelmoCastro/financa_new/commit/faaffc9051fb13933a6be90fefb9d03e899d2d2f))

### [1.8.64](https://github.com/SelmoCastro/financa_new/compare/v1.8.63...v1.8.64) (2026-05-13)

### [1.8.62](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.62) (2026-05-13)


### 🐛 Bug Fixes

* correct import path in DecryptInterceptor ([4d7cb74](https://github.com/SelmoCastro/financa_new/commit/4d7cb740bdd061716b847ab84e2db8c902f4bdcd))
* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** add DecryptInterceptor to auto-decrypt financial fields in API responses ([df2e9a3](https://github.com/SelmoCastro/financa_new/commit/df2e9a3fd86c938c9c20ea5e9dd04713e79eec4a))
* **security:** IDOR prevention - add userId to all Prisma write operations ([80441cb](https://github.com/SelmoCastro/financa_new/commit/80441cb079273829278f2848d426b5d453a6f0b0))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** repair auth.service.ts - replace logAction with .log() API correctly ([d2d5cc4](https://github.com/SelmoCastro/financa_new/commit/d2d5cc4169f1999ddc691dcb66a30f60bc932126))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **security:** complete Decimal→String encryption refactor for all financial fields ([e654246](https://github.com/SelmoCastro/financa_new/commit/e654246b77d7607b9fbea13f331e9799821a0a5e))
* **security:** Defense-in-Depth — all 4 sprints implemented ([090526d](https://github.com/SelmoCastro/financa_new/commit/090526d44a7d802546b39ef096d5730c47100acb))
* **security:** encrypt all financial data at rest with AES-256-GCM ([d57e50d](https://github.com/SelmoCastro/financa_new/commit/d57e50de73b85a0e4a45344bf1fc15cf6444d8dd))
* **security:** Pilar 4 - AuditLog SIEM with hash chain integrity ([ecad0e7](https://github.com/SelmoCastro/financa_new/commit/ecad0e72979ebabe5f880eb3307bfeaa3d80ef8e))
* **security:** Pilar 5 - Infra Hardening ([afc3199](https://github.com/SelmoCastro/financa_new/commit/afc3199b2b4f11548bbc3fd619ab2849caad3507))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))

### [1.8.61](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.61) (2026-05-13)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **security:** complete Decimal→String encryption refactor for all financial fields ([e654246](https://github.com/SelmoCastro/financa_new/commit/e654246b77d7607b9fbea13f331e9799821a0a5e))
* **security:** Defense-in-Depth — all 4 sprints implemented ([090526d](https://github.com/SelmoCastro/financa_new/commit/090526d44a7d802546b39ef096d5730c47100acb))
* **security:** encrypt all financial data at rest with AES-256-GCM ([d57e50d](https://github.com/SelmoCastro/financa_new/commit/d57e50de73b85a0e4a45344bf1fc15cf6444d8dd))
* **security:** Pilar 4 - AuditLog SIEM with hash chain integrity ([ecad0e7](https://github.com/SelmoCastro/financa_new/commit/ecad0e72979ebabe5f880eb3307bfeaa3d80ef8e))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* correct import path in DecryptInterceptor ([4d7cb74](https://github.com/SelmoCastro/financa_new/commit/4d7cb740bdd061716b847ab84e2db8c902f4bdcd))
* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** add DecryptInterceptor to auto-decrypt financial fields in API responses ([df2e9a3](https://github.com/SelmoCastro/financa_new/commit/df2e9a3fd86c938c9c20ea5e9dd04713e79eec4a))
* **security:** IDOR prevention - add userId to all Prisma write operations ([80441cb](https://github.com/SelmoCastro/financa_new/commit/80441cb079273829278f2848d426b5d453a6f0b0))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** repair auth.service.ts - replace logAction with .log() API correctly ([d2d5cc4](https://github.com/SelmoCastro/financa_new/commit/d2d5cc4169f1999ddc691dcb66a30f60bc932126))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.60](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.60) (2026-05-13)


### 🐛 Bug Fixes

* correct import path in DecryptInterceptor ([4d7cb74](https://github.com/SelmoCastro/financa_new/commit/4d7cb740bdd061716b847ab84e2db8c902f4bdcd))
* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** add DecryptInterceptor to auto-decrypt financial fields in API responses ([df2e9a3](https://github.com/SelmoCastro/financa_new/commit/df2e9a3fd86c938c9c20ea5e9dd04713e79eec4a))
* **security:** IDOR prevention - add userId to all Prisma write operations ([80441cb](https://github.com/SelmoCastro/financa_new/commit/80441cb079273829278f2848d426b5d453a6f0b0))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **security:** complete Decimal→String encryption refactor for all financial fields ([e654246](https://github.com/SelmoCastro/financa_new/commit/e654246b77d7607b9fbea13f331e9799821a0a5e))
* **security:** Defense-in-Depth — all 4 sprints implemented ([090526d](https://github.com/SelmoCastro/financa_new/commit/090526d44a7d802546b39ef096d5730c47100acb))
* **security:** encrypt all financial data at rest with AES-256-GCM ([d57e50d](https://github.com/SelmoCastro/financa_new/commit/d57e50de73b85a0e4a45344bf1fc15cf6444d8dd))
* **security:** Pilar 4 - AuditLog SIEM with hash chain integrity ([ecad0e7](https://github.com/SelmoCastro/financa_new/commit/ecad0e72979ebabe5f880eb3307bfeaa3d80ef8e))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))

### [1.8.59](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.59) (2026-05-13)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **security:** complete Decimal→String encryption refactor for all financial fields ([e654246](https://github.com/SelmoCastro/financa_new/commit/e654246b77d7607b9fbea13f331e9799821a0a5e))
* **security:** Defense-in-Depth — all 4 sprints implemented ([090526d](https://github.com/SelmoCastro/financa_new/commit/090526d44a7d802546b39ef096d5730c47100acb))
* **security:** encrypt all financial data at rest with AES-256-GCM ([d57e50d](https://github.com/SelmoCastro/financa_new/commit/d57e50de73b85a0e4a45344bf1fc15cf6444d8dd))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* correct import path in DecryptInterceptor ([4d7cb74](https://github.com/SelmoCastro/financa_new/commit/4d7cb740bdd061716b847ab84e2db8c902f4bdcd))
* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** add DecryptInterceptor to auto-decrypt financial fields in API responses ([df2e9a3](https://github.com/SelmoCastro/financa_new/commit/df2e9a3fd86c938c9c20ea5e9dd04713e79eec4a))
* **security:** IDOR prevention - add userId to all Prisma write operations ([80441cb](https://github.com/SelmoCastro/financa_new/commit/80441cb079273829278f2848d426b5d453a6f0b0))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.58](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.58) (2026-05-13)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **security:** complete Decimal→String encryption refactor for all financial fields ([e654246](https://github.com/SelmoCastro/financa_new/commit/e654246b77d7607b9fbea13f331e9799821a0a5e))
* **security:** Defense-in-Depth — all 4 sprints implemented ([090526d](https://github.com/SelmoCastro/financa_new/commit/090526d44a7d802546b39ef096d5730c47100acb))
* **security:** encrypt all financial data at rest with AES-256-GCM ([d57e50d](https://github.com/SelmoCastro/financa_new/commit/d57e50de73b85a0e4a45344bf1fc15cf6444d8dd))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* correct import path in DecryptInterceptor ([4d7cb74](https://github.com/SelmoCastro/financa_new/commit/4d7cb740bdd061716b847ab84e2db8c902f4bdcd))
* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** add DecryptInterceptor to auto-decrypt financial fields in API responses ([df2e9a3](https://github.com/SelmoCastro/financa_new/commit/df2e9a3fd86c938c9c20ea5e9dd04713e79eec4a))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.57](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.57) (2026-05-12)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.56](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.56) (2026-05-12)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.55](https://github.com/SelmoCastro/financa_new/compare/v1.8.49...v1.8.55) (2026-05-12)


### ✨ Features

* **payments:** 4 planos — mensal R9.90, trimestral R4.90, semestral R9.90, anual R79.90 ([6e434e8](https://github.com/SelmoCastro/financa_new/commit/6e434e801652a246225821ba3ad9ea4455ef836e))
* **payments:** add Mercado Pago integration with subscription upgrade flow ([79868c7](https://github.com/SelmoCastro/financa_new/commit/79868c7c3a649fde44948b8d5df1d8d63318a3e8))
* **payments:** add premium return pages + fix webhook CSRF and throttle ([5c8e33a](https://github.com/SelmoCastro/financa_new/commit/5c8e33a6702b1528ce9adb42c6d3d5a8c703da3c))
* **subscription:** read-only mode for exceeding resources when plan expires ([5b686a6](https://github.com/SelmoCastro/financa_new/commit/5b686a6f08fa96403ff70d927d88298235cbc3bd))


### 🐛 Bug Fixes

* **docs:** correct Free plan limits in terms.html ([31b152c](https://github.com/SelmoCastro/financa_new/commit/31b152c7bb39dd95e0f4100afe9752b2e4208762))
* **payments:** remover badge apoiador, acesso antecipado e cancelamento ambiguo ([36c0601](https://github.com/SelmoCastro/financa_new/commit/36c06014673700ab21637e48f3297b9ab10a36b8))
* **payments:** replace axios with native fetch to avoid missing dependency ([f71c8be](https://github.com/SelmoCastro/financa_new/commit/f71c8beab34a5f4d0e2a27ed14052be351825409))
* **payments:** sandbox mode detection + webhook error handling ([16f6f77](https://github.com/SelmoCastro/financa_new/commit/16f6f776da7b23721d011e78124bb046f2c8ae03))
* **payments:** usar init_point ao inves de sandbox_init_point — sandbox MP fora do ar ([5e87fb5](https://github.com/SelmoCastro/financa_new/commit/5e87fb529d77a0d95220398c4b6e3686edf9313f))
* **prisma:** add reverse relation payments on User model ([ce859d6](https://github.com/SelmoCastro/financa_new/commit/ce859d6c998ee9f440a29967f0f035233799d5bd))
* **security:** payment race condition mutex, remove getPaymentById IDOR risk ([b5a171a](https://github.com/SelmoCastro/financa_new/commit/b5a171a8646511c4ff965e2fd97ea9c63336f1ea))
* **security:** webhook hardening, CSP on nginx, NODE_ENV production ([57c82f0](https://github.com/SelmoCastro/financa_new/commit/57c82f0593d2ae24fb5369cf65b0525fcb102e9a))

### [1.8.49](https://github.com/SelmoCastro/financa_new/compare/v1.8.48...v1.8.49) (2026-05-10)


### 🐛 Bug Fixes

* **frontend:** add missing closing brace in GoalsView.tsx (v1.8.48 build failed) ([44c6067](https://github.com/SelmoCastro/financa_new/commit/44c6067ff7c92d9f9ac6b1ef84fe41864a06d503))

### [1.8.48](https://github.com/SelmoCastro/financa_new/compare/v1.8.47...v1.8.48) (2026-05-10)


### ✨ Features

* **frontend:** show friendly upgrade message on plan limit errors (403 Limite) ([7348570](https://github.com/SelmoCastro/financa_new/commit/734857059096739fe896fcf785eef7fe3cb637e7))

### [1.8.47](https://github.com/SelmoCastro/financa_new/compare/v1.8.46...v1.8.47) (2026-05-10)


### 🐛 Bug Fixes

* **ui:** update plan descriptions to match backend limits (1 AI/day, 1 account, 1 CC, 3 budgets, 3 goals) ([24faf57](https://github.com/SelmoCastro/financa_new/commit/24faf574fbf271da64c88d022665198d13111049))

### [1.8.46](https://github.com/SelmoCastro/financa_new/compare/v1.8.45...v1.8.46) (2026-05-10)


### 🐛 Bug Fixes

* **subscription:** update free plan limits - 1 AI/day, 1 CC, 1 account, 3 budgets, 3 goals ([4cfff0f](https://github.com/SelmoCastro/financa_new/commit/4cfff0fec23ab9b3dd0ee5f7415aa91aadc6ce81))

### [1.8.45](https://github.com/SelmoCastro/financa_new/compare/v1.8.44...v1.8.45) (2026-05-10)

### [1.8.44](https://github.com/SelmoCastro/financa_new/compare/v1.8.43...v1.8.44) (2026-05-10)


### 🐛 Bug Fixes

* **frontend:** fix timeline header clipping on mobile ([52eeb50](https://github.com/SelmoCastro/financa_new/commit/52eeb5050ad6bc92e3e7c53f1df7845efba867df))

### [1.8.43](https://github.com/SelmoCastro/financa_new/compare/v1.8.42...v1.8.43) (2026-05-10)


### 🐛 Bug Fixes

* **web:** menu Mais alinhado à esquerda ([a5d25e8](https://github.com/SelmoCastro/financa_new/commit/a5d25e8128ba70c1007901bcdf7a5e15dcffb99a))
* **web:** menu Mais inset-x-0 mx-2 garante largura total ([783a4d9](https://github.com/SelmoCastro/financa_new/commit/783a4d90738981e12506321362cd34e395d67139))
* **web:** menu Mais popup fixed position, compact mobile ([c863e39](https://github.com/SelmoCastro/financa_new/commit/c863e3964ef4b6f402c27bc16f6c6ffe885324ba))
* **web:** menu Mais posicao relativa a nav inteira, fullscreen simetrico ([25ed236](https://github.com/SelmoCastro/financa_new/commit/25ed2363f5f1308e4c32e062509615b7fc4a5cab))

## [1.8.39](https://github.com/SelmoCastro/financa_new/compare/v1.8.38...v1.8.39) (2026-05-09)

All notable changes to this project will be documented in this file.

## [1.8.38](https://github.com/SelmoCastro/financa_new/compare/v1.8.37...v1.8.38) (2026-05-09)

All notable changes to this project will be documented in this file.

## [1.8.37](https://github.com/SelmoCastro/financa_new/compare/v1.8.36...v1.8.37) (2026-05-09)

All notable changes to this project will be documented in this file.

## [1.8.36](https://github.com/SelmoCastro/financa_new/compare/v1.8.35...v1.8.36) (2026-05-09)

All notable changes to this project will be documented in this file.

## [1.8.35](https://github.com/SelmoCastro/financa_new/compare/v1.8.34...v1.8.35) (2026-05-09)

All notable changes to this project will be documented in this file.

## [1.8.34](https://github.com/SelmoCastro/financa_new/compare/v1.8.33...v1.8.34) (2026-05-09)

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.8.33](https://github.com/SelmoCastro/financa_new/compare/v1.8.32...v1.8.33) (2026-05-09)


### ✨ Features

* **installments:** add custom value per installment support ([c855aee](https://github.com/SelmoCastro/financa_new/commit/c855aee7b031daacb03f754ea578300603298729))

### [1.8.32](https://github.com/SelmoCastro/financa_new/compare/v1.8.31...v1.8.32) (2026-05-09)


### 🐛 Bug Fixes

* **dashboard:** filter invoices from deleted credit cards ([79a33e2](https://github.com/SelmoCastro/financa_new/commit/79a33e24ca7470bd7a247772c4d81c711859894f))

### [1.8.31](https://github.com/SelmoCastro/financa_new/compare/v1.8.30...v1.8.31) (2026-05-09)


### 🐛 Bug Fixes

* **dashboard:** filter deleted CC invoices, show open invoices with unlinked txs ([c02d362](https://github.com/SelmoCastro/financa_new/commit/c02d3622c8af21c927216537e4b6ce0987d1d549))

### [1.8.30](https://github.com/SelmoCastro/financa_new/compare/v1.8.29...v1.8.30) (2026-05-09)

### [1.8.29](https://github.com/SelmoCastro/financa_new/compare/v1.8.28...v1.8.29) (2026-05-09)


### 🐛 Bug Fixes

* **transactions:** cascade delete sibling installments + mobile removes all deletedIds ([ef41fed](https://github.com/SelmoCastro/financa_new/commit/ef41fedab984ac458a68c58f3a59af1a9d4155e5))

### [1.8.28](https://github.com/SelmoCastro/financa_new/compare/v1.8.27...v1.8.28) (2026-05-09)


### 🐛 Bug Fixes

* **reports:** exclude future months from monthlyHistory chart ([1f353cd](https://github.com/SelmoCastro/financa_new/commit/1f353cdfc09226367166528a5836adda265313c8))

### [1.8.27](https://github.com/SelmoCastro/financa_new/compare/v1.8.26...v1.8.27) (2026-05-09)


### 🐛 Bug Fixes

* **reports:** remove description-based transfer filter — use transferGroupId only ([6d6fbcd](https://github.com/SelmoCastro/financa_new/commit/6d6fbcdc09289ea6f3489435207b0003a40742ca))

### [1.8.26](https://github.com/SelmoCastro/financa_new/compare/v1.8.25...v1.8.26) (2026-05-09)


### 🐛 Bug Fixes

* **charts:** ensure income/expense bars have minimum visible height when value > 0 ([f9894ec](https://github.com/SelmoCastro/financa_new/commit/f9894eced64bac35644133bfb45aa09438e47cf8))

### [1.8.25](https://github.com/SelmoCastro/financa_new/compare/v1.8.24...v1.8.25) (2026-05-09)

### [1.8.24](https://github.com/SelmoCastro/financa_new/compare/v1.8.23...v1.8.24) (2026-05-09)

### [1.8.23](https://github.com/SelmoCastro/financa_new/compare/v1.8.21...v1.8.23) (2026-05-09)


### 🐛 Bug Fixes

* **reports:** income missing from dashboard — use endsWith instead of contains for transfer filter ([1d76a95](https://github.com/SelmoCastro/financa_new/commit/1d76a95c4edd386fe991b0e7046ce5153ade9bfe))

### [1.8.22](https://github.com/SelmoCastro/financa_new/compare/v1.8.21...v1.8.22) (2026-05-09)

### [1.8.21](https://github.com/SelmoCastro/financa_new/compare/v1.8.20...v1.8.21) (2026-05-09)


### 🐛 Bug Fixes

* **ci:** correct health check URL from /api/v1 to /v1 for internal VPS check ([d02f2fb](https://github.com/SelmoCastro/financa_new/commit/d02f2fbb567d70f348107db0f2395e499fcc1296))

### [1.8.20](https://github.com/SelmoCastro/financa_new/compare/v1.8.19...v1.8.20) (2026-05-09)

### [1.8.19](https://github.com/SelmoCastro/financa_new/compare/v1.8.11...v1.8.19) (2026-05-09)


### ♻️ Code Refactoring

* **accounts:** remove credit cards section from Contas tab ([d484ef4](https://github.com/SelmoCastro/financa_new/commit/d484ef479acabcff161e17d39479040223c8fe8a))
* **accounts:** remove duplicate installments section from Cartoes tab (moved to Faturas) ([000a1b1](https://github.com/SelmoCastro/financa_new/commit/000a1b196deac0280db9373c0ea89e5836760f3c))
* **dashboard:** remove duplicate summary cards from ProjectionWidget (Receitas, Despesas, Cartao, Projecao) ([23476bb](https://github.com/SelmoCastro/financa_new/commit/23476bb2ce9e9a6e48bf9a995cdbb3fd8d35effb))
* Fase 2 - transferGroupId, race condition fix, transfer filter hardening ([3e82582](https://github.com/SelmoCastro/financa_new/commit/3e825823cdbfd0ca0814381392455bf9a9a2a21c))
* **frontend:** extract AppProviders and ViewRouter from App.tsx ([70d3427](https://github.com/SelmoCastro/financa_new/commit/70d34275aee17019cf523eadd7ee9d9c1ba2cd65))
* **frontend:** modularize AccountsView and AdminPanelView into view folders ([4724264](https://github.com/SelmoCastro/financa_new/commit/472426429cb6bdffe65c8319c13a76e558284f71))
* **frontend:** modularize ImportOverlay into import/ folder ([6263557](https://github.com/SelmoCastro/financa_new/commit/6263557f43baf8e2d922bc655030913d52dc04fc))
* **invoices:** complete rewrite - tabs for Faturas | Cartoes | Parcelas ([3662360](https://github.com/SelmoCastro/financa_new/commit/366236016acf717a337265f07969ce4773d9765f))


### ✨ Features

* **dashboard:** credit card debt StatCard + pending invoices section in DashboardView ([f5ced0b](https://github.com/SelmoCastro/financa_new/commit/f5ced0b452608011b9a049b8d767e7c3f76cd688))
* **dashboard:** creditCardDebt + pendingInvoices exposed in dashboard summary ([2d66c01](https://github.com/SelmoCastro/financa_new/commit/2d66c01d0e0d41602be61daed34449487ae161c0))
* **export:** complete financial report endpoint for premium users ([41b5a1d](https://github.com/SelmoCastro/financa_new/commit/41b5a1d935c653f3dcf525a0e4cb482a063d267e))
* **frontend:** premium landing page redesign ([8043ab9](https://github.com/SelmoCastro/financa_new/commit/8043ab9fa7de50b21247b15cb4e3f883303c08cb))
* **invoices:** CreditCardInvoice model - fatura tracking for credit cards ([19059d0](https://github.com/SelmoCastro/financa_new/commit/19059d0f920c59563a504e4b6db5f26bcd20f6dc))
* **invoices:** InvoicesView - list, expand, pay, and close credit card invoices ([abb5e63](https://github.com/SelmoCastro/financa_new/commit/abb5e63429774026afecc7f049506be828265b82))
* **projection:** 30-day balance projection with daily events ([7d60fa8](https://github.com/SelmoCastro/financa_new/commit/7d60fa89a017c5f717d222d6ce51c80e2650717d))
* **scheduler:** auto-close credit card invoices on closingDay ([892eb2d](https://github.com/SelmoCastro/financa_new/commit/892eb2d67932e054b6ffce8cb01374be3cb28147))


### 🐛 Bug Fixes

* **auth:** mobile session persistence — refreshToken rotation on refresh + 30d expiry + instant logout ([65763be](https://github.com/SelmoCastro/financa_new/commit/65763be0f15d1271fa5610872a5ed173f4aa07a1))
* **backend:** prisma type errors on creditCard accountId null + optional ([38f8ef6](https://github.com/SelmoCastro/financa_new/commit/38f8ef62bbd1756f6ba1adf6fc5223b0008e019e))
* **credit-cards:** installment creaParcela now generates monthly transactions so invoices sum correctly ([41e4ddb](https://github.com/SelmoCastro/financa_new/commit/41e4ddbb76627c0c1bfa455524b30ac098d1c67f))
* **feedback:** platform field must be lowercase (web/mobile) not uppercase ([b060298](https://github.com/SelmoCastro/financa_new/commit/b060298080279af62f262619921b3302e7c53c53))
* **frontend:** add minWidth/minHeight to ResponsiveContainer charts to prevent -1 dimension warnings ([1aff933](https://github.com/SelmoCastro/financa_new/commit/1aff9333b7738973334ab5adbf2b0e7d9a135f40))
* **frontend:** fechar modal após submit em TransactionForm, AccountForm e CreditCardForm ([01b61c4](https://github.com/SelmoCastro/financa_new/commit/01b61c494d77e54a5c89a13edb297936fe8ef895))
* **frontend:** honest landing copy — IA is on-demand, not automatic ([3dd4291](https://github.com/SelmoCastro/financa_new/commit/3dd4291e86c1a7f24f2299fd6b7c3d1112b51fc7))
* **frontend:** remove fake metrics and testimonial, add real differentiators ([9458d3c](https://github.com/SelmoCastro/financa_new/commit/9458d3c78b9940ca2ae0519618935b16739dfc40))
* **frontend:** use downloads page URL instead of direct APK link ([c8ee8c6](https://github.com/SelmoCastro/financa_new/commit/c8ee8c6d9b87a19bf686ee5b5aa10141df3bdabe))
* **goals:** calculate progress on frontend, add deposit endpoint, fix duplicated fixed items, move InviteNotification to header top row ([df829d2](https://github.com/SelmoCastro/financa_new/commit/df829d2b39dbca4877fe90f6701213c01a720cbe))
* **invoices:** add delete/edit menu to credit cards in Faturas tab ([2f1b9ee](https://github.com/SelmoCastro/financa_new/commit/2f1b9ee68ae8021f7121b76779abf68255958408))
* **invoices:** getCurrentInvoice now returns ALL unfactored card transactions + creditCardName ([f2a5ea6](https://github.com/SelmoCastro/financa_new/commit/f2a5ea62f74f9c2f04f2f1446b14f1184648c86f))
* **invoices:** show current open invoice (fatura em aberto) with transactions ([8c898b2](https://github.com/SelmoCastro/financa_new/commit/8c898b2c7ecdabe78e0c2bcd298308133dea072c))
* **mobile:** remove Alertas tab from bottom menu, add notification bell in header ([623a70f](https://github.com/SelmoCastro/financa_new/commit/623a70fd3fbcd0eca7edde96246f528f26045c14))
* **mobile:** remover userId do body do refresh token ([7478ab7](https://github.com/SelmoCastro/financa_new/commit/7478ab73c47529102e560c785c942a76775983dd))
* **notifications:** recurring INCOME no longer becomes EXPENSE + entryAmount for installments ([8049f94](https://github.com/SelmoCastro/financa_new/commit/8049f94107526c529febb8d94879537ee4bf9202))
* **reports:** fix 50/30/20 category classification - add missing aliases, exclude transfers/income categories, handle uncategorized items ([706172f](https://github.com/SelmoCastro/financa_new/commit/706172f6ee0410b1da246f7a1b9b0e252b775115))
* **reports:** rule 50/30/20 uses expense base + category alias mapping ([d64fced](https://github.com/SelmoCastro/financa_new/commit/d64fced8d3c49c63c015ce7b02dcc71c4ea187e8))
* **web:** format currency input in installment form, validate card limit, parse values correctly ([4080d67](https://github.com/SelmoCastro/financa_new/commit/4080d670fd6262727a8a016164b528e71e650175))

## [1.8.18](https://github.com/SelmoCastro/financa_new/compare/v1.8.17...v1.8.18) (2026-05-09)

### ✨ Features

* (frontend) premium landing page redesign
* (export) complete financial report endpoint for premium users
* (projection) 30-day balance projection with daily events
* (invoices) InvoicesView - list, expand, pay, and close credit card invoices

### 🐛 Bug Fixes

* (goals) calculate progress on frontend, add deposit endpoint, fix duplicated fixed items, move InviteNotification to header top row
* (backend) prisma type errors on creditCard accountId null + optional
* (invoices) add delete/edit menu to credit cards in Faturas tab
* (frontend) add minWidth/minHeight to ResponsiveContainer charts to prevent -1 dimension warnings
* (frontend) fechar modal após submit em TransactionForm, AccountForm e CreditCardForm
* (frontend) honest landing copy — IA is on-demand, not automatic
* (frontend) remove fake metrics and testimonial, add real differentiators
* (frontend) use downloads page URL instead of direct APK link
* (invoices) getCurrentInvoice now returns ALL unfactored card transactions + creditCardName
* (invoices) show current open invoice (fatura em aberto) with transactions

### ♻️ Refactoring

* (invoices) complete rewrite - tabs for Faturas | Cartoes | Parcelas
* (accounts) remove credit cards section from Contas tab
* (accounts) remove duplicate installments section from Cartoes tab (moved to Faturas)
* (dashboard) remove duplicate summary cards from ProjectionWidget (Receitas, Despesas, Cartao, Projecao)

### 🧹 Chores

* release v1.8.17 - fix goals %, duplicate fixed items, settings modal padding, goals deposit endpoint
* bump v1.8.15 + versionCode 55

All notable changes to this project will be documented in this file.

## [1.8.14](https://github.com/SelmoCastro/financa_new/compare/v1.8.13...v1.8.14) (2026-05-05)

### 🐛 Bug Fixes

* (mobile) remover userId do body do refresh token
* (auth) mobile session persistence — refreshToken rotation on refresh + 30d expiry + instant logout
* (feedback) platform field must be lowercase (web/mobile) not uppercase
* remove importmap from index.html causing blank page in production
* correct installment schedule API route from /schema to /schedule
* cast types for fitIds arrays and Prisma upserts
* resolve remaining TypeScript strict mode errors
* resolve TypeScript strict mode errors across services
* (security) IDOR fixes, Prisma Decimal serialization, remove all 'any' types, add composite indexes
* (deps) restore resend (used by email.service.ts)
* (deps) correct @nestjs/schedule version to ^6.1.3 (compatible with @nestjs/common@11)
* (accounts) allow editing balance when updating account

### ♻️ Refactoring

* (frontend) extract AppProviders and ViewRouter from App.tsx
* (frontend) modularize ImportOverlay into import/ folder
* (frontend) modularize AccountsView and AdminPanelView into view folders

### 🧹 Chores

* release v1.8.11
* remove non-essential files from repo
* release v1.8.10
* add Prisma migration for composite indexes
* engineering audit phase 1 — stabilize

All notable changes to this project will be documented in this file.

## [1.8.13](https://github.com/SelmoCastro/financa_new/compare/v1.8.12...v1.8.13) (2026-05-05)

### 🐛 Bug Fixes

* (auth) mobile session persistence — refreshToken rotation on refresh + 30d expiry + instant logout
* (feedback) platform field must be lowercase (web/mobile) not uppercase
* remove importmap from index.html causing blank page in production
* correct installment schedule API route from /schema to /schedule
* cast types for fitIds arrays and Prisma upserts
* resolve remaining TypeScript strict mode errors
* resolve TypeScript strict mode errors across services
* (security) IDOR fixes, Prisma Decimal serialization, remove all 'any' types, add composite indexes
* (deps) restore resend (used by email.service.ts)
* (deps) correct @nestjs/schedule version to ^6.1.3 (compatible with @nestjs/common@11)
* (accounts) allow editing balance when updating account
* (accounts) edit account form now works correctly

### ♻️ Refactoring

* (frontend) extract AppProviders and ViewRouter from App.tsx
* (frontend) modularize ImportOverlay into import/ folder
* (frontend) modularize AccountsView and AdminPanelView into view folders

### 🧹 Chores

* release v1.8.11
* remove non-essential files from repo
* release v1.8.10
* add Prisma migration for composite indexes
* engineering audit phase 1 — stabilize

All notable changes to this project will be documented in this file.

## [1.8.11](https://github.com/SelmoCastro/financa_new/compare/v1.8.10...v1.8.11) (2026-05-05)

### 🧹 Chores

* remove non-essential files from repo

All notable changes to this project will be documented in this file.

## [1.8.10](https://github.com/SelmoCastro/financa_new/compare/v1.8.9...v1.8.10) (2026-05-04)

### ✨ Features

* (accounts) add monthly installment summary panel - aggregate view per month
* (cards) installment entry amount + expanded schedule view

### 🐛 Bug Fixes

* remove importmap from index.html causing blank page in production
* correct installment schedule API route from /schema to /schedule
* cast types for fitIds arrays and Prisma upserts
* resolve remaining TypeScript strict mode errors
* resolve TypeScript strict mode errors across services
* (security) IDOR fixes, Prisma Decimal serialization, remove all 'any' types, add composite indexes
* (deps) restore resend (used by email.service.ts)
* (deps) correct @nestjs/schedule version to ^6.1.3 (compatible with @nestjs/common@11)
* (accounts) allow editing balance when updating account
* (accounts) edit account form now works correctly
* (accounts) fix 400 error when editing existing account
* (ui) add labels to installment form fields for better UX
* (cards) use Prisma Decimal types in getInstallmentSchedule
* (accounts) import missing X icon causing blank page on installments view
* (web) credit card form - currency formatting + account type label + delete dropdown overflow

### 🧹 Chores

* add Prisma migration for composite indexes
* engineering audit phase 1 — stabilize

### Other Changes

* 6f952d1 debug: add PATCH account logging

All notable changes to this project will be documented in this file.

## [1.7.39](https://github.com/SelmoCastro/financa_new/compare/v1.7.38...v1.7.39) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.38](https://github.com/SelmoCastro/financa_new/compare/v1.7.37...v1.7.38) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.37](https://github.com/SelmoCastro/financa_new/compare/v1.7.36...v1.7.37) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.36](https://github.com/SelmoCastro/financa_new/compare/v1.7.35...v1.7.36) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.35](https://github.com/SelmoCastro/financa_new/compare/v1.7.34...v1.7.35) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.34](https://github.com/SelmoCastro/financa_new/compare/v1.7.33...v1.7.34) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.33](https://github.com/SelmoCastro/financa_new/compare/v1.7.32...v1.7.33) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.32](https://github.com/SelmoCastro/financa_new/compare/v1.7.31...v1.7.32) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.31](https://github.com/SelmoCastro/financa_new/compare/v1.7.30...v1.7.31) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.30](https://github.com/SelmoCastro/financa_new/compare/v1.7.29...v1.7.30) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.29](https://github.com/SelmoCastro/financa_new/compare/v1.7.28...v1.7.29) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.28](https://github.com/SelmoCastro/financa_new/compare/v1.7.27...v1.7.28) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.27](https://github.com/SelmoCastro/financa_new/compare/v1.7.26...v1.7.27) (2026-05-02)

### 🐛 Bug Fixes

* corrige mobileVersion 1.7.26 e releaseNotes no version-meta.json

All notable changes to this project will be documented in this file.

## [1.7.26](https://github.com/SelmoCastro/financa_new/compare/v1.7.25...v1.7.26) (2026-05-02)

### ✨ Features

* (auth) require terms acceptance on signup (web + mobile + backend)
* (legal) add privacy policy + terms of service, fix adaptive icon, configure AAB
* (subscription) free plan upgraded to 5/5/5/10 + goals limit

### 🐛 Bug Fixes

* (backend) use cascade delete for user records and simplify remove logic
* (mobile) resolve token expiry race condition and improve session resilience
* (mobile) remove auto-install, open APK in browser instead (simpler, no REQUEST_INSTALL_PACKAGES)
* (backend) account balance doubled when creating account with initial balance
* (backend) version-meta.json path resolution — controller now finds the file
* (mobile) critical APK install failure — remove corrupted FileProvider + multi-fallback install
* (mobile) break infinite update dialog loop + allow dismiss in all phases
* (mobile) corrigir erros de TypeScript e bugs de runtime
* (mobile) prevent infinite update loop on install failure
* (mobile) corrije AppState handler para usar novo RefreshResult
* (mobile) corrije fluxo de refresh token ao reabrir app apos 15min

### 📝 Documentation

* update CHANGELOG for v1.7.20

### 🧹 Chores

* bump version to 1.7.20
* remove temp fix_balances script
* bump version to 1.7.15 (versionCode 17)
* fix package.json bump to 1.7.14
* bump version 1.7.13 → 1.7.14

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.7.20](https://github.com/SelmoCastro/financa_new/compare/v1.7.19...v1.7.20) (2026-05-01)

### Features
* **subscription**: Free plan upgraded — 5 accounts, 5 budgets, 5 credit cards, 5 goals, 10 AI requests/day
* **subscription**: Premium plan remains unlimited
* **goals**: Added plan limit enforcement on goal creation (was missing)

### Bug Fixes
* **accounts**: Fixed balance doubled when creating account with initial balance

## [1.4.0](https://github.com/SelmoCastro/financa_new/compare/v1.3.0...v1.4.0) (2026-04-17)


### ⚠ BREAKING CHANGES

* **release:** versão 1.3.0 requer rebuild de todos os packages

### 🧹 Chores

* **release:** 1.3.0 - refatoração geral, documentação e scripts de debug ([e857d68](https://github.com/SelmoCastro/financa_new/commit/e857d684bb65f7f28cfaafa261ba23e69ece7ce4))


### 📝 Documentation

* add implementation roadmap with 7 sections ([b0b137c](https://github.com/SelmoCastro/financa_new/commit/b0b137cc73dd1324ab825b0961c06f6691b0bcb8))
* add technical debts and security implementation plan ([ce19012](https://github.com/SelmoCastro/financa_new/commit/ce190128cab6cad15b4cd017a648f4690130ccdf))


### ♻️ Code Refactoring

* **budgets:** remove legacy category string, use categoryId only ([2bdbc19](https://github.com/SelmoCastro/financa_new/commit/2bdbc194b2f9b85823d6185df987b06db267d09e))


### ✅ Tests

* **backend:** add 40 unit tests for AccountsService and BudgetsService + fix app.controller spec ([52912a1](https://github.com/SelmoCastro/financa_new/commit/52912a1de0e15e23da91847234179c3d4deb5e61))


### 🐛 Bug Fixes

* **auth:** auto-verify emails and disable VerifiedEmailGuard until Resend domain is configured ([3c89830](https://github.com/SelmoCastro/financa_new/commit/3c8983060899bcaa1b6cbe362b54965d35d006a6))
* **auth:** corrigir loop infinito de login por inconsistência de chave do token ([bd51b0f](https://github.com/SelmoCastro/financa_new/commit/bd51b0fe9d4174034c315f8be3df8ebc4f28ae70))
* **cors:** add X-CSRF-Token to allowed headers for cross-origin requests ([7da6e25](https://github.com/SelmoCastro/financa_new/commit/7da6e25efb9d6e427559902dd894280de6611a59))
* **cors:** use Vercel proxy rewrite to eliminate cross-origin requests and CSRF cookie issues ([7625a7f](https://github.com/SelmoCastro/financa_new/commit/7625a7f6fcc26196c79495f71d57f98740ec84ac))
* **db:** consolidate migrations - add Subscription + AiRequestLog tables and fix Budget categoryId ([7833627](https://github.com/SelmoCastro/financa_new/commit/7833627fa1b88605ed64cd88250bb54b4b1e498a))
* **security:** add CSRF protection with double-submit cookie pattern ([73ce96f](https://github.com/SelmoCastro/financa_new/commit/73ce96f5fd1b9cae5e2d895ca238de741de186b9))
* **security:** fix CSRF token mismatch on login - generate token once per session and match excluded paths correctly ([536c0b5](https://github.com/SelmoCastro/financa_new/commit/536c0b5c3a420293c3e36ad2d574473d5c9549bd))
* **subscription:** fix imports and reports category field after subscription module ([1f9498e](https://github.com/SelmoCastro/financa_new/commit/1f9498e1031835dc9605272ffde0c8372affc1b8))


### ✨ Features

* **auth:** add password strength validation on register ([fe601c3](https://github.com/SelmoCastro/financa_new/commit/fe601c395d930b713975f9728b7255276e299e52))
* **auth:** add verified email guard + banner + resend endpoint ([f8d2518](https://github.com/SelmoCastro/financa_new/commit/f8d251816f074f7a4a4eb9cae4e5e3d0f77d1787))
* **auth:** implementar recuperação de senha funcional com Resend ([36ce6cd](https://github.com/SelmoCastro/financa_new/commit/36ce6cdf8f7dc4e5153015edbed55927d9ed0e85))
* **debug:** add email health check endpoint at /health/email ([605007a](https://github.com/SelmoCastro/financa_new/commit/605007a688960815ec5d5e8ea46a7e4e3c70c9e1))
* **domain:** migrate to finanzaai.tech custom domain ([3424ae8](https://github.com/SelmoCastro/financa_new/commit/3424ae84f9f21ec816ef424e0c38d765ea4ebc6e))
* **mobile:** add Reports screen with charts + fix budgets JSX + fix useFixedTransactions type ([45a4e7c](https://github.com/SelmoCastro/financa_new/commit/45a4e7c2d661f3dfc6c6323878d54e13206fed93))
* **mobile:** mount AiChatWidget on Home screen + fix chat response field ([a22f17d](https://github.com/SelmoCastro/financa_new/commit/a22f17d57bb0b390a5201a227a56d372d789dece))
* **security:** add env variable validation on backend startup + fix app.controller spec ([d0a512d](https://github.com/SelmoCastro/financa_new/commit/d0a512ddc5f15f44f82a10c25d2337e0d707c85b))
* **subscription:** add Subscription module with plan guard and AI rate limiting ([36c87e4](https://github.com/SelmoCastro/financa_new/commit/36c87e4269ee0d3b0fb171f438c1215f8d344bb0))

## [1.3.0](https://github.com/SelmoCastro/financa_new/compare/v1.2.2...v1.3.0) (2026-04-08)


### ✨ Features

* **mobile:** unify dashboard and add CRUD for budgets and goals ([8e4f81c](https://github.com/SelmoCastro/financa_new/commit/8e4f81cc0fda7f79ed64206c3d5aad3cf60e1622))

### [1.2.2](https://github.com/SelmoCastro/financa_new/compare/v1.2.1...v1.2.2) (2026-04-07)


### 🐛 Bug Fixes

* **reports:** corrigir gráfico Performance Mensal mostrando meses futuros e duplicados ([0fbb704](https://github.com/SelmoCastro/financa_new/commit/0fbb704f593490c16c528146799a5a6517b141e1))

### [1.2.1](https://github.com/SelmoCastro/financa_new/compare/v1.2.0...v1.2.1) (2026-04-07)


### 📝 Documentation

* make conventional commits and versioning mandatory for all agents ([4d6b8ae](https://github.com/SelmoCastro/financa_new/commit/4d6b8aeaa22db815cb7cd7b771f2419e80ed9280))


### ✨ Features

* **mobile:** port Part 2 AI Vision improvements — PDF support, error feedback, editable amounts, receipt preview ([cdec795](https://github.com/SelmoCastro/financa_new/commit/cdec7959403dc0027bf6d9b87e644d40704acc16))


### 🐛 Bug Fixes

* **web:** corrigir edição de contas, dark mode no extrato/fixos e dropdowns ([1cbb768](https://github.com/SelmoCastro/financa_new/commit/1cbb76849d91b53235fba4ed002e68766e226094))

## [1.2.0](https://github.com/SelmoCastro/financa_new/compare/v1.1.0...v1.2.0) (2026-04-05)

### ⚠ BREAKING CHANGES

* **reports:** dashboard balance now sums account balances instead of all transactions
* **backend:** migration baseline required (P3005 fix)

### Features

* **ai:** enhance receipt AI engine — PDF support, detailed error feedback, editable amounts, image preview, multi-transaction extraction ([7d71294](https://github.com/SelmoCastro/financa_new/commit/7d71294))
* **ai:** add Pet and Fuel categories to 50/30/20 rule ([6640d1b](https://github.com/SelmoCastro/financa_new/commit/6640d1b))
* **backend:** add Pets and Vehicle categories with AI classification rules ([da6f4bf](https://github.com/SelmoCastro/financa_new/commit/da6f4bf))
* **frontend:** redesign Dashboard, Budgets, Goals, Accounts, History views ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **frontend:** add ActionMenu component, update tailwind config and types ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **mobile:** update ImportModal, TransactionModal, CategoryChart, contexts ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **mobile:** expo SDK 54 upgrade with React Native 0.81 ([f7717f2](https://github.com/SelmoCastro/financa_new/commit/f7717f2))
* **docs:** complete README with full project documentation, architecture, API docs, feature matrix ([c2c0ded](https://github.com/SelmoCastro/financa_new/commit/c2c0ded))

### Bug Fixes

* **reports:** exclude only real transfers from dashboard calculations ([34c6efa](https://github.com/SelmoCastro/financa_new/commit/34c6efa))
* **deploy:** resolve P3005 migration error on Render with baseline ([a2af47a](https://github.com/SelmoCastro/financa_new/commit/a2af47a))
* **git:** remove non-code files from tracking and update .gitignore ([9b00da7](https://github.com/SelmoCastro/financa_new/commit/9b00da7))

### Chores

* remove .agent/skills directory (2739 files) ([ec5d5b9](https://github.com/SelmoCastro/financa_new/commit/ec5d5b9))
* add project backlog, BMad config and migration scripts ([e85896c](https://github.com/SelmoCastro/financa_new/commit/e85896c))

---

## [1.1.0](https://github.com/SelmoCastro/financa_new/compare/v1.0.0...v1.1.0) (2026-03-13)

### Features

* **mobile:** multi-currency support (BRL/USD/EUR) with CurrencyContext, SettingsModal ([6c0a8da](https://github.com/SelmoCastro/financa_new/commit/6c0a8da))
* **frontend:** multi-currency support and compact UI design ([17693e9](https://github.com/SelmoCastro/financa_new/commit/17693e9))
* **frontend:** finance rigor 50/30/20 and Available Real metric ([b0fe97e](https://github.com/SelmoCastro/financa_new/commit/b0fe97e))
* **social:** transaction invites and shared billing across web and mobile ([6959a6f](https://github.com/SelmoCastro/financa_new/commit/6959a6f), [883b6d9](https://github.com/SelmoCastro/financa_new/commit/883b6d9), [b4741bc](https://github.com/SelmoCastro/financa_new/commit/b4741bc))
* **frontend:** simplify dashboard layout, clean header, move APK link to sidebar ([afde98a](https://github.com/SelmoCastro/financa_new/commit/afde98a))

### Bug Fixes

* **timeline:** display full history instead of filtered month ([cda7419](https://github.com/SelmoCastro/financa_new/commit/cda7419))
* **auth:** return refreshToken in login body for mobile compatibility ([157570c](https://github.com/SelmoCastro/financa_new/commit/157570c))
* **mobile:** update budgets/goals/fixed to useCurrency, fix balance input ([159827d](https://github.com/SelmoCastro/financa_new/commit/159827d))
* **social:** fix inverted invite acceptance and update notification modal UI ([8ae54aa](https://github.com/SelmoCastro/financa_new/commit/8ae54aa))
* **social:** render notification modal in React Portal for centering ([ac01d45](https://github.com/SelmoCastro/financa_new/commit/ac01d45))
* **deploy:** remove migrate deploy from render start script ([740a0f0](https://github.com/SelmoCastro/financa_new/commit/740a0f0))
* **prisma:** map directUrl to DATABASE_URL for Render compatibility ([4fdb9f0](https://github.com/SelmoCastro/financa_new/commit/4fdb9f0))
* **auth:** fix login email regexp pattern ([604edcb](https://github.com/SelmoCastro/financa_new/commit/604edcb))
* **filters:** unify date filters, fix category cleaning bug, add account diagnostics ([32926ec](https://github.com/SelmoCastro/financa_new/commit/32926ec))
* **categories:** prevent aggressive category cleanup, improve data fetching resilience ([ea701d3](https://github.com/SelmoCastro/financa_new/commit/ea701d3))
* **backend:** resolve build errors in accounts service ([ef27c34](https://github.com/SelmoCastro/financa_new/commit/ef27c34))

---

## 1.0.0 (2026-03-07)

### Features

* **auth:** JWT authentication with access + refresh tokens
* **auth:** email verification and password reset flow
* **transactions:** full CRUD with installment support
* **transactions:** OFX import with 4-layer deduplication (FITID, history, content match, fuzzy hash)
* **transactions:** AI auto-classification of bank statement transactions
* **accounts:** bank account management with real-time balance
* **credit-cards:** credit card management with limit, closing day, due day
* **categories:** customizable income/expense categories with icons and colors
* **budgets:** budget limits per category with percentage tracking
* **goals:** financial goals with target amount, current amount, deadline
* **reports:** dashboard summary with 50/30/20 rule, pie charts, bar charts, month-over-month trends
* **reports:** financial profile for AI brain (goals, budgets, top expenses, recent transactions)
* **ai:** financial chat assistant with Gemini via OpenRouter
* **ai:** monthly insights generation (3 golden tips)
* **ai:** subscription/recurring expense detection
* **ai:** monthly forecasting (red/green prediction)
* **notifications:** in-app notification system
* **frontend:** responsive dashboard with Recharts + Framer Motion
* **frontend:** dark mode support
* **frontend:** privacy blur mode
* **frontend:** fixed/recurring transaction management
* **frontend:** ImportOverlay for OFX/CSV/AI Vision
* **frontend:** ChatWidget for AI assistant
* **frontend:** NotificationCenter with real-time updates
* **mobile:** Expo app with tab navigation
* **mobile:** transaction management and import
* **mobile:** AI chat and insights
* **mobile:** dark mode and privacy blur
* **backend:** Swagger API documentation
* **backend:** Helmet security headers
* **backend:** Global rate limiting (100 req/60s)
* **backend:** Feedback collection system
