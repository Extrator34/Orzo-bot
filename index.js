import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import mongoose from "mongoose";
import Player from "./models/Player.js";

// ✅ Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connesso a MongoDB"))
  .catch(err => console.error("❌ Errore connessione MongoDB:", err));

// ✅ Setup client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ✅ Definizione comandi
const commands = [
  new SlashCommandBuilder()
    .setName("create-character")
    .setDescription("Crea un nuovo personaggio")
    .addStringOption(opt =>
      opt.setName("nome")
         .setDescription("Nome del personaggio")
         .setRequired(true)),

  new SlashCommandBuilder()
    .setName("list-characters")
    .setDescription("Mostra i tuoi personaggi"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Ricevi la ricompensa giornaliera")
].map(cmd => cmd.toJSON());

// ✅ Registrazione comandi su Discord
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registrazione comandi...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandi registrati");
  } catch (err) {
    console.error("❌ Errore registrazione comandi:", err);
  }
})();

// ✅ Gestione eventi
client.once("ready", () => {
  console.log(`🤖 Bot connesso come ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "create-character") {
    const name = interaction.options.getString("nome");
    const userId = interaction.user.id;

    let player = await Player.findOne({ userId });
    if (!player) {
      player = new Player({ userId, characters: [] });
    }

    player.characters.push({ name, money: 0 });
    await player.save();

    await interaction.reply(`✅ Personaggio **${name}** creato con successo!`);
  }

  else if (commandName === "list-characters") {
    const userId = interaction.user.id;
    const player = await Player.findOne({ userId });

    if (!player || player.characters.length === 0) {
      await interaction.reply("❌ Non hai ancora personaggi.");
      return;
    }

    const lista = player.characters
      .map(c => `👤 ${c.name} - 💰 ${c.money}`)
      .join("\n");

    await interaction.reply(`📜 I tuoi personaggi:\n${lista}`);
  }

  else if (commandName === "daily") {
    const userId = interaction.user.id;
    const reward = 100;

    const player = await Player.findOne({ userId });
    if (!player) {
      await interaction.reply("❌ Non hai personaggi, creane uno prima!");
      return;
    }

    player.characters.forEach(c => c.money += reward);
    await player.save();

    await interaction.reply(`💰 Hai ricevuto ${reward} per ogni personaggio!`);
  }
});

// ✅ Login bot
client.login(process.env.DISCORD_TOKEN);
