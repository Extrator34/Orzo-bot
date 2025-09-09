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
  karma: {type: Number, default: 0},
  hpMax: {type: Number, default: 500 },
  level: {type: Number, default: 1},
  expTotale: {type: Number, default: 0},
  expMostrata: {type: Number, default: 0},
  
  
});
const Character = mongoose.model("Character", characterSchema);

// ====== BOT DISCORD ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Comandi slash
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
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {

  // 🔄 Registra solo i comandi nella guild
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
      const list = chars.map((c) => `- ${c.name} 
      Livello: ${c.level}
      Exp per il prossimo livello: TODO
      -----------------------------`).join("\n");
      await interaction.reply(`📜 I tuoi personaggi:\n${list}`);
    }
  }

});

client.login(process.env.DISCORD_TOKEN);


