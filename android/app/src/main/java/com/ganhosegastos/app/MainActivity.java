package com.ganhosegastos.app;

import android.app.Activity;
import android.print.PrintManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
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

public class MainActivity extends Activity {
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private static final String APP_HOST = "appassets.androidplatform.net";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        assetLoader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidBridge(this, webView), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return assetLoader.shouldInterceptRequest(request.getUrl()); }
            @Override @SuppressWarnings("deprecation") public WebResourceResponse shouldInterceptRequest(WebView view, String url) { return assetLoader.shouldInterceptRequest(Uri.parse(url)); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return handleNavigation(request.getUrl()); }
            @Override @SuppressWarnings("deprecation") public boolean shouldOverrideUrlLoading(WebView view, String url) { return handleNavigation(Uri.parse(url)); }
        });
        webView.loadUrl("https://" + APP_HOST + "/assets/index.html");
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

    @Override public void onBackPressed() { if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }

    public static class AndroidBridge {
        private final Activity activity; private final WebView webView;
        AndroidBridge(Activity activity, WebView webView) { this.activity = activity; this.webView = webView; }
        @JavascriptInterface public void openExternal(String url) { activity.runOnUiThread(() -> { try { Uri uri=Uri.parse(url); String scheme=uri.getScheme(); if ("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme)) activity.startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception e){ Toast.makeText(activity,"Não foi possível abrir o link.",Toast.LENGTH_SHORT).show(); } }); }
        @JavascriptInterface public void printPage() { activity.runOnUiThread(() -> { PrintManager pm=(PrintManager)activity.getSystemService(Context.PRINT_SERVICE); if(pm!=null) pm.print("Ganhos_Gastos_Relatorio",webView.createPrintDocumentAdapter("Ganhos & Gastos"),null); }); }
        @JavascriptInterface public void saveFile(String fileName,String base64Data,String mimeType) { new Thread(() -> { try { byte[] bytes=Base64.decode(base64Data,Base64.DEFAULT); if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q){ ContentValues values=new ContentValues(); values.put(MediaStore.MediaColumns.DISPLAY_NAME,sanitize(fileName)); values.put(MediaStore.MediaColumns.MIME_TYPE,mimeType); values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/GanhosGastos"); Uri uri=activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values); if(uri==null)throw new Exception("Falha ao criar arquivo"); try(OutputStream out=activity.getContentResolver().openOutputStream(uri)){ if(out==null)throw new Exception("Falha ao abrir arquivo"); out.write(bytes); } }else{ File dir=new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),"GanhosGastos"); if(!dir.exists()&&!dir.mkdirs())throw new Exception("Falha ao criar pasta"); File file=new File(dir,sanitize(fileName)); try(OutputStream out=new FileOutputStream(file)){out.write(bytes);} } activity.runOnUiThread(() -> Toast.makeText(activity,"Arquivo salvo em Downloads/GanhosGastos",Toast.LENGTH_LONG).show()); }catch(Exception e){ activity.runOnUiThread(() -> Toast.makeText(activity,"Não foi possível salvar o arquivo.",Toast.LENGTH_LONG).show()); } }).start(); }
        private static String sanitize(String name){return name==null?"arquivo":name.replaceAll("[^a-zA-Z0-9._-]","_");}
    }
}
