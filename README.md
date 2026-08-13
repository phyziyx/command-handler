# command-handler

A fully-typed command handler written in TypeScript with custom parser support and tests!

## Example

Instead of writing this code:

```ts
const slashCommandRegistry = new RawCommandRegistry("/");

slashRawCommandRegistry.addCommand({
  name: "pm",
  aliases: ["dm", "priv"],
  description: "Send a private message to a player",
  handler: (args: string[]) => {
    const player = args[0];
    const rest = args.slice(1);

    if (!player || !rest || rest.length === 0) {
      console.error("usage: /pm <player> <...message>");
      return;
    }

    console.log(`sent pm to ${player}: ${message}`);
  },
});
```

```ts
const slashCommandRegistry = new TypedCommandRegistry("/");

typedCommandRegistry.addCommand({
  name: "pm",
  aliases: ["dm", "priv"],
  args: {
    // you can add your own custom parser class
    player: new PlayerParser(),
    message: new RestParser(),
  },
  description: "Send a private message to a player",
  handler: ({ player, message }) => {
    // player and message are typed and validated :)
    console.log(`sent pm to ${player}: ${message}`);
  },
});
```

## Ideas

- TDD!
- Use Result pattern for errors as value or use errors for flow control?
- Inject your own argument processor
- Command context, so you can pass some context to the command, such as the executor, logger or something
- Command middlewares, for pre and post processors with context and some details
- Grouping!
- Permissions? RBAC? PBAC?
- Auto-completion and spelling mistake friendly
- Command overloading with different parameters?
- Sub-commands? so you can put commands under other commands?
- i18n?
