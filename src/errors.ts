import { type CommandName } from "./types.ts";

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

export class InvalidCommandNameError extends CommandError {
  constructor(
    originalCommandName: CommandName,
    sanitisedCommandName: CommandName,
  ) {
    super(
      `Invalid command name "${originalCommandName}". Sanitised command name is "${sanitisedCommandName}". Command names must start with a letter and can only contain letters and numbers.`,
    );
    this.name = "InvalidCommandNameError";
  }
}

export class CommandAlreadyExistsError extends CommandError {
  constructor(commandName: CommandName) {
    super(`Command with name "${commandName}" already exists.`);
    this.name = "CommandAlreadyExistsError";
  }
}

export class CommandAliasAlreadyExistsError extends CommandError {
  constructor(
    commandName: CommandName,
    alias: CommandName,
    existingCommandName: CommandName,
  ) {
    super(
      `Command "${commandName}" has a duplicate alias "${alias}" that already exists for "${existingCommandName}" in the registry.`,
    );
    this.name = "CommandAliasAlreadyExistsError";
  }
}

export class CommandDoesNotExistError extends CommandError {
  constructor(commandName: CommandName) {
    super(`Command with name "${commandName}" does not exist.`);
    this.name = "CommandDoesNotExistError";
  }
}

export class InvalidCommandArgumentError extends CommandError {
  constructor(argumentName: string, message: string) {
    super(`Invalid command argument "${argumentName}": ${message}`);
    this.name = "InvalidCommandArgumentError";
  }
}

export class UnknownCommandArgumentError extends CommandError {
  constructor(message: string) {
    super(`Unknown command argument "${message}"`);
    this.name = "UnknownCommandArgumentError";
  }
}

export class InvalidCommandArgumentSchema extends CommandError {
  constructor(commandName: CommandName, key: string) {
    super(
      `Command "${commandName}" argument '${key}' has invalid order (after an optional/rest argument).`,
    );
    this.name = "InvalidCommandArgumentSchema";
  }
}
