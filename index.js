// file: package.json
{
  "name": "discord-economy-bot",
  "version": "1.1.0",
  "description": "Semplice bot economia per Discord in Node.js",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.15.3"
  },
  "engines": {
    "node": "20.x"
  }
}

// -----------------------------
// file: index.js
// Bot economia con persistenza su JSON
// Comandi: /create, /daily, /balance, /list, /help
// Compatibile con ESM e Render Web Service (mini server HTTP)

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js'
import fs from 'fs'
import http from 'http'

const token = process.env.DISCORD_TOKEN
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID

if (!token || !clientId) {
  console.log('Imposta DISCORD_TOKEN e CLIENT_ID nelle variabili d\'ambiente')
  process.exit(1)
}

// ---------------- DB JSON ----------------
const DB_FILE = './database.json'
let db = {}

function initDbFile() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '{}', 'utf8')
  }
}

function loadDb() {
  initDbFile()
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    db = raw.trim() ? JSON.parse(raw) : {}
  } catch (e) {
    console.error('Errore nel parsing di database.json, riparto da db vuoto', e)
    db = {}
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
  } catch (e) {
    console.error('Errore nel salvataggio del database', e)
  }
}

loadDb()

// Helpers per personaggi
function ensureUser(userId) {
  if (!db[userId]) db[userId] = { characters: {} }
  return db[userId]
}

function getCharRecord(userId, name) {
  const u = ensureUser(userId)
  const key = name.toLowerCase()
  return u.characters[key]
}

function setCharRecord(userId, name, data) {
  const u = ensureUser(userId)
  const key = name.toLowerCase()
  u.characters[key] = { display: name, balance: 0, lastDaily: 0, ...data }
}

function listChars(userId) {
  const u = ensureUser(userId)
  return Object.values(u.characters)
}

// ---------------- Client Discord ----------------
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('clientReady', c => {
  console.log(`Logged in as ${c.user.tag}`)
})

// ---------------- Comandi Slash ----------------
const commands = [
  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Crea un nuovo personaggio')
    .addStringOption(o => o.setName('name').setDescription('Nome del personaggio').setRequired(true))
    .addIntegerOption(o => o.setName('start').setDescription('Soldi iniziali, default 1000').setRequired(false)),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Riscuoti il bonus giornaliero per TUTTI i tuoi personaggi'),

  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Mostra il saldo di un personaggio')
    .addStringOption(o => o.setName('name').setDescription('Nome del personaggio').setRequired(true)),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('Lista i tuoi personaggi'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra i comandi disponibili')
].map(c => c.toJSON())

const rest = new REST({ version: '10' }).setToken(token)

async function registerCommands() {
  if (guildId) {
    console.log('Registro i comandi nel server', guildId)
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  } else {
    console.log('Registro i comandi globalmente')
    await rest.put(Routes.applicationCommands(clientId), { body: commands })
  }
  console.log('Comandi registrati')
}

// ---------------- Handler interazioni ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const userId = interaction.user.id
  const name = interaction.options.getString('name')
  const cmd = interaction.commandName

  try {
    if (cmd === 'create') {
      const start = interaction.options.getInteger('start') ?? 1000
      if (getCharRecord(userId, name)) return await interaction.reply({ content: 'Hai già un personaggio con questo nome', ephemeral: true })
      setCharRecord(userId, name, { balance: start })
      saveDb()
      return await interaction.reply(`Personaggio **${name}** creato con ${start} soldi`)
    }

    if (cmd === 'daily') {
      const DAY = 24 * 60 * 60 * 1000
      const now = Date.now()
      const chars = listChars(userId)
      if (chars.length === 0) return await interaction.reply({ content: 'Non hai personaggi, crea il primo con /create', ephemeral: true })

      const DAILY_AMOUNT = 100
      const lines = []
      for (const ch of chars) {
        const last = ch.lastDaily || 0
        if (now - last >= DAY) {
          ch.balance += DAILY_AMOUNT
          ch.lastDaily = now
          lines.push(`+${DAILY_AMOUNT} a **${ch.display}** → saldo ${ch.balance}`)
        } else {
          const remain = DAY - (now - last)
          const hrs = Math.floor(remain / 3600000)
          const mins = Math.floor((remain % 3600000) / 60000)
          lines.push(`⏳ **${ch.display}** tra ${hrs}h ${mins}m`)
        }
      }
      saveDb()
      return await interaction.reply(`Daily eseguito\n${lines.join('\n')}`)
    }

    if (cmd === 'balance') {
      const rec = getCharRecord(userId, name)
      if (!rec) return await interaction.reply({ content: 'Personaggio non trovato', ephemeral: true })
      return await interaction.reply(`Saldo di **${rec.display}**: ${rec.balance}`)
    }

    if (cmd === 'list') {
      const chars = listChars(userId)
      if (chars.length === 0) return await interaction.reply({ content: 'Non hai personaggi', ephemeral: true })
      const txt = chars.map(ch => `- ${ch.display}: ${ch.balance}`).join('\n')
      return await interaction.reply(`I tuoi personaggi\n${txt}`)
    }

    if (cmd === 'help') {
      return await interaction.reply(
        'Comandi disponibili:\n' +
        '/create name:<nome> start:<opzionale> — crea un personaggio\n' +
        '/daily — riscuote il bonus per tutti i tuoi personaggi\n' +
        '/balance name:<nome> — mostra il saldo\n' +
        '/list — elenca i tuoi personaggi'
      )
    }

  } catch (e) {
    console.error('Errore handling interaction', e)
    if (!interaction.replied) await interaction.reply({ content: 'Errore interno', ephemeral: true })
  }
})

// ---------------- Mini server HTTP per Render ----------------
const PORT = process.env.PORT || 3000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bot is running')
}).listen(PORT, () => console.log(`Web service attivo su porta ${PORT}`))

// ---------------- Avvio ----------------
await registerCommands()
await client.login(token)
