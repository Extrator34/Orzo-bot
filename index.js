// index.js

import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} from "discord.js"
import fs from "fs"
import http from "http"

// === Variabili ambiente ===
const token = process.env.DISCORD_TOKEN
const clientId = process.env.CLIENT_ID

// === Database (JSON) ===
const DB_FILE = "./database.json"
let db = {}

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8")
    db = raw.trim() ? JSON.parse(raw) : {}
  } catch (err) {
    console.error("❌ Errore nel leggere database.json:", err)
    db = {}
  }
} else {
  fs.writeFileSync(DB_FILE, "{}", "utf8")
}



// === Setup bot ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.on("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`)
})

// === Comandi ===
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Risponde con Pong!"),
  
  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Ottieni la ricompensa giornaliera per i tuoi personaggi")
].map(cmd => cmd.toJSON())

// Registra i comandi globali
const rest = new REST({ version: "10" }).setToken(token)

async function registerCommands() {
  try {
    console.log("📦 Registro i comandi globalmente...")
    await rest.put(Routes.applicationCommands(clientId), { body: commands })
    console.log("✅ Comandi registrati")
  } catch (error) {
    console.error("❌ Errore registrazione comandi:", error)
  }
}

registerCommands()

// === Gestione interazioni ===
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName, user } = interaction

  if (commandName === "ping") {
    await interaction.reply("Pong!")
  }

  if (commandName === "daily") {
    const userId = user.id

    if (!db[userId]) {
      db[userId] = { characters: {} }
    }

    // Esempio: aggiungi 100 monete a TUTTI i personaggi del giocatore
    const chars = db[userId].characters
    if (Object.keys(chars).length === 0) {
      chars["personaggio1"] = { coins: 0 }
    }

    for (const charName in chars) {
      chars[charName].coins += 100
    }

    saveDb()

    await interaction.reply(`💰 Hai ricevuto 100 monete per ciascun personaggio!`)
  }
})

// === HTTP server per Render (keep-alive) ===
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Bot is running\n")
}).listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server attivo")
})

// === Avvia il bot ===
client.login(token)


