//! Commands read from stdin, one JSON object per line: `{"cmd": "list"}`.
//!
//! Only `list` does something for now; `open`, `start` and `stop` are parsed so
//! main gets a precise `not_implemented` instead of a parse error (task 08).

use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase")]
pub enum Command {
    List,
    Open,
    Start,
    Stop,
}

impl Command {
    /// The wire name, as it appears in the `cmd` field.
    pub fn name(self) -> &'static str {
        match self {
            Command::List => "list",
            Command::Open => "open",
            Command::Start => "start",
            Command::Stop => "stop",
        }
    }
}

/// Parses one stdin line. The error is a human-readable message for main's log.
pub fn parse_command(line: &str) -> Result<Command, String> {
    serde_json::from_str(line).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{Command, parse_command};

    #[test]
    fn parses_a_valid_command() {
        assert_eq!(parse_command(r#"{"cmd":"list"}"#), Ok(Command::List));
    }

    #[test]
    fn ignores_extra_fields() {
        let line = r#"{"cmd":"open","deviceId":"wasapi:abc","loopback":true}"#;
        assert_eq!(parse_command(line), Ok(Command::Open));
    }

    #[test]
    fn rejects_broken_json() {
        assert!(parse_command(r#"{"cmd":"list""#).is_err());
    }

    #[test]
    fn rejects_an_unknown_command() {
        let error = parse_command(r#"{"cmd":"explode"}"#).unwrap_err();
        assert!(error.contains("unknown variant"), "{error}");
    }

    #[test]
    fn rejects_a_line_without_cmd() {
        assert!(parse_command(r#"{"list":true}"#).is_err());
    }
}
