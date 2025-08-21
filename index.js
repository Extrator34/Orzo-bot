import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Carica le variabili d’ambiente (in locale, su Render le prende dalle Environment Variables)
dotenv.config();

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
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
});
const Character = mongoose.model("Character", characterSchema);

// ====== BOT DISCORD ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Comandi slash
const commands = [
  {
    name: "createcharacter",
    description: "Crea un nuovo personaggio",
    options: [
      {
        name: "name",
        type: 3, // STRING
        description: "Nome del personaggio",
        required: true,
      },
    ],
  },
  {
    name: "mycharacters",
    description: "Mostra la lista dei tuoi personaggi",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log("🔄 Aggiornamento comandi slash...");
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandi slash registrati");
} catch (err) {
  console.error("❌ Errore registrazione comandi:", err);
}

client.on("ready", () => {
  console.log(`🤖 Loggato come ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "createcharacter") {
    const name = interaction.options.getString("name");

    const newChar = new Character({
      userId: interaction.user.id,
      name,
    });
    await newChar.save();

    await interaction.reply(`✅ Personaggio **${name}** creato!`);
  }

  if (interaction.commandName === "mycharacters") {
    const chars = await Character.find({ userId: interaction.user.id });
    if (chars.length === 0) {
      await interaction.reply("❌ Non hai ancora personaggi.");
    } else {
      const list = chars.map((c) => `- ${c.name} (Lvl ${c.level}, XP ${c.xp})`).join("\n");
      await interaction.reply(`📜 I tuoi personaggi:\n${list}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);


