//! Responses and events written to stderr, one JSON object per line.
//!
//! stdout is reserved for the binary PCM stream (task 08), so nothing textual
//! may ever be printed there.

use std::io::Write;

use serde::Serialize;

use crate::device::AudioDevice;

/// Machine-readable reason attached to every `error` event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The line was not valid JSON or not a known command.
    BadCommand,
    /// The command exists in the protocol but this build does not run it yet.
    NotImplemented,
    /// The audio host could not list its endpoints.
    EnumerationFailed,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Event {
    Devices { devices: Vec<AudioDevice> },
    Warning { message: String },
    Error { code: ErrorCode, message: String },
}

/// Writes one event as a single JSON line on stderr.
pub fn emit(event: &Event) {
    let line = serde_json::to_string(event).expect("events always serialize");
    let mut stderr = std::io::stderr().lock();
    // If main closed the pipe there is nobody left to tell, so errors are dropped.
    let _ = writeln!(stderr, "{line}");
    let _ = stderr.flush();
}

#[cfg(test)]
mod tests {
    use super::{ErrorCode, Event};

    #[test]
    fn tags_events_with_their_type() {
        let event = Event::Error {
            code: ErrorCode::NotImplemented,
            message: "open".to_owned(),
        };
        assert_eq!(
            serde_json::to_value(&event).unwrap(),
            serde_json::json!({"type": "error", "code": "not_implemented", "message": "open"})
        );
    }

    #[test]
    fn serializes_an_empty_device_list() {
        let event = Event::Devices { devices: vec![] };
        assert_eq!(
            serde_json::to_value(&event).unwrap(),
            serde_json::json!({"type": "devices", "devices": []})
        );
    }
}
