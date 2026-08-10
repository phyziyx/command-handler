/*
 * Command Handler
 *
 * Author: phyziyx
 *
 * Date: 09 August 2026 20:44:00
 *
 * TODO:
 * - Keep using Exceptions/Errors as the main way to handle errors
 * in the command handler? OR Start using the Result pattern for error
 * handling in the command handler?
 * - Add support for command argument parsing and validation, which can be used
 * for adding different argument types and validation rules for commands.
 * - Add support for command context, which can be passed to the command handler.
 */

type CommandPrefix = string;
type CommandName = string;
type CommandArg = string;

export class InvalidCommandNameError extends Error {
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

export class CommandAlreadyExistsError extends Error {
  constructor(commandName: CommandName) {
    super(`Command with name "${commandName}" already exists.`);
    this.name = "CommandAlreadyExistsError";
  }
}

export class CommandAliasAlreadyExistsError extends Error {
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

export class CommandDoesNotExistError extends Error {
  constructor(commandName: CommandName) {
    super(`Command with name "${commandName}" does not exist.`);
    this.name = "CommandDoesNotExistError";
  }
}

export interface ICommandRegistry {
  /**
   * Add a command to the registry.
   * @param command
   */
  addCommand(command: ICommand): void;
  /**
   * Remove a command from the registry.
   * @param command
   */
  removeCommand(commandName: CommandName): void;
  /**
   * Sanitise a command name.
   * @param commandName
   */
  sanitiseCommandName(commandName: CommandName): CommandName;
  /**
   * Get the command prefix.
   */
  getPrefix(): CommandPrefix;
  /**
   * Get the commands count.
   */
  getCommandsCount(): number;
  /**
   * Can be used to check if a command exists in the registry.
   */
  hasCommand(commandName: CommandName): boolean;
  /**
   * Execute a command by name with optional arguments.
   */
  parseCommandLine(commandLine: string): boolean;
}

export interface ICommand {
  name: CommandName;
  aliases?: CommandName[];
  description?: string;
  handler: (args: string[]) => void;
}

export class CommandRegistry implements ICommandRegistry {
  private prefix: CommandPrefix;

  private commands: Map<CommandName, ICommand> = new Map();
  private commandAliases: Map<CommandName, CommandName> = new Map();

  private validCommandNameRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;

  constructor(prefix: CommandPrefix) {
    this.prefix = prefix;
  }

  getPrefix(): CommandPrefix {
    return this.prefix;
  }

  getCommandsCount(): number {
    return this.commands.size;
  }

  hasCommand(commandName: CommandName): boolean {
    const sanitisedCommandName = this.sanitiseCommandName(commandName);
    return this.commands.has(sanitisedCommandName);
  }

  public sanitiseCommandName(commandName: CommandName): CommandName {
    // - Trim out all the whitespace from the command name
    // - Convert the command name to lowercase
    // - Return the sanitised command name
    return commandName.replace(/\s+/g, "").toLowerCase();
  }

  public isValidCommandName(commandName: CommandName): boolean {
    return this.validCommandNameRegex.test(commandName);
  }

  /**
   * Add a command to the registry.
   * @param command
   */
  public addCommand(command: ICommand): void {
    const isValidCommandName = this.isValidCommandName(command.name);
    const sanitisedCommandName = this.sanitiseCommandName(command.name);

    if (!isValidCommandName) {
      throw new InvalidCommandNameError(command.name, sanitisedCommandName);
    }

    // early exit if the command already exists in the registry
    // saves us performance and time from checking for duplicate aliases if the command already exists
    const duplicateCommand = this.commands.get(sanitisedCommandName);
    if (duplicateCommand) {
      throw new CommandAlreadyExistsError(sanitisedCommandName);
    }

    const hasAliases = (command.aliases?.length ?? 0) > 0;
    const sanitisedAliases: CommandName[] = [];
    if (hasAliases) {
      for (const alias of command.aliases!) {
        const isValidAlias = this.isValidCommandName(alias);
        const sanitisedAlias = this.sanitiseCommandName(alias);

        if (!isValidAlias) {
          throw new InvalidCommandNameError(alias, sanitisedAlias);
        }

        sanitisedAliases.push(sanitisedAlias);
      }
    }

    const joinedAliases =
      sanitisedAliases.length > 0 ? sanitisedAliases.join(", ") : "None";

    console.log(
      `Adding command: ${sanitisedCommandName} with aliases: ${joinedAliases}`,
    );

    if (sanitisedAliases.length > 0) {
      for (const alias of sanitisedAliases) {
        const existingCommandName = this.commandAliases.get(alias);

        if (existingCommandName) {
          throw new CommandAliasAlreadyExistsError(
            sanitisedCommandName,
            alias,
            existingCommandName,
          );
        }

        this.commandAliases.set(alias, sanitisedCommandName);
      }
    }

    this.commands.set(command.name, command);

    console.log(
      `Command "${sanitisedCommandName}" added successfully with aliases "${joinedAliases}".`,
    );
  }

  /**
   * Remove a command from the registry.
   */
  public removeCommand(commandName: CommandName): void {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new CommandDoesNotExistError(commandName);
    }

    const aliases = command.aliases ?? [];
    aliases.forEach((alias) => {
      this.commandAliases.delete(alias);
    });

    this.commands.delete(commandName);
  }

  /**
   * Execute a command by name with optional arguments.
   * @param commandName
   * @param args
   */
  public parseCommandLine(commandLine: string): boolean {
    if (!commandLine.startsWith(this.prefix)) {
      return false;
    }

    const tokens = commandLine
      .slice(this.prefix.length)
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return false;
    }

    const commandName = tokens.shift();

    if (!commandName) {
      return false;
    }

    const args = tokens;

    this.executeCommand(commandName, args);
    return true;
  }

  /**
   * Execute a command by name with optional arguments.
   * @param commandName
   * @param args
   */
  private executeCommand(
    commandName: CommandName,
    args?: Array<CommandArg>,
  ): void {
    let sanitisedCommandName = this.sanitiseCommandName(commandName);

    if (!sanitisedCommandName) {
      throw new CommandDoesNotExistError(sanitisedCommandName);
    }

    // first, check if the command is an alias

    sanitisedCommandName =
      this.commandAliases.get(sanitisedCommandName) ?? sanitisedCommandName;

    // then, check if the command exists in the registry

    const command = this.commands.get(sanitisedCommandName);

    if (!command) {
      throw new CommandDoesNotExistError(sanitisedCommandName);
    }

    // command is now found, we can now execute it!

    command.handler(args ?? []);
  }
}
