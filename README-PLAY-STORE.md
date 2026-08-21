# Ganhos & Gastos — preparação para Google Play

Este diretório contém o projeto Android nativo que encapsula o aplicativo web atual com `WebViewAssetLoader`, mantendo login, sincronização Supabase, relatórios, histórico, categorias, exportações e exclusão de conta.

## Configuração Android
- Application ID: `com.ganhosegastos.app`
- Target/Compile SDK: 36 (Android 16)
- Min SDK: 24
- AGP: 8.10.0
- Gradle CI: 8.11.1
- Java: 17

## Build
O workflow `.github/workflows/android-build.yml` compila:
- APK de debug para testes
- AAB de release (assinado quando os secrets de keystore estiverem configurados)

### Secrets para assinatura de produção
Configure no GitHub somente quando tiver a chave de upload definitiva:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Nunca coloque a keystore ou senhas no repositório.

## Itens que dependem da conta Google Play
1. Criar/pagar a conta de desenvolvedor.
2. Criar o app no Play Console com o Application ID acima.
3. Configurar Play App Signing/chave de upload.
4. Criar produtos de assinatura/AdMob se a monetização for ativada.
5. Preencher Segurança dos dados, classificação, público-alvo e declaração de recursos financeiros.
6. Fazer o teste fechado exigido pela conta, quando aplicável.

## Privacidade e exclusão
- `privacy.html`: política pública.
- `delete-account.html`: página externa que autentica o usuário e permite exclusão.
- Dentro do app: Relatório → Conta e privacidade → Excluir minha conta.
