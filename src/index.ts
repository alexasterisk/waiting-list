import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import consola from 'consola';
import Keyv from 'keyv';

import path from 'node:path';
import fs from 'node:fs';

import deployedCommands from './deployed.json';
import { InteractionFile, EventFile, ExtendedClient } from './types';

// setup discord
const client: ExtendedClient = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
]});

client.interactions = new Collection<string, InteractionFile>();
client.keyv = new Keyv('sqlite://./data.sqlite');

// handle errors
client.on('error', err => consola.error('Uncaught error occurred:', err));
client.keyv.on('error', err => consola.error('Keyv connection error:', err));

// destroy old queue
(async () => {
    consola.info('Destroying cached queues...');

    const currentGuilds: string[] = (await client.keyv.get('guilds') as string || '').split('|');

    consola.info(`There are a total of ${currentGuilds.length} cached guilds;`);
    consola.info('Starting cleaning queues...');
    for (const guild of currentGuilds) {
        consola.success(`Cleared the cache of ${guild} that was ${await client.keyv.get(guild + 'queue')}`);
        client.keyv.set(guild + 'queue', '-');
    }

    consola.success('Finished clearing old caches!');
})();

// setup commands

consola.info('Starting to load interactions...');
const commandsPath = path.join(__dirname, 'interactions');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

consola.info(`There are a total of ${commandFiles.length} interactions listed`);
for (const file of commandFiles) {
    const data: InteractionFile = require(path.join(commandsPath, file)).default;
    if (deployedCommands[data.name]) {
        client.interactions?.set(data.name, data);
        consola.success(`Added ${data.name} to the interactions as it has been deployed`);
    }
    else consola.warn(data.name + ' has not been deployed yet and will be ignored!');
}

consola.success('Finished loading interactions!');

// setup events

consola.info('Starting to load events...');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

consola.info(`There are a total of ${eventFiles.length} events listed`);
for (const file of eventFiles) {
    const data: EventFile = require(path.join(eventsPath, file)).default;
    client[data.once ? 'once' : 'on'](data.name, (...args) => data.run(client, ...args));
    consola.success(`Started listening to the event ${data.name}`);
}

consola.success('Finished loading events!');

// and login
client.login(process.env.CLIENT_TOKEN)
    .then(() => consola.ready('Icymx has been logged in!'))
    .catch(consola.error);