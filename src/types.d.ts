import { Client, Collection, SlashCommandBuilder } from "discord.js";
import Keyv from "keyv";

declare type ExtendedClient = Client & {
    interactions?: Collection<string, InteractionFile>;
    keyv?: Keyv
}

declare type InteractionFile = {
    name: string;
    builder: SlashCommandBuilder;
    run: (client: ExtendedClient, ...arg1: any[]) => any;
}

declare type EventFile = {
    name: string;
    once?: boolean;
    run: (client: ExtendedClient, ...arg1: any[]) => any;
}