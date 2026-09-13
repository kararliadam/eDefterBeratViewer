use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MAX_XML_FILE_SIZE: u64 = 10 * 1024 * 1024;
const MAX_ARCHIVE_SIZE: u64 = 50 * 1024 * 1024;

pub struct LaunchState {
    pending_path: Mutex<Option<String>>,
}

impl LaunchState {
    pub fn new(pending_path: Option<String>) -> Self {
        Self {
            pending_path: Mutex::new(pending_path),
        }
    }
}

#[derive(serde::Serialize)]
pub struct LaunchFile {
    pub name: String,
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,
}

pub fn extract_file_path(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .map(|arg| arg.trim_matches('"').to_string())
        .find(|arg| is_supported_path(Path::new(arg)))
}

pub fn is_supported_path(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.to_ascii_lowercase()),
        Some(ext) if ext == "xml" || ext == "zip"
    )
}

#[tauri::command]
pub fn get_pending_file_path(state: tauri::State<LaunchState>) -> Option<String> {
    state.pending_path.lock().expect("launch state").take()
}

#[tauri::command]
pub fn read_launch_file(path: String) -> Result<LaunchFile, String> {
    let path = PathBuf::from(path.trim_matches('"'));
    if !is_supported_path(&path) {
        return Err("Yalnızca XML veya ZIP dosyaları açılabilir.".into());
    }

    let metadata = std::fs::metadata(&path).map_err(|error| error.to_string())?;
    let max_size = if path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("zip"))
    {
        MAX_ARCHIVE_SIZE
    } else {
        MAX_XML_FILE_SIZE
    };

    if metadata.len() > max_size {
        return Err("Dosya boyutu izin verilen sınırı aşıyor.".into());
    }

    let data = std::fs::read(&path).map_err(|error| error.to_string())?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.xml")
        .to_string();

    Ok(LaunchFile { name, data })
}
