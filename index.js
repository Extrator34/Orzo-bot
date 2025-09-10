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
await mongoose.connect(process.env.MONGO_URI);

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
  hpPerLevel: { type: Number, default: 10},
  level: { type: Number, default: 1 },
  expTotale: { type: Number, default: 0 },
  expMostrata: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Character = mongoose.model("Character", characterSchema);


  // tabella livelli
  const expTable = [
    [0, 1], [2000, 2], [5000, 3], [9000, 4], [14000, 5], [20000, 6],
    [27000, 7], [35000, 8], [44000, 9], [54000, 10], [65000, 11],
    [77000, 12], [90000, 13], [104000, 14], [119000, 15], [135000, 16],
    [152000, 17], [170000, 18], [189000, 19], [209000, 20], [230000, 21],
    [252000, 22], [275000, 23], [299000, 24], [324000, 25], [350000, 26],
    [377000, 27], [405000, 28], [434000, 29], [464000, 30], [495000, 31],
    [527000, 32], [560000, 33], [594000, 34], [629000, 35], [665000, 36],
    [702000, 37], [740000, 38], [779000, 39], [819000, 40], [860000, 41],
    [902000, 42], [945000, 43], [989000, 44], [1034000, 45], [1080000, 46],
    [1127000, 47], [1175000, 48], [1224000, 49], [1274000, 50],
    [1325000, 51], [1377000, 52], [1430000, 53], [1484000, 54],
    [1539000, 55], [1595000, 56], [1652000, 57], [1710000, 58],
    [1769000, 59], [1829000, 60], [1890000, 61], [1952000, 62],
    [2015000, 63], [2079000, 64], [2144000, 65], [2210000, 66],
    [2277000, 67], [2345000, 68], [2414000, 69], [2484000, 70],
    [2555000, 71], [2627000, 72], [2700000, 73], [2774000, 74],
    [2849000, 75], [2925000, 76], [3002000, 77], [3080000, 78],
    [3159000, 79], [3239000, 80], [3320000, 81], [3402000, 82],
    [3485000, 83], [3569000, 84], [3654000, 85], [3740000, 86],
    [3827000, 87], [3915000, 88], [4004000, 89], [4094000, 90],
    [4185000, 91], [4277000, 92], [4370000, 93], [4464000, 94],
    [4559000, 95], [4655000, 96], [4752000, 97], [4850000, 98],
    [4949000, 99], [5049000, 100]
  ];

  const maxExp = 5049000;

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

  {
  name: "rename",
  description: "Rinomina un tuo personaggio",
  options: [
    {
      name: "from_name",
      type: 3, // STRING
      description: "Il tuo personaggio da rinominare",
      required: true,
      autocomplete: true
    },
    {
      name: "name",
      type: 3,
      description: "Nuovo nome del personaggio",
      required: true,
    },
  ],
},

  {
  name: "addexp",
  description: "(ADMIN ONLY) Aggiungi punti esperienza a un personaggio",
  options: [
    {
      name: "to_user",
      type: 6, // USER
      description: "Utente proprietario del personaggio",
      required: true,
    },
    {
      name: "to_name",
      type: 3, // STRING
      description: "Nome del personaggio",
      required: true,
      autocomplete: true
    },
    {
      name: "amount",
      type: 4, // INTEGER
      description: "Quantità di exp da aggiungere",
      required: true,
    },
  ],
},

