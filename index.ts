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
    return commandName.toLowerCase();
  }

  /**
   * Add a command to the registry.
   * @param command
   */
  public addCommand(command: ICommand): void {
    const commandName = this.sanitiseCommandName(command.name);
    const hasAliases = (command.aliases?.length ?? 0) > 0;

    console.log(
      `Adding command: ${commandName} with aliases: ${hasAliases ? command.aliases!.join(", ") : "None"}`,
    );

    const hasDuplicateName = this.commands.has(commandName);

    if (hasDuplicateName) {
      throw new Error(`Command with name "${commandName}" already exists.`);
    }

    // TODO: Command aliases and duplicate alias checking

    // const hasDuplicateAlias =
    //   hasAliases && command.aliases!.some((alias) => this.commands.has(alias));

    // if (hasDuplicateAlias) {
    //   const duplicateAlias = command.aliases!.find((alias) => this.commands.has(alias));
    //   throw new Error(`Command "${commandName}" has a duplicate alias "${duplicateAlias}".`);
    // }

    // if (command.aliases?.length ?? 0 > 0) {
    //   for (const alias of command.aliases) {
    //     if (this.commands.has(alias)) {
    //       throw new Error(`Command with alias "${alias}" already exists.`);
    //     }
    //   }
    // }

    this.commands.set(command.name, command);

    // TODO: Register command aliases in the commandAliases map
  }

  /**
   * Remove a command from the registry.
   */
  public removeCommand(commandName: CommandName): void {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Command with name "${commandName}" does not exist.`);
    }
  }
}

export class SlashCommandRegistry extends CommandRegistry {
  constructor() {
    super("/");
  }
}

export class AdminCommandRegistry extends CommandRegistry {
  constructor() {
    super("!");
  }
}
