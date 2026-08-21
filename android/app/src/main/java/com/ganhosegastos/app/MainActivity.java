package com.ganhosegastos.app;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.Executor;

public class MainActivity extends Activity {
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_CODE = 1107;
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String PREFS = "ganhos_gastos_security";
    private static final String PREF_BIOMETRIC = "biometric_enabled";
    private boolean resumedOnce = false;
    private long pausedAt = 0L;
    private boolean biometricPromptShowing = false;
    private CancellationSignal biometricCancellation = null;
    private long lastBackPressedAt = 0L;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        setContentView(webView);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                try {
                    Intent intent = params.createIntent();
                    intent.setType("image/*");
                    startActivityForResult(Intent.createChooser(intent, "Escolher foto"), FILE_CHOOSER_CODE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Não foi possível abrir suas fotos.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this, webView), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return assetLoader.shouldInterceptRequest(request.getUrl()); }
            @Override @SuppressWarnings("deprecation") public WebResourceResponse shouldInterceptRequest(WebView view, String url) { return assetLoader.shouldInterceptRequest(Uri.parse(url)); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return handleNavigation(request.getUrl()); }
            @Override @SuppressWarnings("deprecation") public boolean shouldOverrideUrlLoading(WebView view, String url) { return handleNavigation(Uri.parse(url)); }
        });

        if (Build.VERSION.SDK_INT >= 33) registerModernBackCallback();
        webView.loadUrl("https://" + APP_HOST + "/assets/index.html");
    }

    @TargetApi(33)
    private void registerModernBackCallback() {
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleSystemBack
        );
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_CODE && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override protected void onPause() {
        if (!biometricPromptShowing) pausedAt = System.currentTimeMillis();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (resumedOnce && !biometricPromptShowing && pausedAt > 0 && System.currentTimeMillis() - pausedAt > 15000 && isBiometricEnabled()) {
            webView.postDelayed(() -> webView.evaluateJavascript("window.nativeRequestLock&&window.nativeRequestLock()", null), 220);
        }
        resumedOnce = true;
    }

    private boolean handleNavigation(Uri uri) {
        String host = uri.getHost();
        if (APP_HOST.equals(host)) return false;
        String scheme = uri.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (Exception e) { Toast.makeText(this, "Não foi possível abrir este link.", Toast.LENGTH_SHORT).show(); }
            return true;
        }
        return false;
    }

    private SharedPreferences prefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }
    private boolean isBiometricEnabled() { return prefs().getBoolean(PREF_BIOMETRIC, false); }

    private void sendJs(String fn, boolean ok, String message) {
        String safe = message == null ? "" : message.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
        webView.evaluateJavascript("window." + fn + "&&window." + fn + "(" + ok + ",'" + safe + "')", null);
    }

    private void finishBiometric(boolean enabling, boolean ok, String message) {
        boolean wasShowing = biometricPromptShowing;
        biometricPromptShowing = false;
        biometricCancellation = null;
        if (!wasShowing && !ok) return;
        if (enabling && ok) prefs().edit().putBoolean(PREF_BIOMETRIC, true).apply();
        sendJs(enabling ? "onBiometricSetupResult" : "onBiometricResult", ok, message);
    }

    private void showBiometricPrompt(boolean enabling) {
        if (biometricPromptShowing) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            if (enabling) sendJs("onBiometricSetupResult", false, "A biometria exige Android 9 ou superior.");
            else sendJs("onBiometricResult", false, "Biometria indisponível.");
            return;
        }

        biometricPromptShowing = true;
        Executor executor = getMainExecutor();
        biometricCancellation = new CancellationSignal();
        BiometricPrompt prompt = new BiometricPrompt.Builder(this)
                .setTitle(enabling ? "Ativar biometria" : "Desbloquear")
                .setSubtitle("Use sua digital ou reconhecimento facial")
                .setDescription("Ganhos & Gastos protege seus dados neste celular")
                .setNegativeButton("Cancelar", executor, (dialog, which) -> finishBiometric(enabling, false, "Cancelado"))
                .build();
        try {
            prompt.authenticate(biometricCancellation, executor, new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    super.onAuthenticationSucceeded(result);
                    finishBiometric(enabling, true, enabling ? "Biometria ativada." : "Desbloqueado");
                }
                @Override public void onAuthenticationError(int errorCode, CharSequence errString) {
                    super.onAuthenticationError(errorCode, errString);
                    String msg = errString == null ? "Não foi possível usar a biometria." : errString.toString();
                    finishBiometric(enabling, false, msg);
                }
                @Override public void onAuthenticationFailed() { super.onAuthenticationFailed(); }
            });
        } catch (Exception e) {
            finishBiometric(enabling, false, "Não foi possível abrir a biometria neste aparelho.");
        }
    }

    private void handleSystemBack() {
        if (biometricPromptShowing) return;
        if (webView == null) { requestDoubleBackExit(); return; }

        String js = "(function(){try{" +
                "var byId=function(x){return document.getElementById(x)};" +
                "var bio=byId('bioLock'),opt=byId('optSheet'),cat=byId('catSheet'),launch=byId('launchModal');" +
                "var overlay=(bio&&!bio.classList.contains('hide'))||(opt&&opt.classList.contains('on'))||(cat&&cat.classList.contains('on'))||(launch&&launch.classList.contains('on'))||document.querySelector('.setting-expand-panel.open');" +
                "var cur=(window.currentTab?window.currentTab():(document.querySelector('.nav .on')?.dataset.tab||'home'));" +
                "var hist=false;try{var tmp=navStack.slice();while(tmp.length&&tmp[tmp.length-1]===cur)tmp.pop();hist=tmp.length>0}catch(e){}" +
                "if(overlay||cur!=='home'||hist){if(window.handleAppBack)window.handleAppBack();return 'handled'}" +
                "return 'root'}catch(e){return 'root'}})()";

        webView.evaluateJavascript(js, result -> {
            String state = result == null ? "root" : result.replace("\"", "");
            if ("handled".equals(state)) {
                lastBackPressedAt = 0L;
                return;
            }
            if (webView.canGoBack()) {
                lastBackPressedAt = 0L;
                webView.goBack();
                return;
            }
            requestDoubleBackExit();
        });
    }

    private void requestDoubleBackExit() {
        long now = System.currentTimeMillis();
        if (lastBackPressedAt > 0 && now - lastBackPressedAt <= 2000) {
            finish();
            return;
        }
        lastBackPressedAt = now;
        Toast.makeText(this, "Pressione Voltar novamente para sair", Toast.LENGTH_SHORT).show();
    }

    @Override @SuppressWarnings("deprecation") public void onBackPressed() { handleSystemBack(); }

    public class AndroidBridge {
        private final Activity activity;
        private final WebView webView;
        AndroidBridge(Activity activity, WebView webView) { this.activity = activity; this.webView = webView; }

        @JavascriptInterface public void openExternal(String url) {
            activity.runOnUiThread(() -> {
                try {
                    Uri uri = Uri.parse(url);
                    String scheme = uri.getScheme();
                    if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) activity.startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) { Toast.makeText(activity, "Não foi possível abrir o link.", Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface public boolean biometricSupported() { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P; }
        @JavascriptInterface public boolean biometricEnabled() { return isBiometricEnabled(); }
        @JavascriptInterface public void setBiometricEnabled(boolean enabled) {
            activity.runOnUiThread(() -> {
                if (!enabled) {
                    if (biometricCancellation != null) biometricCancellation.cancel();
                    biometricPromptShowing = false;
                    biometricCancellation = null;
                    prefs().edit().putBoolean(PREF_BIOMETRIC, false).apply();
                    sendJs("onBiometricSetupResult", false, "");
                } else showBiometricPrompt(true);
            });
        }
        @JavascriptInterface public void authenticateBiometric() { activity.runOnUiThread(() -> showBiometricPrompt(false)); }

        @JavascriptInterface public void printPage() {
            activity.runOnUiThread(() -> {
                PrintManager pm = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (pm != null) pm.print("Ganhos_Gastos_Relatorio", webView.createPrintDocumentAdapter("Ganhos & Gastos"), null);
            });
        }

        @JavascriptInterface public void saveFile(String fileName, String base64Data, String mimeType) {
            new Thread(() -> {
                try {
                    byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.MediaColumns.DISPLAY_NAME, sanitize(fileName));
                        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GanhosGastos");
                        Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (uri == null) throw new Exception("Falha ao criar arquivo");
                        try (OutputStream out = activity.getContentResolver().openOutputStream(uri)) {
                            if (out == null) throw new Exception("Falha ao abrir arquivo");
                            out.write(bytes);
                        }
                    } else {
                        File dir = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "GanhosGastos");
                        if (!dir.exists() && !dir.mkdirs()) throw new Exception("Falha ao criar pasta");
                        File file = new File(dir, sanitize(fileName));
                        try (OutputStream out = new FileOutputStream(file)) { out.write(bytes); }
                    }
                    activity.runOnUiThread(() -> Toast.makeText(activity, "Arquivo salvo em Downloads/GanhosGastos", Toast.LENGTH_LONG).show());
                } catch (Exception e) {
                    activity.runOnUiThread(() -> Toast.makeText(activity, "Não foi possível salvar o arquivo.", Toast.LENGTH_LONG).show());
                }
            }).start();
        }
        private String sanitize(String name) { return name == null ? "arquivo" : name.replaceAll("[^a-zA-Z0-9._-]", "_"); }
    }
}
