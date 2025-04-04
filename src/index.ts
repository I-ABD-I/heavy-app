import express, {Request, Response} from "express";
import {Worker, WorkerOptions} from "worker_threads";
import {readFileSync} from "node:fs";
import https, {ServerOptions} from "https";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

// Basic route
app.get("/", (req: Request, res: Response) => {
    res.send("How Did You Get Here?!?\n");
});

app.get("/ping", (req: Request, res: Response) => {
    res.send("pong!\n");
});

const runWorker = (
    filename: string | URL,
    workerOptions?: WorkerOptions
): { worker: Worker; workerPromise: Promise<number> } => {
    const worker = new Worker(filename, workerOptions);

    const workerPromise = new Promise<number>((resolve, reject) => {
        worker.on("error", reject);
        worker.on("message", resolve);
    });

    return {worker, workerPromise};
};

app.post(
    "/fib",
    async (req: Request<{}, {}, { number: number }>, res: Response) => {
        const {number} = req.body;
        if (!number) {
            res.status(400).send("Invalid Input, number is required\n");
            return;
        }

        const {worker, workerPromise} = runWorker(
            `const { parentPort, workerData } = require("worker_threads");

            const fib = (index) => {
                if (index == 0) return 0;
                if (index == 1 || index == 2) return 1;

                return fib(index - 1) + fib(index - 2);
            };

            parentPort?.postMessage(fib(workerData));`,
            {
                workerData: number,
                eval: true,
            }
        );

        const terminateWorker = () => {
            if (req.destroyed) {
                worker.terminate();
                console.log("Request closed, worker terminated.");
            }
        };

        req.socket.on("close", terminateWorker);
        try {
            const resp = await workerPromise;
            res.send(resp.toString() + '\n');
        } catch {
            res.sendStatus(500);
        } finally {
            req.socket.off("close", terminateWorker);
        }
    }
);

// Start the server
const serverOpts: ServerOptions = {
    cert: readFileSync("./heavy-cert.pem"),
    key: readFileSync("./heavy-key.pem"),
};
const server = https.createServer(serverOpts, app).listen(PORT, () => {
    console.log(`HTTPS Server is listening on port ${PORT}`);
});

// http.createServer(app).listen(PORT, () => {
//     console.log(`Server is listening on port ${PORT}`);
// });

process.on("SIGTERM", () => {
    server.close()
})

process.on("SIGINT", () => {
    server.close()
})