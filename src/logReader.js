import { LogConsoleReader } from "./doctor/LevelDb/LogConsoleReader.js";


// Instantiate the LogConsoleReader class and start reading logs
( async () =>
{
        const logReader = new LogConsoleReader();
        await logReader.startReading();
} )();
