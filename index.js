const fs = require('fs')
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
const name = interaction.options.getString('name')
const char = findCharacter(db, userId, name)
if (!char) return await saveAndReply('Personaggio non trovato', true)
const now = Date.now()
const DAY = 24 * 60 * 60 * 1000
const last = char.lastDaily ? new Date(char.lastDaily).getTime() : 0
if (now - last < DAY) {
const remainingMs = DAY - (now - last)
const hrs = Math.floor(remainingMs / (1000 * 60 * 60))
const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
return await saveAndReply(`Hai già riscattato il giornaliero, riprova tra ${hrs} ore e ${mins} minuti`, true)
}
const DAILY_AMOUNT = 100
char.balance += DAILY_AMOUNT
char.lastDaily = new Date().toISOString()
saveDb(db)
return await saveAndReply(`Hai ricevuto ${DAILY_AMOUNT} soldi per **${char.name}**
Saldo attuale: ${char.balance}`)
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