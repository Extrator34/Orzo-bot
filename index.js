const fs = require('fs')
const path = require('path')
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js')

const token = process.env.DISCORD_TOKEN
  
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID

const http = require('http')

const PORT = process.env.PORT || 3000

// Mini server che risponde a Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bot is running!')
}).listen(PORT, () => {
  console.log(`Web service attivo su porta ${PORT}`)
})


if (!token || !clientId) {
  console.log('Imposta le variabili d\'ambiente DISCORD_TOKEN e CLIENT_ID prima di avviare il bot')
  process.exit(1)
}

const commands = [
  {
    name: 'create',
    description: 'Crea un personaggio con soldi iniziali',
    options: [
      { name: 'name', type: 3, description: 'Nome del personaggio', required: true },
      { name: 'start', type: 4, description: 'Soldi iniziali (default 1000)', required: false }
    ]
  },
  {
    name: 'daily',
    description: 'Riscuoti il bonus giornaliero per tutti i tuoi personaggi'
  },
  {
    name: 'balance',
    description: 'Mostra il saldo di un personaggio',
    options: [ { name: 'name', type: 3, description: 'Nome del personaggio', required: true } ]
  },
  {
    name: 'list',
    description: 'Lista i tuoi personaggi'
  }
]

const rest = new REST({ version: '10' }).setToken(token)

async function registerCommands() {
  try {
    if (guildId) {
      console.log('Registro i comandi per il guild id', guildId)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    } else {
      console.log('Registro i comandi globalmente (ci possono volere alcuni minuti a propagarsi)')
      await rest.put(Routes.applicationCommands(clientId), { body: commands })
    }
    console.log('Comandi registrati')
  } catch (e) {
    console.error('Errore registrazione comandi', e)
    process.exit(1)
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const DB_PATH = path.join(__dirname, 'data.json')

function loadDb() {
  if (!fs.existsSync(DB_PATH)) return {}
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Errore leggendo data.json, uso db vuoto', e)
    return {}
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

function findCharacter(db, userId, name) {
  const list = db[userId] || []
  return list.find(c => c.name.toLowerCase() === name.toLowerCase())
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return
  const db = loadDb()
  const userId = interaction.user.id
  if (!db[userId]) db[userId] = []
  const saveAndReply = (content, ephemeral = false) => interaction.reply({ content, ephemeral })

  try {
    if (interaction.commandName === 'create') {
      const name = interaction.options.getString('name')
      const start = interaction.options.getInteger('start') || 1000
      if (findCharacter(db, userId, name)) return await saveAndReply('Hai già un personaggio con questo nome', true)
      db[userId].push({ name, balance: start, lastDaily: null })
      saveDb(db)
      return await saveAndReply(`Personaggio **${name}** creato con ${start} soldi`)
    }

   if (interaction.commandName === 'daily') {
const userId = interaction.user.id
const characters = db[userId]


if (!characters || Object.keys(characters).length === 0) {
await interaction.reply('Non hai ancora personaggi! Usa `/create` per crearne uno.')
return
}


const now = Date.now()
let totalEarned = 0
const DAILY_AMOUNT = 100
const messages = []


for (const [name, char] of Object.entries(characters)) {
if (!char.lastDaily || now - char.lastDaily >= 24 * 60 * 60 * 1000) {
char.money += DAILY_AMOUNT
char.lastDaily = now
totalEarned += DAILY_AMOUNT
messages.push(`${name} ha ricevuto ${DAILY_AMOUNT} monete. Totale: ${char.money}`)
} else {
const remaining = 24 * 60 * 60 * 1000 - (now - char.lastDaily)
const hours = Math.floor(remaining / (1000 * 60 * 60))
const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
messages.push(`${name} deve aspettare ancora ${hours}h ${minutes}m per riscattare di nuovo.`)
}
}


saveDb()
await interaction.reply(messages.join('\n'))
}

    if (interaction.commandName === 'balance') {
      const name = interaction.options.getString('name')
      const char = findCharacter(db, userId, name)
      if (!char) return await saveAndReply('Personaggio non trovato', true)
      return await saveAndReply(`Saldo di **${char.name}**: ${char.balance}`)
    }

    if (interaction.commandName === 'list') {
      const list = db[userId] || []
      if (list.length === 0) return await saveAndReply('Non hai personaggi', true)
      const lines = list.map(c => `- ${c.name}: ${c.balance}`)
      return await saveAndReply(`I tuoi personaggi:\n${lines.join('\n')}`)
    }

    await saveAndReply('Comando non gestito', true)
  } catch (e) {
    console.error('Errore handling interaction', e)
    if (!interaction.replied) await interaction.reply({ content: 'Errore interno', ephemeral: true })
  }
})

async function main() {
  await registerCommands()
  await client.login(token)
}

main()

// -----------------------------
// Nota semplice su come usare
// 1) crea un bot su Discord Developer Portal
// 2) imposta DISCORD_TOKEN e CLIENT_ID come variabili d'ambiente
// 3) (opzionale) imposta GUILD_ID per registrare i comandi solo in un server di test
// 4) npm install
// 5) npm start

// il file data.json verrà creato nella stessa cartella e conterrà i personaggi






