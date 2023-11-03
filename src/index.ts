import { Hono, type HonoRequest } from 'hono'
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions'
import { Env } from './env'
import { TEST_COMMAND, TWITTER_COMMAND } from './commands.js'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello bot!')
})

app.post('/interactions', async (c) => {
  const { isValid, interaction } = await verifyDiscordRequest(c.req, c.env)
  if (!isValid || !interaction) {
    return c.text('Bad Request', 401)
  }
  const type = Number(interaction.type)
  if (type === InteractionType.PING) {
    return c.json({ type: InteractionResponseType.PONG })
  }

  // https://discord.com/developers/docs/interactions/application-commands#slash-commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data
    if (name === TEST_COMMAND.name) {
      const userId = interaction.data.member.user.id
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `hello <@${userId}>`
        }
      })
    }

    // https://discord.com/developers/docs/interactions/application-commands#message-commands
    if (name === TWITTER_COMMAND.name) {
      const messages = interaction.data.resolved.messages as { [key: string]: {
        attachments: [],
        author: {
          avatar: string,
          discriminator: string,
          id: string,
          public_flags: number,
          username: string
        },
        channel_id: string,
        components: [],
        content: string,
        edited_timestamp: null,
        embeds: [],
        flags: number,
        id: string,
        mention_everyone: boolean,
        mention_roles: [],
        mentions: [],
        pinned: boolean,
        timestamp: string,
        tts: boolean,
        type: number
      } }
      // https://discord.com/developers/docs/resources/channel#embed-object
      const embeds: {
        title?: string
        type?: string
        url?: string
      }[] = []
      const urlExpression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi
      for (const [key, val] of Object.entries(messages)) {
        const matched = val.content.match(urlExpression) ?? []
        for (const m of matched) {
          if (m.startsWith('x.com') || m.startsWith('twitter.com')) {
            const u = new URL(`https://${m}`)
            const url = `https://vxtwitter.com${u.pathname}`
            embeds.push({
              title: u.toString(),
              type: 'link',
              url
            })
          }
        }
      }
      if (embeds.length <= 0) {
        return c.text('ack')
      }
      // https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-messages
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: embeds.map(e => `${e.url}`).join('\n')
        }
      })
    }
  }
  return c.text('ok')
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ msg: 'internal server error' }, 500)
})

async function verifyDiscordRequest(req: HonoRequest, env: Env) {
  const signature = req.header('x-signature-ed25519')
  const timestamp = req.header('x-signature-timestamp')
  const body = await req.text()
  const isValidRequest =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY)
  if (!isValidRequest) {
    return { isValid: false }
  }

  return { interaction: JSON.parse(body), isValid: true }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  }
}
