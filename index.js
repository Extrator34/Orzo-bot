import http from "http";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ====== SERVER FINTIZIO PER RENDER ======
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot Discord attivo ✅");
});
server.listen(PORT, () => {
  console.log(`🌐 Server web fittizio in ascolto su porta ${PORT}`);
});

// ====== DEBUG VARIABILI ======
console.log("🔎 Variabili lette:");
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✔️ trovata" : "❌ mancante");
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "✔️ trovata" : "❌ mancante");
console.log("GUILD_ID:", process.env.GUILD_ID ? "✔️ trovata" : "❌ mancante");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✔️ trovata" : "❌ mancante");

if (!process.env.MONGO_URI) {
  console.error("❌ ERRORE: Variabile MONGO_URI non trovata. Controlla le Environment su Render!");
  process.exit(1);
}

// ====== CONNESSIONE A MONGO ======
try {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ Connesso a MongoDB");
} catch (err) {
  console.error("❌ Errore connessione Mongo:", err);
  process.exit(1);
}

// ====== SCHEMA PERSONAGGIO ======
const characterSchema = new mongoose.Schema({
  userId: String,
  name: String,
  money: { type: Number, default: 500 },
  karma: { type: Number, default: 0 },
  hpMax: { type: Number, default: 500 },
  level: { type: Number, default: 1 },
  expTotale: { type: Number, default: 0 },
  expMostrata: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Character = mongoose.model("Character", characterSchema);

// ====== BOT DISCORD ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ID del ruolo richiesto per usare /addmoney
const ADMIN_ROLE_ID = "123456789012345678"; // <-- sostituisci con il tuo

// ====== COMANDI SLASH ======
const commands = [
  {
    name: "create",
    description: "Crea un nuovo personaggio",
    options: [
      {
        name: "name",
        type: 3,
        description: "Nome del personaggio",
        required: true,
      },
    ],
  },
  {
    name: "list",
    description: "Mostra la lista dei tuoi personaggi",
  },
  {
    name: "addmoney",
    description: "Aggiungi soldi a un personaggio",
    options: [
      {
        name: "user",
        type: 6, // USER
        description: "Utente proprietario del personaggio",
        required: true,
      },
      {
        name: "name",
        type: 3, // STRING
        description: "Nome del personaggio",
        required: true,
      },
      {
        name: "amount",
        type: 4, // INTEGER
        description: "Quantità di soldi da aggiungere",
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log("🔄 Aggiornamento comandi slash (guild)...");
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandi slash registrati nella guild");
} catch (err) {
  console.error("❌ Errore registrazione comandi:", err);
}

client.on("ready", () => {
  console.log(`🤖 Loggato come ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "create") {
    const name = interaction.options.getString("name");
    const newChar = new Character({ userId: interaction.user.id, name });
    await newChar.save();
    await interaction.reply(`✅ Personaggio **${name}** creato!`);
  }

  if (interaction.commandName === "list") {
    const chars = await Character.find({ userId: interaction.user.id });
    if (chars.length === 0) {
      await interaction.reply("❌ Non hai ancora personaggi.");
    } else {
      const list = chars
        .map(
          (c) => `- ${c.name} 
  Livello: ${c.level}
  Soldi: ${c.money}💰
  Exp per il prossimo livello: TODO
  -----------------------------`
        )
        .join("\n");
      await interaction.reply(`📜 I tuoi personaggi:\n${list}`);
    }
  }

  if (interaction.commandName === "addmoney") {
    // Controllo ruolo
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply("❌ Non hai il permesso per usare questo comando.");
      return;
    }

    const user = interaction.options.getUser("user");
    const name = interaction.options.getString("name");
    const amount = interaction.options.getInteger("amount");

    const character = await Character.findOne({ userId: user.id, name });
    if (!character) {
      await interaction.reply(`❌ Personaggio **${name}** non trovato per ${user.username}.`);
      return;
    }

    character.money += amount;
    await character.save();

    await interaction.reply(
      `💰 Aggiunti **${amount}** soldi al personaggio **${character.name}** di ${user.username}. Totale: ${character.money}💰`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
