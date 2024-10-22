import { RedisLogConsoleReader } from "./doctor/logger/impls/RedisLog/RedisLogConsoleReader.js";


// Instantiate the LevelLogConsoleReader class and start reading logs
( async () =>
{
        const logReader = new RedisLogConsoleReader();
        await logReader.startReading();
} )();
