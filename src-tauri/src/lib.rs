use std::collections::BTreeSet;
use std::fs;
use std::process::Command;

#[tauri::command]
fn list_running_processes() -> Result<Vec<String>, String> {
  #[cfg(target_os = "windows")]
  {
    let output = Command::new("tasklist")
      .args(["/FO", "CSV", "/NH"])
      .output()
      .map_err(|error| format!("failed to run tasklist: {error}"))?;

    if !output.status.success() {
      return Err("tasklist exited with a non-zero status".to_string());
    }

    let stdout =
      String::from_utf8(output.stdout).map_err(|error| format!("invalid tasklist output: {error}"))?;

    let mut names = BTreeSet::new();
    for line in stdout.lines() {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }

      let first_field = trimmed
        .trim_matches('"')
        .split("\",\"")
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

      if first_field.ends_with(".exe") {
        names.insert(first_field);
      }
    }

    return Ok(names.into_iter().collect());
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(Vec::new())
  }
}

#[tauri::command]
fn save_text_file(default_name: String, content: String) -> Result<String, String> {
  let Some(path) = rfd::FileDialog::new()
    .set_file_name(&default_name)
    .save_file() else {
      return Ok("cancelled".to_string());
    };

  fs::write(&path, content).map_err(|error| format!("failed to save file: {error}"))?;

  Ok(path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![list_running_processes, save_text_file])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
