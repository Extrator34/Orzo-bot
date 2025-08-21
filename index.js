import { Client, GatewayIntentBits, REST, Routes } from "discord.js"
import mongoose from "mongoose"

// ---- CONNESSIONE A MONGO ----
await mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

console.log("MONGO_URI:", process.env.MONGO_URI ? "Trovata ✅" : "Mancante ❌");

// ---- SCHEMA PERSONAGGIO ----
const characterSchema = new mongoose.Schema({
  ownerId: String,
  name: String,
  money: { type: Number, default: 100 },
})

const Character = mongoose.model("Character", characterSchema)

// ---- DISCORD CLIENT ----
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

// ---- COMANDI ----
const commands = [
  {
    name: "crea",
    description: "Crea un nuovo personaggio",
    options: [
      {
        type: 3,
        name: "nome",
        description: "Nome del personaggio",
        required: true,
      },
    ],
  },
  {
    name: "lista",
    description: "Mostra la lista dei tuoi personaggi",
  },
  {
    name: "daily",
    description: "Riscuoti la ricompensa giornaliera per tutti i tuoi personaggi",
  },
]

// ---- REGISTRAZIONE COMANDI ----
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    )
    console.log("✅ Comandi registrati")
  } catch (error) {
    console.error(error)
  }
}

// ---- EVENTO READY ----
client.once("ready", () => {
  console.log(`🤖 Loggato come ${client.user.tag}`)
  registerCommands()
})

// ---- HANDLER COMANDI ----
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === "crea") {
      const nome = interaction.options.getString("nome")
      const nuovo = new Character({
        ownerId: interaction.user.id,
        name: nome,
        money: 100,
      })
      await nuovo.save()
      await interaction.reply({
        content: `✅ Personaggio **${nome}** creato con 100 monete iniziali`,
        ephemeral: true,
      })
    }

    if (interaction.commandName === "lista") {
      const personaggi = await Character.find({ ownerId: interaction.user.id })
      if (personaggi.length === 0) {
        return interaction.reply({
          content: "Non hai ancora personaggi!",
          ephemeral: true,
        })
      }
      const lista = personaggi
        .map((p) => `• ${p.name} — ${p.money} monete`)
        .join("\n")
      await interaction.reply({
        content: `📜 I tuoi personaggi:\n${lista}`,
        ephemeral: true,
      })
    }

    if (interaction.commandName === "daily") {
      const personaggi = await Character.find({ ownerId: interaction.user.id })
      if (personaggi.length === 0) {
        return interaction.reply({
          content: "Non hai personaggi da premiare!",
          ephemeral: true,
        })
      }
      for (const p of personaggi) {
        p.money += 50
        await p.save()
      }
      await interaction.reply({
        content: `💰 Hai ricevuto 50 monete per ciascun personaggio (${personaggi.length} totali)!`,
        ephemeral: true,
      })
    }
  } catch (err) {
    console.error("Errore comando:", err)
    if (!interaction.replied) {
      await interaction.reply({
        content: "⚠️ Errore interno",
        ephemeral: true,
      })
    }
  }
})

// ---- LOGIN ----
client.login(process.env.DISCORD_TOKEN)

