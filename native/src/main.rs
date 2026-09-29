//! `rl-capture`: audio capture sidecar for Rebecca Listen.
//!
//! Reads JSON commands from stdin, one per line, and answers with JSON events
//! on stderr. The protocol is described in `PROTOCOL.md`.

mod command;
mod device;
mod endpoint_name;
mod enumerate;
mod event;

use std::io::BufRead;

use command::{Command, parse_command};
use event::{ErrorCode, Event, emit};

fn main() {
    for line in std::io::stdin().lock().lines() {
        // A broken stdin means main is gone: stop quietly.
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        match parse_command(&line) {
            Ok(command) => run(command),
            Err(message) => emit(&Event::Error {
                code: ErrorCode::BadCommand,
                message,
            }),
        }
    }
}

fn run(command: Command) {
    match command {
        Command::List => list(),
        Command::Open | Command::Start | Command::Stop => emit(&Event::Error {
            code: ErrorCode::NotImplemented,
            message: command.name().to_owned(),
        }),
    }
}

fn list() {
    match enumerate::list_devices() {
        Ok(enumeration) => {
            for message in enumeration.skipped {
                emit(&Event::Warning { message });
            }
            emit(&Event::Devices {
                devices: enumeration.devices,
            });
        }
        Err(error) => emit(&Event::Error {
            code: ErrorCode::EnumerationFailed,
            message: error.to_string(),
        }),
    }
}