{
  name: "removeexp",
  description: "(ADMIN ONLY) Rimuovi exp a un personaggio",
  options: [
    {
      name: "to_user",
      type: 6, // USER
      description: "Utente proprietario del personaggio",
      required: true,
    },
    {
      name: "to_name",
      type: 3, // STRING
      description: "Nome del personaggio",
      required: true,
      autocomplete: true
    },
    {
      name: "amount",
      type: 4, // INTEGER
      description: "Quantità di exp da rimuovere",
      required: true,
    },
  ],
}


  {
  name: "sethpmax",
  description: "(ADMIN ONLY) Modifica gli HP massimi di un personaggio",
  options: [
    {
      name: "to_user",
      type: 6, // USER
      description: "Utente proprietario del personaggio",
      required: true,
    },
    {
      name: "to_name",
      type: 3, // STRING
      description: "Nome del personaggio",
      required: true,
      autocomplete: true
    },
    {
      name: "amount",
      type: 4, // INTEGER
      description: "Nuovo valore di HP massimi",
      required: true,
    },
  ],
},
{
  name: "sethpperlevel",
  description: "(ADMIN ONLY) Modifica gli HP guadagnati per livello",
  options: [
    {
      name: "to_user",
      type: 6, // USER
      description: "Utente proprietario del personaggio",
      required: true,
    },
    {
      name: "to_name",
      type: 3, // STRING
      description: "Nome del personaggio",
      required: true,
      autocomplete: true
    },
    {
      name: "amount",
      type: 4, // INTEGER
      description: "Nuovo valore di HP per livello",
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

client.on("clientReady", () => {
  console.log(`🤖 Loggato come ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
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

  await interaction.respond(choices.slice(0, 25).length ? choices.slice(0, 25) : [{ name: "Nessun risultato", value: "none" }]);
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
  await interaction.deferReply(); // <-- così non scade

  const chars = await Character.find({ userId: interaction.user.id });

  if (chars.length === 0) {
    return await interaction.editReply("❌ Non hai ancora personaggi.");
  }

  const list = chars
    .map((c) => {
      const entry = [...expTable].reverse().find(([expReq]) => c.expTotale >= expReq);
      const livello = entry ? entry[1] : 1;
      const expBase = entry ? entry[0] : 0;
      const nextExp = expTable.find(([_, lvl]) => lvl === livello + 1)?.[0] ?? "—";
      const expMostrata = c.expTotale - expBase;

      return `- ${c.name} 
  Livello: ${livello}
  Soldi: ${c.money}💰
  Exp: ${expMostrata} / ${nextExp - expBase}
  
  -----------------------------`;
    })
    .join("\n");

  await interaction.editReply(`📜 I tuoi personaggi:\n${list}`);
}



  if (interaction.commandName === "addmoney") {
    await interaction.deferReply();
    
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return await interaction.editReply("❌ Non hai il permesso per usare questo comando.");
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

    await interaction.editReply(
    `💰 Aggiunti **${amount}** soldi al personaggio **${character.name}** di ${user.username}. Totale: ${character.money}💰`
  );
}

  if (interaction.commandName === "pay") {
    const fromName = interaction.options.getString("from_name");
    const toUser = interaction.options.getUser("to_user");
    const toName = interaction.options.getString("to_name");
    const amount = interaction.options.getInteger("amount");

      // controllo su importo
  if (amount <= 0) {
    await interaction.reply("❌ L'importo deve essere un numero positivo maggiore di zero.");
    return;
  }

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

 if (interaction.commandName === "rename") {
  await interaction.deferReply(); // ti dà tempo extra

  const fromName = interaction.options.getString("from_name");
  const newName = interaction.options.getString("name");

  // trova personaggio
  const char = await Character.findOne({ userId: interaction.user.id, name: fromName });
  if (!char) {
    await interaction.editReply(`❌ Non hai nessun personaggio chiamato **${fromName}**.`);
    return;
  }

  // aggiorna nome
  char.name = newName;
  await char.save();

  await interaction.editReply(
    `✏️ Il tuo personaggio **${fromName}** è stato rinominato in **${newName}** ✅`
  );
}


  if (interaction.commandName === "addexp") {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply("❌ Non hai il permesso per usare questo comando.");
      return;
    }
  const user = interaction.options.getUser("to_user");
  const name = interaction.options.getString("to_name");
  const amount = interaction.options.getInteger("amount");

  if (amount <= 0) {
    await interaction.reply("❌ L'esperienza deve essere un numero positivo maggiore di zero.");
    return;
  }

  const char = await Character.findOne({ userId: user.id, name });
  if (!char) {
    await interaction.reply(`❌ Personaggio **${name}** non trovato per ${user.username}.`);
    return;
  }



  // aggiunge exp
  char.expTotale += amount;
  if (char.expTotale > maxExp) char.expTotale = maxExp;

  // calcolo nuovo livello
  let newLevel = 1;
  for (let i = expTable.length - 1; i >= 0; i--) {
    if (char.expTotale >= expTable[i][0]) {
      newLevel = expTable[i][1];
      char.expMostrata = char.expTotale - expTable[i][0];
      break;
    }
  }

  const oldLevel = char.level;
  char.level = newLevel;
  await char.save();

  if (newLevel > oldLevel) {
    const diff = newLevel - oldLevel;
    char.hpMax += diff * char.hpPerLevel;
    await char.save();
    
    await interaction.reply(
      `🎉 Congratulazioni! **${char.name}** è salito al livello **${newLevel}**!\n` +
      `Exp attuale: ${char.expMostrata} / prossimo livello`
    );
       

    
    
  } else {
    await char.save();
    await interaction.reply(
      `✅ Aggiunti **${amount} exp** a **${char.name}**.\n` +
      `Livello attuale: ${char.level} | Exp: ${char.expMostrata}`
    );
  }
}


  if (interaction.commandName === "removeexp") {
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    await interaction.reply("❌ Non hai il permesso per usare questo comando.");
    return;
  }

  const user = interaction.options.getUser("to_user");
  const name = interaction.options.getString("to_name");
  const amount = interaction.options.getInteger("amount");

  if (amount <= 0) {
    await interaction.reply("❌ Devi inserire un numero positivo di exp da rimuovere.");
    return;
  }

  const character = await Character.findOne({ userId: user.id, name });
  if (!character) {
    await interaction.reply(`❌ Personaggio **${name}** non trovato per ${user.username}.`);
    return;
  }

  // Rimuovi exp senza scendere sotto 0
  character.expTotale = Math.max(0, character.expTotale - amount);

  // Ricalcola livello e expMostrata
  const entry = [...expTable].reverse().find(([expReq]) => character.expTotale >= expReq);
  const livello = entry ? entry[1] : 1;
  const expBase = entry ? entry[0] : 0;
  const nextExp = expTable.find(([_, lvl]) => lvl === livello + 1)?.[0] ?? "—";
  const expMostrata = character.expTotale - expBase;

  const oldLevel = character.level;
  character.level = livello;
  character.expMostrata = expMostrata;

  if (livello < oldLevel) {
    const diff = oldLevel - livello;
    character.hpMax = Math.max(1, character.hpMax - diff * character.hpPerLevel);
  }
    
  await character.save();

  await interaction.reply(
    `📉 Rimossi **${amount} exp** da **${character.name}** di ${user.username}.\n` +
    `Livello attuale: ${livello}\n` +
    `Exp: ${expMostrata} / ${nextExp - expBase}`
  );
}

   } catch (err) {
    console.error("❌ Errore in interactionCreate:", err);

    // tenta di inviare un messaggio all’utente se possibile
    if (interaction.isRepliable()) {
      try {
        await interaction.reply("⚠️ Errore interno, riprova più tardi.");
      } catch {}
    }
  }

});

client.login(process.env.DISCORD_TOKEN);






























