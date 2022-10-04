import 'dotenv/config';
import { REST, SlashCommandBuilder, Routes } from 'discord.js';
import consola from 'consola';
import { clientId } from './config.json';

import path from 'node:path';
import fs from 'node:fs' ;
import { InteractionFile } from './types';

const commands: SlashCommandBuilder[] = []; // get commands
const deployed: {[index: string]: boolean} = {};

const commandsPath = path.join(__dirname, 'interactions');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const data: InteractionFile = require(path.join(commandsPath, file)).default;
    commands.push(data.builder);
}

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN);

consola.info(`Started refreshing ${commands.length} application commands...`)
rest.put(Routes.applicationCommands(clientId), { body: commands })
    .then(() => {
        consola.success(`Successfully registered ${commands.length} application commands!`);
        for (const value of commands) deployed[value.name] = true;
        fs.writeFile('src/deployed.json', JSON.stringify(deployed), consola.ready);
    })
    .catch(consola.error);