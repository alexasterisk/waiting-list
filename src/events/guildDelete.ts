import consola from 'consola';
import { Guild } from 'discord.js';
import { ExtendedClient } from '../types';

export default {
    name: 'guildDelete',

    async run (client: ExtendedClient, guild: Guild) {
        consola.warn(`Icymx has either been removed from ${guild.name} [${guild.id}] or the server got deleted`);
        await client.keyv?.delete(guild.id + 'waiting_vc');
        await client.keyv?.delete(guild.id + 'main_vc');
        await client.keyv?.delete(guild.id + 'upd_chnl');
        await client.keyv?.delete(guild.id + 'queue');
        await client.keyv?.delete(guild.id + 'setup');

        const currentGuilds = (await client.keyv?.get('guilds') as string ?? '').split('|');
        currentGuilds[currentGuilds.findIndex(s => s === guild.id)] == null;
        await client.keyv?.set('guilds', currentGuilds.join('|'));
        consola.success(`Successfully wiped all data for ${guild.name} [${guild.id}]`);
    }
}