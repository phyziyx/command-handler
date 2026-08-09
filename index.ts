/**
 * Command Handler
 *
 * Author: phyziyx
 *
 * Date: 09 August 2026 20:44:00
 */

type CommandPrefix = "/" | "!" | "#";
type CommandName = string;
type AliasCommandName = string;

export class CommandAlreadyExistsError extends Error {
  constructor(commandName: CommandName) {
    super(`Command with name "${commandName}" already exists.`);
    this.name = "CommandAlreadyExistsError";
  }
}

export class CommandAliasAlreadyExistsError extends Error {
  constructor(
    commandName: CommandName,
    alias: AliasCommandName,
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
}

export interface ICommand {
  name: CommandName;
  aliases?: AliasCommandName[];
  description?: string;
  handler: (args: string[]) => void;
}

export abstract class CommandRegistry implements ICommandRegistry {
  private prefix: CommandPrefix;

  private commands: Map<CommandName, ICommand> = new Map();
  private commandAliases: Map<CommandName, CommandName> = new Map();

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
    return commandName.trim().toLowerCase();
  }

  /**
   * Add a command to the registry.
   * @param command
   */
  public addCommand(command: ICommand): void {
    // Validation pass
    const commandName = this.sanitiseCommandName(command.name);

    const hasAliases = (command.aliases?.length ?? 0) > 0;
    if (hasAliases) {
      command.aliases = command.aliases!.map((alias) =>
        this.sanitiseCommandName(alias),
      );
    }

    console.log(
      `Adding command: ${commandName} with aliases: ${hasAliases ? command.aliases!.join(", ") : "None"}`,
    );

    //

    const hasDuplicateName = this.commands.has(commandName);

    if (hasDuplicateName) {
      throw new CommandAlreadyExistsError(commandName);
    }

    //

    const hasDuplicateAliasSelf =
      hasAliases && command.aliases!.some((alias) => this.commands.has(alias));

    if (hasDuplicateAliasSelf) {
      const duplicateAlias = command.aliases!.find((alias) =>
        this.commands.has(alias),
      );
      throw new CommandAliasAlreadyExistsError(
        commandName,
        duplicateAlias!,
        commandName,
      );
    }

    //

    if (hasAliases) {
      for (const alias of command.aliases!) {
        const aliasCommandName = this.commandAliases.get(alias);
        if (!!aliasCommandName) {
          throw new CommandAliasAlreadyExistsError(
            commandName,
            alias,
            aliasCommandName,
          );
        }
      }

      command.aliases!.forEach((alias) => {
        const sanitisedAlias = this.sanitiseCommandName(alias);
        this.commandAliases.set(sanitisedAlias, commandName);
      });
    }

    this.commands.set(command.name, command);

    console.log(`Command "${commandName}" added successfully.`);
  }

  /**
   * Remove a command from the registry.
   */
  public removeCommand(commandName: CommandName): void {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new CommandDoesNotExistError(commandName);
    }
  }
}
