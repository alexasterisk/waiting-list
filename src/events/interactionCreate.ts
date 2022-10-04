import { BaseInteraction } from 'discord.js';
import { ExtendedClient } from '../types';

export default {
    name: 'interactionCreate',

    run (client: ExtendedClient, interaction: BaseInteraction) {
        if (!interaction.isChatInputCommand()) return; // ignore everything else for now
        const data = client.interactions?.get(interaction.commandName);
        if (!data.builder.dm_permission && !interaction.inGuild()) return; // only allow it to be ran in a guild if it says so

        data.run(client, interaction);
    }
}