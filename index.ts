import 'dotenv/config';
import { ActivityType, Client, EmbedBuilder, GatewayIntentBits, Guild, TextBasedChannel, User, VoiceBasedChannel } from 'discord.js';
import consola from 'consola';
import Keyv from 'keyv';

// setup discord
const client = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
]});
const keyv = new Keyv('sqlite://./data.sqlite');

// handle errors
client.on('error', err => consola.error('Uncaught error occurred:', err));
keyv.on('error', err => consola.error('Keyv connection error:', err));

// handle events
client.on('ready', () => {
    consola.ready('Waiting List is ready!');
    client.user?.setActivity('the waiting game', { type: ActivityType.Competing });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild()) return;
    const { commandName, guild, user, options } = interaction;

    if (!guild) return;

    await interaction.deferReply();

    switch (commandName) {
        case 'setup':
            const waitingVC = options.getChannel('waiting_vc', true);
            const mainVC = options.getChannel('main_vc', true);
            const updateChannel = options.getChannel('update_channel', true);

            await keyv.set(guild.id + 'waiting_vc', waitingVC.id);
            await keyv.set(guild.id + 'main_vc', mainVC.id);
            await keyv.set(guild.id + 'upd_chnl', updateChannel.id);
            await keyv.set(guild.id + 'queue', '-');
            await keyv.set(guild.id + 'setup', true);

            await interaction.editReply('You\'ve finished setting up the bot! It is now ready for use.');
            return;
        case 'edit':
            const dmUser = options.getBoolean('dm_user', false) ?? false;
            const mentionUser = options.getBoolean('mention_user', false) ?? false;

            await keyv.set(user.id + 'dm_user', dmUser);
            await keyv.set(user.id + 'mention_user', mentionUser);

            await interaction.editReply('Alright! You\'re preferences have been saved.');
            return;
        case 'queue':
            let queue = (await keyv.get(guild.id + 'queue') as string).split('/');
            queue = queue.filter(v => v !== '-');
            queue = queue.filter(v => v !== '');
            let desc = '';

            consola.log(queue.length);
            if (queue.length === 0 || queue[0] === '') desc = 'No one in queue!';
            else queue.forEach((userId, i) => desc += `**${i + 1}.** <@${userId}>\n`);

            const embed = new EmbedBuilder()
                .setTitle('Current Queue')
                .setDescription(desc)
                .setColor(0xBFF9EC)
                .setFooter({
                    text: 'Want to be mentioned when the queue changes? Run /edit'
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
    }
});

const fetchAllData = async (guild: Guild, user: User) => {
    const data = {
        waitingVC: guild.channels.cache.get(await keyv.get(guild.id + 'waiting_vc')) as VoiceBasedChannel,
        mainVC: guild.channels.cache.get(await keyv.get(guild.id + 'main_vc')) as VoiceBasedChannel,
        updateChannel: guild.channels.cache.get(await keyv.get(guild.id + 'upd_chnl')) as TextBasedChannel,
        queue: (await keyv.get(guild.id + 'queue') as string)?.split('/'),

        dmUser: await keyv.get(user.id + 'dm_user') as boolean,
        mentionUser: await keyv.get(user.id + 'mention_user') as boolean
    };

    data.queue = data.queue.filter(v => v !== '-');
    data.queue = data.queue.filter(v => v !== '');

    return data;
}

client.on('voiceStateUpdate', async (oldState, newState) => {
    const old = oldState;
    const { channel, guild, member } = newState;

    if ((await keyv.get(guild.id + 'setup')) ?? false) return; // dont run if its not setup
    if (!member || member.user.bot) return;

    fetchAllData(guild, member.user)
        .then(async data => {
            if (!member) return; // because ts wouldn't shut up

            // handle for when a user joins the queue
            if (channel === data.waitingVC && old.channel !== channel) {
                data.queue.push(member.user.id);
                await keyv.set(guild.id + 'queue', data.queue.join('/'));

                // channel was not full, dont bother
                if (!data.mainVC.full) {
                    data.updateChannel.send(`<@${member.user.id}>, no need to join the queue for <#${data.mainVC.id}>!`);
                    member.voice.setChannel(data.mainVC, 'WL - Insufficient members in Main VC.');
                    return;
                }

                data.updateChannel.send(`**${member.displayName}** has joined the queue for <#${data.mainVC.id}> \`(${data.queue.length})\``);
                if (data.dmUser) member.send(`You've joined the queue for <#${data.mainVC.id}>!\nTo stop receiving DMs, use \`/edit\`.`);

            // handle for when a user leaves the queue
            } else if (old.channel === data.waitingVC && old.channel !== channel) {
                data.queue = data.queue.filter(id => id !== member.user.id);
                await keyv.set(guild.id + 'queue', data.queue.join('/'));

                data.updateChannel.send(`**${member.displayName}** has left the queue for <#${data.mainVC.id}> \`(${data.queue.length})\``);

                // notify users of their new positions
                data.queue.forEach(async (userId, i) => {
                    const user = client.users.cache.get(userId);
                    if (user) {
                        if (await keyv.get(user.id + 'dm_user') ?? false) {
                            user.send(`Your position waiting for <#${data.mainVC.id}> has changed!\nYou're now in position **${i}** of **${data.queue.length}**!`);
                        }
                        if (await keyv.get(user.id + 'mention_user') ?? false) {
                            data.updateChannel.send(`<@${user.id}>, your position waiting for <#${data.mainVC.id}> has changed!\nYou're now in position **${i}** of **${data.queue.length}**!`);
                        }
                    }
                });

            // a spot in the main vc has opened up
            } else if (old.channel === data.mainVC && channel !== old.channel) {
                if (!data.mainVC.full && data.queue.length > 0) {
                    const userId = data.queue.shift() as string;
                    const member = guild.members.cache.get(userId);
                    consola.log(member);
                    if (member) {
                        member.voice.setChannel(data.mainVC, 'WL - Spot opened in Main VC.');
                        if (await keyv.get(userId + 'dm_user') ?? false) {
                            member.send(`You've been moved into <#${data.mainVC.id}>!\nTo stop receiving DMs, please run \`/edit\`.`);
                        }
                        if (await keyv.get(userId + 'mention_user') ?? false) {
                            data.updateChannel.send(`<@${userId}>, you've been moved into <#${data.mainVC.id}>!`);
                        }
                    }
                }
            }
        })
        .catch(async err => {
            (await newState.guild.fetchOwner()).send(err);
            consola.error(err);
        });
});

// login
client.login(process.env.CLIENT_TOKEN)
    .then(() => consola.ready('Waiting List has been logged in!'))
    .catch(consola.error);