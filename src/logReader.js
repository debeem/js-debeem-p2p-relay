import { LogConsoleReader } from "./doctor/LevelDb/LevelLogConsoleReader.js";


// Instantiate the LevelLogConsoleReader class and start reading logs
( async () =>
{
        const logReader = new LogConsoleReader();
        await logReader.startReading();
} )();
