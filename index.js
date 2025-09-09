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
const ADMIN_ROLE_ID = "783454797445464076";

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
    description: "(ADMIN ONLY) Aggiungi soldi a un personaggio",
    options: [
      {
        name: "to_user",
        type: 6, // USER
        description: "Utente proprietario del personaggio",
        required: true,
      },
      {
        name: "to_name",
        type: 3,
        description: "Nome del personaggio",
        required: true,
        autocomplete: true
      },
      {
        name: "amount",
        type: 4,
        description: "Quantità di soldi da aggiungere",
        required: true,
      },
    ],
  },
{
  name: "pay",
  description: "Paga un altro personaggio",
  options: [
    {
      name: "from_name",
      type: 3, // STRING
      description: "Il tuo personaggio che paga",
      required: true,
      autocomplete: true
    },
    {
      name: "to_user",
      type: 6, // USER
      description: "Utente che possiede il pg",
      required: true,
    },
    {
      name: "to_name",
      type: 3, // STRING
      description: "Personaggio che riceve il denaro",
      required: true,
      autocomplete: true
    },
    {
      name: "amount",
      type: 4, // INTEGER
      description: "Quantità di soldi da trasferire",
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

  if (interaction.isAutocomplete()) {
  const focused = interaction.options.getFocused(true);
  let choices = [];

  if (focused.name === "from_name") {
    const chars = await Character.find({ userId: interaction.user.id });
    choices = chars.map(c => ({
      name: `${c.name}`,
      value: c.name
    }));
  }

  if (focused.name === "to_name") {
    const toOption = interaction.options.get("to_user");
    const toUserId = toOption?.value;

    if (!toUserId) {
      // Se non hai scelto ancora l'utente
      choices = [{ name: "Seleziona prima l'utente", value: "none" }];
    } else {
      const chars = await Character.find({ userId: toUserId });
      choices = chars.length
        ? chars.map(c => ({ name: `${c.name}`, value: c.name }))
        : [{ name: "Nessun personaggio trovato", value: "none" }];
    }
  }

  await interaction.respond(choices.slice(0, 25));
  return;
}

  
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
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply("❌ Non hai il permesso per usare questo comando.");
      return;
    }

    const user = interaction.options.getUser("to_user");
    const name = interaction.options.getString("to_name");
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

  if (interaction.commandName === "pay") {
    const fromName = interaction.options.getString("from_name");
    const toUser = interaction.options.getUser("to_user");
    const toName = interaction.options.getString("to_name");
    const amount = interaction.options.getInteger("amount");

    // trova personaggio mittente
    const fromChar = await Character.findOne({ userId: interaction.user.id, name: fromName });
    if (!fromChar) {
      await interaction.reply(`❌ Non hai nessun personaggio chiamato **${fromName}**.`);
      return;
    }

    if (fromChar.money < amount) {
      await interaction.reply(`❌ Il personaggio **${fromChar.name}** non ha abbastanza soldi (ha ${fromChar.money}💰).`);
      return;
    }

    // trova personaggio destinatario
    const toChar = await Character.findOne({ userId: toUser.id, name: toName });
    if (!toChar) {
      await interaction.reply(`❌ Il personaggio **${toName}** non è stato trovato per ${toUser.username}.`);
      return;
    }

    // trasferisci soldi
    fromChar.money -= amount;
    toChar.money += amount;

    await fromChar.save();
    await toChar.save();

    await interaction.reply(
      `✅ **${fromChar.name}** ha pagato **${amount}💰** a **${toChar.name}** (${toUser.username}).\n` +
      `Saldo aggiornato: ${fromChar.name} → ${fromChar.money}💰 | ${toChar.name} → ${toChar.money}💰`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);







