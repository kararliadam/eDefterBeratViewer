mod context_menu;
mod file_open;

use file_open::{extract_file_path, get_pending_file_path, read_launch_file, LaunchState};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pending_path = extract_file_path(&std::env::args().collect::<Vec<_>>());
    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(path) = extract_file_path(&args) {
                let _ = app.emit("open-file", path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .manage(LaunchState::new(pending_path))
        .setup(|_app| {
            context_menu::register();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_pending_file_path,
            read_launch_file
        ])
        .run(tauri::generate_context!())
        .expect("eDefter Berat Görüntüleyici başlatılamadı");
}
