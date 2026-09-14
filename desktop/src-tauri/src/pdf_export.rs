use tauri::AppHandle;

#[tauri::command]
pub async fn save_preview_pdf(
    app: AppHandle,
    html: String,
    file_name: String,
) -> Result<String, String> {
    #[cfg(not(windows))]
    {
        let _ = (app, html, file_name);
        Err("Sessiz PDF kaydı yalnızca Windows uygulamasında desteklenir.".into())
    }

    #[cfg(windows)]
    save_preview_pdf_windows(app, html, file_name).await
}

#[cfg(windows)]
async fn save_preview_pdf_windows(
    app: AppHandle,
    html: String,
    file_name: String,
) -> Result<String, String> {
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::{self, RecvTimeoutError};
    use std::sync::Arc;
    use std::time::Duration;

    use tauri::webview::PageLoadEvent;
    use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{
            ICoreWebView2Environment6, ICoreWebView2PrintSettings, ICoreWebView2_7,
            COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT,
        },
        PrintToPdfCompletedHandler,
    };
    use windows::core::{Interface, HSTRING};

    fn downloads_dir() -> PathBuf {
        std::env::var_os("USERPROFILE")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("Downloads")
    }

    fn unique_pdf_path(file_name: &str) -> PathBuf {
        let safe_name = file_name.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
        let dir = downloads_dir();
        let _ = std::fs::create_dir_all(&dir);
        let candidate = dir.join(&safe_name);
        if !candidate.exists() {
            return candidate;
        }

        let stem = candidate
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("belge");
        let ext = candidate
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("pdf");
        for index in 1..1000 {
            let next = dir.join(format!("{stem} ({index}).{ext}"));
            if !next.exists() {
                return next;
            }
        }
        candidate
    }

    fn print_settings(
        webview: &tauri::webview::PlatformWebview,
    ) -> Option<ICoreWebView2PrintSettings> {
        let settings = unsafe {
            webview
                .environment()
                .cast::<ICoreWebView2Environment6>()
                .ok()?
                .CreatePrintSettings()
                .ok()?
        };
        unsafe {
            let _ = settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT);
            let _ = settings.SetPageWidth(8.27);
            let _ = settings.SetPageHeight(11.69);
            let _ = settings.SetMarginTop(0.394);
            let _ = settings.SetMarginBottom(0.394);
            let _ = settings.SetMarginLeft(0.394);
            let _ = settings.SetMarginRight(0.394);
            let _ = settings.SetShouldPrintBackgrounds(true);
        }
        Some(settings)
    }

    fn start_print_to_pdf(
        webview: &tauri::webview::PlatformWebview,
        pdf_path: &Path,
        html_path: PathBuf,
        sender: mpsc::SyncSender<Result<String, String>>,
        closer: WebviewWindow,
    ) {
        let printer = unsafe {
            webview
                .controller()
                .CoreWebView2()
                .ok()
                .and_then(|core| core.cast::<ICoreWebView2_7>().ok())
        };
        let Some(printer) = printer else {
            let _ = sender.send(Err("WebView2 PDF arabirimi kullanılamadı.".into()));
            let _ = closer.destroy();
            let _ = std::fs::remove_file(&html_path);
            return;
        };

        let saved_path = pdf_path.display().to_string();
        let html_path_for_callback = html_path.clone();
        let sender_for_callback = sender.clone();
        let closer_for_callback = closer.clone();
        let handler = PrintToPdfCompletedHandler::create(Box::new(move |error, success| {
            let result = if let Err(error) = error {
                Err(error.to_string())
            } else if success {
                Ok(saved_path)
            } else {
                Err("PDF oluşturulamadı.".into())
            };
            let _ = sender_for_callback.send(result);
            let _ = closer_for_callback.destroy();
            let _ = std::fs::remove_file(&html_path_for_callback);
            Ok(())
        }));

        let path = HSTRING::from(pdf_path.to_string_lossy().as_ref());
        let started = match print_settings(webview) {
            Some(settings) => unsafe { printer.PrintToPdf(&path, &settings, &handler) },
            None => unsafe { printer.PrintToPdf(&path, None, &handler) },
        };
        if let Err(error) = started {
            let _ = sender.send(Err(error.to_string()));
            let _ = closer.destroy();
            let _ = std::fs::remove_file(&html_path);
        }
    }

    let pdf_path = unique_pdf_path(&file_name);
    let html_path = std::env::temp_dir().join(format!(
        "edefter-print-{}.html",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or(0)
    ));
    std::fs::write(&html_path, html).map_err(|error| error.to_string())?;
    let file_url = tauri::Url::from_file_path(&html_path)
        .map_err(|_| "PDF için geçici HTML dosyası oluşturulamadı.".to_string())?;

    if let Some(existing) = app.get_webview_window("pdf-export") {
        let _ = existing.destroy();
    }

    let (sender, receiver) = mpsc::sync_channel::<Result<String, String>>(1);
    let started = Arc::new(AtomicBool::new(false));
    let pdf_path_for_load = pdf_path.clone();
    let html_path_for_load = html_path.clone();

    WebviewWindowBuilder::new(&app, "pdf-export", WebviewUrl::External(file_url))
        .title("PDF")
        .visible(false)
        .skip_taskbar(true)
        .decorations(false)
        .inner_size(794.0, 1123.0)
        .on_page_load(move |window, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }
            if !payload.url().as_str().contains("edefter-print-") {
                return;
            }
            if started.swap(true, Ordering::SeqCst) {
                return;
            }

            let pdf_path = pdf_path_for_load.clone();
            let html_path = html_path_for_load.clone();
            let sender_for_webview = sender.clone();
            let closer = window.clone();
            if let Err(error) = window.with_webview(move |webview| {
                start_print_to_pdf(
                    &webview,
                    &pdf_path,
                    html_path,
                    sender_for_webview,
                    closer,
                );
            }) {
                let _ = sender.send(Err(error.to_string()));
            }
        })
        .build()
        .map_err(|error| {
            let _ = std::fs::remove_file(&html_path);
            error.to_string()
        })?;

    let result = tauri::async_runtime::spawn_blocking(move || {
        match receiver.recv_timeout(Duration::from_secs(180)) {
            Ok(result) => result,
            Err(RecvTimeoutError::Timeout) => {
                Err("PDF oluşturma zaman aşımına uğradı.".into())
            }
            Err(RecvTimeoutError::Disconnected) => Err("PDF oluşturulamadı.".into()),
        }
    })
    .await
    .map_err(|error| error.to_string())?;

    if result.is_err() {
        if let Some(window) = app.get_webview_window("pdf-export") {
            let _ = window.destroy();
        }
        let _ = std::fs::remove_file(&html_path);
    }

    result
}
