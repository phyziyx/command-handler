import {
  CommandAliasAlreadyExistsError,
  CommandAlreadyExistsError,
  CommandDoesNotExistError,
  InvalidCommandNameError,
} from "./errors.ts";
import type {
  CommandArg,
  CommandGroup,
  CommandName,
  CommandPrefix,
} from "./types.ts";

export interface IRawCommand {
  name: CommandName;
  aliases?: CommandName[];
  groups?: CommandGroup[];
  description?: string;
  handler: (args?: CommandArg[]) => void;
}

export interface IRawCommandRegistry {
  /**
   * Add a command to the registry.
   * @param command
   */
  addCommand(command: IRawCommand): void;
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
  getCommandsCount(group?: CommandGroup): number;
  /**
   * Can be used to check if a command exists in the registry.
   */
  hasCommand(commandName: CommandName): boolean;
  /**
   * Execute a command by name with optional arguments.
   */
  parseCommandLine(commandLine: string): boolean;
}

export class RawCommandRegistry implements IRawCommandRegistry {
  private prefix: CommandPrefix;

  private commands: Map<CommandName, IRawCommand> = new Map();
  private commandAliases: Map<CommandName, CommandName> = new Map();
  private commandGroups: Map<CommandGroup, CommandName[]> = new Map();

  private validCommandNameRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;

  constructor(prefix: CommandPrefix) {
    this.prefix = prefix;
  }

  getPrefix(): CommandPrefix {
    return this.prefix;
  }

  getCommandsCount(group?: CommandGroup): number {
    if (!!group) {
      const commandsInGroup = this.commandGroups.get(group);
      return commandsInGroup?.length ?? 0;
    }

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
  public addCommand(command: IRawCommand): void {
    const isValidCommandName = this.isValidCommandName(command.name);
    const sanitisedCommandName = this.sanitiseCommandName(command.name);

    if (!isValidCommandName) {
      throw new InvalidCommandNameError(command.name, sanitisedCommandName);
    }

    // early exit if the command already exists in the registry
    // saves us performance and time from checking for duplicate aliases if the command already exists
    const duplicateCommand = this.commands.get(sanitisedCommandName);
    if (!!duplicateCommand) {
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

    // console.log(
    //   `Adding command: ${sanitisedCommandName} with aliases: ${joinedAliases}`,
    // );

    if (sanitisedAliases.length > 0) {
      for (const alias of sanitisedAliases) {
        const existingCommandName = this.commandAliases.get(alias);

        if (!!existingCommandName) {
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

    // add the command to the command groups if it has any groups
    if (!!command.groups && command.groups.length > 0) {
      for (const group of command.groups) {
        const existingCommandsInGroup = this.commandGroups.get(group) ?? [];
        existingCommandsInGroup.push(sanitisedCommandName);
        this.commandGroups.set(group, existingCommandsInGroup);
      }
    }

    // console.log(
    //   `Command "${sanitisedCommandName}" added successfully with aliases "${joinedAliases}".`,
    // );
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

  // TODO: Similarity matching for commands

  // private findSimilarCommmand(commandName: CommandName): CommandName | null {
  //   for (const [name, command] of this.commands.entries()) {
  //     if (name.includes(commandName)) {
  //       return name;
  //     }
  //   }
  //   return null;
  // }

  // private findSimilarCommands(commandName: CommandName): CommandName[] {
  //   const similarCommands: CommandName[] = [];
  //   for (const [name, command] of this.commands.entries()) {
  //     if (name.includes(commandName)) {
  //       similarCommands.push(name);
  //     }
  //   }
  //   return similarCommands;
  // }

  /**
   * Execute a command by name with optional arguments.
   * @param commandName
   * @param args
   * @throws CommandDoesNotExistError if the command does not exist in the registry.
   */
  private executeCommand(commandName: CommandName, args?: CommandArg[]): void {
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
