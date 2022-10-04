import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../types';

const randomPhrases = [
    'some dumb bot made by alex*',
    'if im broken i blame you (not really - message alex*#3149)',
    `${Math.floor(Math.random() * 31)} days until ${2020 + Math.floor(Math.random() * 15)}`,
    'whats your favorite color? i like super lime.',
    'cats r cool & better than dogs',
    'yummy',
    'i was a bird, now im a bot.',
    'its lonely in this box of photons',
    'Wie gehts? i can speak french!',
    'DID YOU KNOW? I didn\'t ask',
    'BREAKING: this bot is used by a total of negative 12 people',
    'i was a waiting list, now im a waiting list.',
    `i consume ${Math.floor(Math.random() * 24)}megawatts a day; hbu?`,
    'i contemplate my life.. wait a second!',
    'run /queue again I dare you',
    'guess what',
    'theres 365 days in a year but i didnt need to know that',
    'want to see me do sign language?',
    'when i think',
    'i express myself in body language',
    'i was made for a different server, now im in this filthy place',
    'i hate you never talk to me again',
    'angy rn',
    'Can we get food now? It\'s been years.',
    ':)',
    'jorbeck is the killer'
]

export default {
    name: 'queue',

    builder: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Gets the current queue and returns it')
        .setDMPermission(false),

    async run (client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const { guild } = interaction;

        await interaction.deferReply();

        let queue = ((await client.keyv?.get(guild.id + 'queue') as string) ?? '').split('/');
        queue = queue.filter(v => v !== '-');
        queue = queue.filter(v => v !== '');
        let desc = '';

        if (queue.length === 0 || queue[0] === '') desc = 'No one currently in queue!';
        else queue.forEach((userId, index) => desc += `**${index + 1}.** <@${userId}>\n`);

        const embed = new EmbedBuilder()
            .setTitle('Current Queue')
            .setDescription(desc)
            .setColor('Random')
            .setFooter({ text: randomPhrases[Math.floor(Math.random() * randomPhrases.length)]})
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}