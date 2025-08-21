import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"
import fs from "fs"

// === CONFIG ===
const token = process.env.DISCORD_TOKEN
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID
const DB_FILE = "./database.json"


const http = require('http')

const PORT = process.env.PORT || 3000

// Mini server che risponde a Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bot is running!')
}).listen(PORT, () => {
  console.log(`Web service attivo su porta ${PORT}`)
})


// === DATABASE IN MEMORIA ===
let db = {}

// Carica dal file se esiste
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE))
  } catch (err) {
    console.error("Errore nel leggere il database.json:", err)
    db = {}
  }
}

// Funzione per salvare sul file
function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

// === BOT CLIENT ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// === COMANDI ===
const commands = [
  new SlashCommandBuilder()
    .setName("create")
    .setDescription("Crea un nuovo personaggio")
    .addStringOption(opt => opt.setName("name").setDescription("Nome del personaggio").setRequired(true))
    .addIntegerOption(opt => opt.setName("start").setDescription("Soldi iniziali").setRequired(false)),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Riscatta i soldi giornalieri per TUTTI i tuoi personaggi"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Mostra i soldi di un personaggio")
    .addStringOption(opt => opt.setName("name").setDescription("Nome del personaggio").setRequired(true)),

  new SlashCommandBuilder()
    .setName("list")
    .setDescription("Mostra tutti i tuoi personaggi")
].map(cmd => cmd.toJSON())

// === REGISTRA I COMANDI ===
const rest = new REST({ version: "10" }).setToken(token)

async function registerCommands() {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    console.log("Comandi registrati nel server")
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands })
    console.log("Comandi registrati globalmente")
  }
}

// === BOT EVENTS ===
client.once("clientReady", c => {
  console.log(`✅ Logged in as ${c.user.tag}`)
})

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction
  const userId = interaction.user.id

  // Inizializza se l’utente non ha ancora personaggi
  if (!db[userId]) db[userId] = {}

  if (commandName === "create") {
    const name = interaction.options.getString("name")
    const start = interaction.options.getInteger("start") ?? 1000

    if (db[userId][name]) {
      await interaction.reply("⚠️ Hai già un personaggio con questo nome.")
      return
    }

    db[userId][name] = { money: start, lastDaily: 0 }
    saveDb()

    await interaction.reply(`✅ Personaggio **${name}** creato con ${start} soldi.`)

  } else if (commandName === "daily") {
    const now = Date.now()
    let reply = "💰 **Daily Rewards:**\n"

    let hasCharacters = false
    for (const [name, pg] of Object.entries(db[userId])) {
      hasCharacters = true
      if (now - pg.lastDaily >= 24 * 60 * 60 * 1000) {
        pg.money += 100
        pg.lastDaily = now
        reply += `+100 a **${name}** → Totale: ${pg.money}\n`
      } else {
        reply += `❌ **${name}** ha già riscosso oggi\n`
      }
    }

    if (!hasCharacters) {
      reply = "⚠️ Non hai personaggi! Crea un pg con `/create`."
    } else {
      saveDb()
    }

    await interaction.reply(reply)

  } else if (commandName === "balance") {
    const name = interaction.options.getString("name")
    const pg = db[userId][name]
    if (!pg) {
      await interaction.reply("⚠️ Personaggio non trovato.")
      return
    }
    await interaction.reply(`💵 **${name}** ha ${pg.money} soldi.`)

  } else if (commandName === "list") {
    const chars = Object.entries(db[userId])
    if (chars.length === 0) {
      await interaction.reply("⚠️ Non hai personaggi!")
      return
    }
    let reply = "📜 I tuoi personaggi:\n"
    for (const [name, pg] of chars) {
      reply += `- **${name}**: ${pg.money} soldi\n`
    }
    await interaction.reply(reply)
  }
})

// === START ===
await registerCommands()
client.login(token)

