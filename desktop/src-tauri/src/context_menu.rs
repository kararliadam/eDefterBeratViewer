#[cfg(windows)]
mod windows_impl {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    const VERB: &str = "BeratGoruntuleyici";
    const LABEL: &str = "Berat Görüntüleyici ile aç";

    pub fn register() {
        if let Err(error) = register_keys() {
            eprintln!("Explorer sağ tık menüsü kaydedilemedi: {error}");
        }
    }

    fn register_keys() -> Result<(), String> {
        let exe = std::env::current_exe().map_err(|error| error.to_string())?;
        let exe = exe.to_string_lossy();
        let command = format!("\"{exe}\" \"%1\"");
        let icon = format!("{exe},0");
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        for ext in [".xml", ".zip"] {
            let shell_path = format!("Software\\Classes\\SystemFileAssociations\\{ext}\\shell\\{VERB}");
            let (shell_key, _) = hkcu
                .create_subkey(&shell_path)
                .map_err(|error| error.to_string())?;
            shell_key
                .set_value("", &LABEL)
                .map_err(|error| error.to_string())?;
            shell_key
                .set_value("Icon", &icon)
                .map_err(|error| error.to_string())?;
            let (command_key, _) = shell_key
                .create_subkey("command")
                .map_err(|error| error.to_string())?;
            command_key
                .set_value("", &command)
                .map_err(|error| error.to_string())?;

            let prog_id = format!("{VERB}{ext}");
            let (prog_key, _) = hkcu
                .create_subkey(format!("Software\\Classes\\{prog_id}"))
                .map_err(|error| error.to_string())?;
            prog_key
                .set_value("", &"eDefter Berat Görüntüleyici")
                .map_err(|error| error.to_string())?;
            let (open_key, _) = prog_key
                .create_subkey("shell\\open\\command")
                .map_err(|error| error.to_string())?;
            open_key
                .set_value("", &command)
                .map_err(|error| error.to_string())?;
            let (icon_key, _) = prog_key
                .create_subkey("DefaultIcon")
                .map_err(|error| error.to_string())?;
            icon_key
                .set_value("", &icon)
                .map_err(|error| error.to_string())?;

            let (open_with, _) = hkcu
                .create_subkey(format!("Software\\Classes\\{ext}\\OpenWithProgids"))
                .map_err(|error| error.to_string())?;
            open_with
                .set_value(&prog_id, &"")
                .map_err(|error| error.to_string())?;
        }

        Ok(())
    }
}

pub fn register() {
    #[cfg(windows)]
    windows_impl::register();
}
